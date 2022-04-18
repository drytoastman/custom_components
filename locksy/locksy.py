import asyncio
import attr
import logging
from typing import Callable, Dict, List
from setuptools import Command

from zwave_js_server.model.value import Value
from zwave_js_server.model.node import Node as ZWaveNode
from zwave_js_server.const import CommandClass
from zwave_js_server.const.command_class.lock import (LOCK_USERCODE_STATUS_PROPERTY, CodeSlotStatus)
from zwave_js_server.client import Client as ZWaveClient

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

def intkeys(map):
    return { int(k): v for k,v in map.items() }

def int2keys(map):
    return { int(k): intkeys(v) for k,v in map.items() }

testmode = False
if testmode:
    async def set_usercode(node, slot, code):  _LOGGER.debug("set_usercode({}, {}, {})".format(node.node_id, slot, code))
    async def clear_usercode(node, slot): _LOGGER.debug("clear_usercode({}, {})".format(node.node_id, slot))
else:
    from zwave_js_server.util.lock import set_usercode, clear_usercode

@attr.s
class LocksyData:
    storage = attr.ib(type=Store)
    # name -> value
    codes = attr.ib(type=Dict[str, str], factory=dict)
    # lockid -> [names]
    locations = attr.ib(type=Dict[int, List[str]], factory=dict, converter=intkeys)
    # lockid -> slotid -> name
    slots = attr.ib(type=Dict[int, Dict[int, str]], factory=dict, converter=int2keys)

    async def ensureLockId(self, lockid: int):
        if lockid not in self.locations:
            self.locations.setdefault(lockid, [])
            await self.save()
            
        if lockid not in self.slots:
            self.slots.setdefault(lockid, {})
            await self.save()

    def getAll(self):
        return { "codes": self.codes, "locations": self.locations, "slots": self.slots }

    async def save(self):
        data = self.getAll()
        _LOGGER.debug("saving {}".format(data))
        await self.storage.async_save(data)


def slot_info(value: Value):
    is_slot = value.command_class == CommandClass.USER_CODE and value.property_name == LOCK_USERCODE_STATUS_PROPERTY
    if is_slot:
        code_slot = int(value.property_key)
        in_use = value.value and value.value == CodeSlotStatus.ENABLED
        return (is_slot, code_slot, in_use)
    return (False, -1, False)


class Locksy:
    def __init__(self, hass: HomeAssistant, storage: Store, data: LocksyData):
        self.hass = hass
        self.storage = storage
        self.data = data
        self.unloads: Dict[int, List[Callable]] = {0: []}
        self.nodes = {}

    async def setup(self, client: ZWaveClient):
        # TODO what about await in lamdbas?
        self.unloads[0].append(client.driver.controller.on("node added", lambda event: 
            asyncio.create_task(self.node_added(event["node"]))))
        self.unloads[0].append(client.driver.controller.on("node removed", lambda event: 
            asyncio.create_task(self.node_removed(event["node"]))))
        for node in client.driver.controller.nodes.values():
            await self.node_added(node)

    async def async_unload(self):
        """remove all Locksy objects"""
        for _, unloads in self.unloads.items(): 
            for unl in unloads:
                unl()

    async def value_updated(self, value: Value, save=False):
        is_slot = value.command_class == CommandClass.USER_CODE and value.property_name == LOCK_USERCODE_STATUS_PROPERTY
        if not is_slot: return

        code_slot = int(value.property_key)
        in_use = value.value and value.value == CodeSlotStatus.ENABLED
        current = self.data.slots[value.node.node_id].get(code_slot, None)

        _LOGGER.debug("lock {} code slot {} in_use {} current {}".format(value.node.node_id, code_slot, in_use, current))

        if in_use and not current:
            _LOGGER.debug("marking busy slot {}:{} as external".format(value.node.node_id, code_slot))
            self.data.slots[value.node.node_id][code_slot] = 'external'
            if save: await self.data.save()
        elif not in_use and current:
            _LOGGER.debug("clearing slot {}:{} as its showing as free".format(value.node.node_id, code_slot))
            del self.data.slots[value.node.node_id][code_slot]
            if save: await self.data.save()

    # Listen to node add/remove events from zwavejs
    async def node_added(self, node: ZWaveNode) -> None:
        have_lock = False
        have_usercode = False
        for cc in node.command_classes:
            if cc.id == CommandClass.USER_CODE: have_usercode = True
            if cc.id == CommandClass.DOOR_LOCK: have_lock = True
        if not (have_lock and have_usercode): return

        self.nodes[node.node_id] = node
        await self.data.ensureLockId(node.node_id)
        for value in node.values.values():
            await self.value_updated(value, save=False)
        await self.data.save()
        self.unloads.setdefault(node.node_id, list()).append(node.on("value updated", lambda event: 
            asyncio.create_task(self.value_updated(event['value']))))

    def node_removed(self, node: ZWaveNode) -> None:
        # TODO: Need to remove from our data structures
        for unload in self.unloads[node.node_id]:
            unload()

    async def setCodes(self, codes: Dict[str, str]):
        for name in codes:
            if name == 'external':
                raise HomeAssistantError("Cannot use 'external' for code name")

        removedcodes = self.data.codes.keys() - codes.keys()
        changedcodes = set([c for c in codes if c in self.data.codes and codes[c] != self.data.codes[c]])
        needlockupdate = False
        for _, names in self.data.locations.items():
            nset = set(names)
            if nset & removedcodes:
                raise HomeAssistantError("Removing code that is still assigned to a lock")
            if nset & changedcodes:
                needlockupdate = True
                _LOGGER.debug("code assigned to lock was changed, will update")

        if needlockupdate:
            for lockid, names in self.data.locations.items():
                for name in names:
                    if name in changedcodes:
                        await self.assignToASlot(lockid, name, codes[name])

        self.data.codes = codes
        await self.data.save()


    async def setLocations(self, locations: Dict[str, List[str]]):
        # validate first
        for lockidstr, names in locations.items():
            lockid = int(lockidstr)
            rset = set(names)
            lset = set(self.data.locations[lockid])
            for name in rset | lset:
                if name == 'external':
                    raise HomeAssistantError("Cannot use 'external' for code name")
            for name in rset - lset:
                if name not in self.data.codes:
                    raise HomeAssistantError("{} is not a valid code name".format(name))

        for lockidstr, names in locations.items():
            lockid = int(lockidstr)
            rset = set(names)
            lset = set(self.data.locations[lockid])
            # names added
            for name in rset - lset:
                await self.assignToASlot(lockid, name, self.data.codes[name])
                self.data.locations[lockid].append(name)
            # names removed
            for name in lset - rset:
                slotid = self.name2slot(lockid, name)
                if slotid:
                    await clear_usercode(self.nodes[lockid], slotid)
                    del self.data.slots[lockid][slotid]
                    self.data.locations[lockid].remove(name)
                else:
                    _LOGGER.error("{} is not assigned to a slot in {}, nothing to remove".format(name, lockid))

        await self.data.save()


    async def assignToASlot(self, lockid: int, name: str, value: str):
        _LOGGER.debug("assignToASlot {} {} {}".format(lockid, name, value))
        slotid = self.name2slot(lockid, name)
        if slotid:
            _LOGGER.debug("Name already present on lock {}, updating slotid {}".format(lockid, slotid))
            await set_usercode(self.nodes[lockid], slotid, value)

        else:
            free = list(set(range(1,21)) - self.data.slots[lockid].keys())[0]
            _LOGGER.debug("Name not present on lock {}, picking free slotid {}".format(lockid, free))
            await set_usercode(self.nodes[lockid], free, value)
            self.data.slots[lockid][free] = name
            await self.data.save()



    def name2slot(self, lockid: int, name: str):
        for slotid, slotname in self.data.slots[lockid].items():
            if name == slotname:
                return slotid
        return None

import asyncio
import collections
from xmlrpc.client import Boolean
import attr
import logging
from typing import Callable, Dict, List
from homeassistant.const import MATCH_ALL
from homeassistant.helpers.dispatcher import async_dispatcher_send

from zwave_js_server.model.value import Value
from zwave_js_server.model.node import Node as ZWaveNode
from zwave_js_server.const import CommandClass
from zwave_js_server.const.command_class.lock import (LOCK_USERCODE_STATUS_PROPERTY, CodeSlotStatus)
from zwave_js_server.client import Client as ZWaveClient

from homeassistant.core import Event, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_registry import EVENT_ENTITY_REGISTRY_UPDATED
from homeassistant.helpers.storage import Store
from homeassistant.helpers import entity_registry

from . import const

_LOGGER = logging.getLogger(__name__)

def tryint(val):
    try:
        return int(val)
    except:
        return val

def intkeys(val):
    if isinstance(val, collections.Mapping):
        return { tryint(k): intkeys(v) for k,v in val.items() }
    else:
        return val

testmode = False
if testmode:
    async def set_usercode(node, slot, code):  _LOGGER.debug("set_usercode({}, {}, {})".format(node.node_id, slot, code))
    async def clear_usercode(node, slot): _LOGGER.debug("clear_usercode({}, {})".format(node.node_id, slot))
else:
    from zwave_js_server.util.lock import set_usercode, clear_usercode

@attr.s
class LocksyData:
    # name -> value
    codes = attr.ib(type=Dict[str, str], factory=dict)
    # lockid -> slotid -> name
    slots = attr.ib(type=Dict[int, Dict[int, str]], factory=dict, converter=intkeys)

    async def ensureLockId(self, lockid: int):
        if lockid not in self.slots:
            self.slots.setdefault(lockid, {})

    def namesOnLock(self, lockid: int):
        return self.slots.get(lockid, {}).values()

    def nameToSlot(self, lockid: int, name: str):
        for slotid, slotname in self.slots[lockid].items():
            if name == slotname:
                return slotid
        return None

    def getAll(self):
        return { "codes": self.codes, "slots": self.slots }



def slot_info(value: Value):
    is_slot = value.command_class == CommandClass.USER_CODE and value.property_name == LOCK_USERCODE_STATUS_PROPERTY
    if is_slot:
        code_slot = int(value.property_key)
        in_use = value.value and value.value == CodeSlotStatus.ENABLED
        return (is_slot, code_slot, in_use)
    return (False, -1, False)


class Locksy:
    def __init__(self, hass: HomeAssistant):
        self.hass = hass
        self.data: LocksyData = None
        self.storage: Store = None
        self.unloads: Dict[int, List[Callable]] = {0: []}
        self.nodes = {}
        self.idmap = {}

        self.hass.bus.async_listen(EVENT_ENTITY_REGISTRY_UPDATED, lambda event: self.registryUpdated(event))
        self.buildEntityMap()

    def registryUpdated(self, event: Event):
        if event.data["entity_id"].startswith('lock.'):
            self.buildEntityMap()

    def buildEntityMap(self):
        self.idmap = {}
        reg: entity_registry.EntityRegistry = entity_registry.async_get(self.hass)
        for eid, ent in reg.entities.items():
            if ent.domain == 'lock' and ent.platform == 'zwave_js':
                (_, valueid) = ent.unique_id.split('.')
                (nodeid, _) = valueid.split('-', 1)
                self.idmap[nodeid] = {
                    'entity': eid,
                    'name': ent.name or ent.original_name or eid
                }
        _LOGGER.debug("idmap = {}".format(self.idmap))


    async def setup(self, client: ZWaveClient):
        self.storage = Store(self.hass, const.STORAGE_VERSION, const.STORAGE_KEY)
        loaded = await self.storage.async_load()
        self.data = LocksyData(**loaded or {})

        self.unloads[0].append(client.driver.controller.on("node added",   lambda event: asyncio.create_task(self.node_added(event["node"]))))
        self.unloads[0].append(client.driver.controller.on("node removed", lambda event: asyncio.create_task(self.node_removed(event["node"]))))
        for node in client.driver.controller.nodes.values():
            await self.node_added(node)


    async def async_unload(self):
        """remove all Locksy objects"""
        for _, unloads in self.unloads.items(): 
            for unl in unloads:
                unl()

    async def dataChanged(self):
        data = self.data.getAll()
        _LOGGER.debug("saving {}".format(data))
        await self.storage.async_save(data)
        async_dispatcher_send(self.hass, "locksy_updated")


    async def value_updated(self, value: Value, save):
        is_slot = value.command_class == CommandClass.USER_CODE and value.property_name == LOCK_USERCODE_STATUS_PROPERTY
        if not is_slot: return

        code_slot = int(value.property_key)
        in_use = value.value and value.value == CodeSlotStatus.ENABLED
        current = self.data.slots[value.node.node_id].get(code_slot, None)

        _LOGGER.debug("lock {} code slot {} in_use {} current {}".format(value.node.node_id, code_slot, in_use, current))

        if in_use and not current:
            _LOGGER.debug("marking busy slot {}:{} as external".format(value.node.node_id, code_slot))
            self.data.slots[value.node.node_id][code_slot] = 'external'
            if save: await self.dataChanged()
        elif not in_use and current:
            _LOGGER.debug("clearing slot {}:{} as its showing as free".format(value.node.node_id, code_slot))
            del self.data.slots[value.node.node_id][code_slot]
            if save: await self.dataChanged()


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
        await self.dataChanged()
        self.unloads.setdefault(node.node_id, list()).append(node.on("value updated", lambda event: asyncio.create_task(self.value_updated(event['value'], True))))


    def node_removed(self, node: ZWaveNode) -> None:
        # TODO: Need to remove from our data structures
        for unload in self.unloads[node.node_id]:
            unload()


    async def setCodes(self, codes: Dict[str, str]):
        for name in codes:
            if name == 'external':
                raise HomeAssistantError("Cannot use 'external' for code name")

        removedcodes = self.data.codes.keys() - codes.keys()
        for lockid in self.data.slots:
            if set(self.data.namesOnLock(lockid)) & removedcodes:
                raise HomeAssistantError("Removing code that is still assigned to a lock")

        changedcodes = set([c for c in codes if c in self.data.codes and codes[c] != self.data.codes[c]])
        for lockid in self.data.slots:
            if set(self.data.namesOnLock(lockid)) & changedcodes:
                _LOGGER.debug("code assigned to lock was changed, updating")
                await self.assignToASlot(lockid, name, codes[name])

        self.data.codes = codes
        await self.dataChanged()


    async def addNameToLock(self, name: str, lockid: int):
        if name == 'external':
            raise HomeAssistantError("Cannot use 'external' for code name")        
        if name not in self.data.codes:
            raise HomeAssistantError("{} is not a valid code name".format(name))
        await self.assignToASlot(lockid, name, self.data.codes[name])


    async def removeNameFromLock(self, name: str, lockid: int):
        if name == 'external':
            raise HomeAssistantError("Cannot use 'external' for code name")        
        slotid = self.data.nameToSlot(lockid, name)
        if slotid:
            await clear_usercode(self.nodes[lockid], slotid)
        else:
            _LOGGER.error("{} is not assigned to a slot in {}, nothing to remove".format(name, lockid))


    async def assignToASlot(self, lockid: int, name: str, value: str):
        _LOGGER.debug("assignToASlot {} {} {}".format(lockid, name, value))
        slotid = self.data.nameToSlot(lockid, name)
        if slotid:
            _LOGGER.debug("Name already present on lock {}, updating slotid {}".format(lockid, slotid))
            await set_usercode(self.nodes[lockid], slotid, value)
        else:
            free = list(set(range(1,21)) - self.data.slots[lockid].keys())[0]
            _LOGGER.debug("Name not present on lock {}, picking free slotid {}".format(lockid, free))
            await set_usercode(self.nodes[lockid], free, value)
            self.data.slots[lockid][free] = name
            await self.dataChanged()


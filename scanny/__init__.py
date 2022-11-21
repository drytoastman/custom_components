"""The Scanny Integration."""
import logging
import os
from typing import Any, Dict
import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.websocket_api.connection import ActiveConnection

from homeassistant.core import (Event, callback, HomeAssistant)
from homeassistant.helpers import device_registry

from homeassistant.components.tag import EVENT_TAG_SCANNED
from homeassistant.components.esphome import DOMAIN as ESPHOME_DOMAIN

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.service import async_register_admin_service
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from . import const

_LOGGER = logging.getLogger(__name__)


class Scanny:
    def __init__(self, hass: HomeAssistant, store: Store, conf, allowed: Dict[str, str]) -> None:
        self.hass = hass
        self.assigned = {}
        self.addMode = False
        self.storage = store
        self.allowed = allowed

        for devname, service in conf.items():
            _LOGGER.debug("scanny: {} : {}".format(devname, service))
            self.assigned[devname] = service

        hass.bus.async_listen(EVENT_TAG_SCANNED, self.tagScanned)

    async def dataChanged(self):
        await self.storage.async_save(self.allowed)
        async_dispatcher_send(self.hass, "scanny_updated")

    @callback
    async def setAddMode(self, on: bool):
        self.addMode = on
        await self.dataChanged()

    @callback
    async def deleteTag(self, uid: str):
        del self.allowed[uid]
        await self.dataChanged()

    @callback
    async def changeName(self, uid: str, name: str):
        self.allowed[uid] = name
        await self.dataChanged()

    @callback
    async def tagScanned(self, event: Event):
        _LOGGER.debug("scanned {}".format(event.data['tag_id']))
        devid = event.data['device_id']
        tagid = event.data['tag_id']

        dr = device_registry.async_get(self.hass)
        dev = dr.async_get(devid)
        _LOGGER.debug(dev)

        if self.addMode:
            self.allowed[tagid] = tagid
            await self.dataChanged()
            return

        if dev.name not in self.assigned: return # ignore non assigned scanners

        if tagid not in self.allowed:
            await self.hass.services.async_call(ESPHOME_DOMAIN, "{}_rfidreader_tag_ko".format(dev.name), {})
        elif dev.name not in self.assigned:
            await self.hass.services.async_call(ESPHOME_DOMAIN, "{}_rfidreader_tag_ko".format(dev.name), {})
        else:
            # send ok
            service = self.assigned[dev.name]
            _LOGGER.debug("service is {}".format(service))
            await self.hass.services.async_call(**service)
            await self.hass.services.async_call(ESPHOME_DOMAIN, "{}_rfidreader_tag_ok".format(dev.name), {})




@websocket_api.decorators.async_response
async def websocket_updates(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]):
    @callback
    def updated():
        scanny: Scanny = hass.data[const.DOMAIN]
        connection.send_message({ "id": msg["id"], "type": "event", "event": { "addMode": scanny.addMode, "allowed": scanny.allowed } })

    scanny: Scanny = hass.data[const.DOMAIN]
    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, "scanny_updated", updated)
    connection.send_result(msg["id"])
    connection.send_message({ "id": msg["id"], "type": "event", "event": { "addMode": scanny.addMode, "allowed": scanny.allowed } })


@callback
async def register_frontend(hass: HomeAssistant):
    websocket_api.async_register_command(hass, "scanny/updates", websocket_updates,
        websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend({vol.Required("type"): "scanny/updates"}))

    hass.http.register_static_path(
        '/api/scanny/static',
        os.path.join(hass.config.path('custom_components'), 'scanny/frontend/dist/'),
        cache_headers=False
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=const.PANEL_NAME,
        frontend_url_path='scanny',
        module_url='/api/scanny/static/scanny-panel.js',
        sidebar_title='Scanny',
        sidebar_icon=const.PANEL_ICON,
        require_admin=True,
        config={},
    )


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    if const.DOMAIN not in config:
        return True

    async def set_add_mode(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.setAddMode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "set_add_mode", set_add_mode, schema=vol.Schema({'on': bool}))

    async def delete_tag(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.deleteTag(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "delete_tag", delete_tag, schema=vol.Schema({'uid': str}))

    async def change_name(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.changeName(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "change_name", change_name, schema=vol.Schema({'uid': str, 'name': str}))

    storage: Store = Store(hass, const.STORAGE_VERSION, const.STORAGE_KEY)
    hass.data[const.DOMAIN] = Scanny(hass, storage, config[const.DOMAIN], await storage.async_load() or {})

    await register_frontend(hass)

    return True

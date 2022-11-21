"""The Scanny Integration."""
import logging
import os
from homeassistant.components import panel_custom

from homeassistant.core import (Event, callback, HomeAssistant)
from homeassistant.helpers import device_registry

from homeassistant.components.tag import EVENT_TAG_SCANNED
from homeassistant.components.esphome import DOMAIN as ESPHOME_DOMAIN

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from . import const


_LOGGER = logging.getLogger(__name__)

"""
@callback
def register_services(hass: HomeAssistant):
    ""Register services used by Scanny component.""
    async def add_code(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.addCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "add_code", add_code, schema=vol.Schema({'name': str, 'code': str}))

    async def change_code(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.changeCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "change_code", change_code, schema=vol.Schema({'name': str, 'code': str}))

    async def delete_code(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.deleteCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "delete_code", delete_code, schema=vol.Schema({'name': str}))

    async def add_name_to_lock(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.addNameToLock(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "add_name_to_lock", add_name_to_lock, schema=vol.Schema({'name': str, 'lockid': str}))

    async def remove_name_from_lock(call):
        scanny:Scanny = hass.data[const.DOMAIN]
        await scanny.removeNameFromLock(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "remove_name_from_lock", remove_name_from_lock, schema=vol.Schema({'name': str, 'lockid': str}))

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    ""Unload Scanny config entry.""
    scanny: Scanny = hass.data.get(const.DOMAIN, None)
    if scanny:
        await scanny.async_unload()
        del hass.data[const.DOMAIN]
    return True
"""

class ScannyEntity(Entity):
    def __init__(self, hass: HomeAssistant, id: str, store: Store, conf, allowed: set[str]) -> None:
        self.hass = hass
        self.entity_id = "{}.{}".format(const.DOMAIN, id)
        self.assigned = {}
        self.addMode = False
        self.storage = store
        self.allowed = set(allowed)

        for devname, service in conf.items():
            _LOGGER.debug("scanny: {} : {}".format(devname, service))
            self.assigned[devname] = service

        hass.bus.async_listen(EVENT_TAG_SCANNED, self.tagScanned)

    @property
    def should_poll(self): return False
    #@property
    #def force_update(self) -> bool: return True
    @property
    def icon(self): return "mdi:tag"
    @property
    def state(self): return len(self.allowed)

    @property
    def extra_state_attributes(self):
        return {
            'allowed': self.allowed,
            'assigned': self.assigned,
            'addMode': self.addMode
        }

    @callback
    async def tagScanned(self, event: Event):
        _LOGGER.debug("scanned {}".format(event.data['tag_id']))
        devid = event.data['device_id']
        tagid = event.data['tag_id']

        dr = device_registry.async_get(self.hass)
        dev = dr.async_get(devid)
        _LOGGER.debug(dev)

        if dev.name not in self.assigned: return # ignore other scanners
        if self.addMode:
            self.allowed.add(tagid)
            await self.storage.async_save(self.allowed)

        else:
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


@callback
async def register_frontend(hass: HomeAssistant):
    #websocket_api.async_register_command(hass, "scanny/updates", websocket_updates,
        #websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend({vol.Required("type"): "scanny/updates"}))

    hass.http.register_static_path(
        const.PANEL_URL,
        os.path.join(hass.config.path('custom_components'), 'scanny/frontend/dist/'),
        cache_headers=False
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=const.PANEL_NAME,
        frontend_url_path=const.PANEL_URL,
        module_url=const.PANEL_URL+'/scanny-panel.js',
        sidebar_title='Scanny',
        sidebar_icon=const.PANEL_ICON,
        require_admin=True,
        config={},
    )

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    if const.DOMAIN not in config:
        return True

    component = hass.data[const.DOMAIN] = EntityComponent(_LOGGER, const.DOMAIN, hass)
    await component.async_setup(config)

    #component.async_register_entity_service("canceltimer", {}, "canceltimer")


    storage: Store = Store(hass, const.STORAGE_VERSION, const.STORAGE_KEY)
    scanny = ScannyEntity(hass, 'single', storage, config[const.DOMAIN], await storage.async_load() or set([]))
    await component.async_add_entities([scanny])

    await register_frontend(hass)

    return True

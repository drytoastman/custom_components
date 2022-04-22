"""The Locksy Integration."""
import asyncio
import logging
import voluptuous as vol
from homeassistant.exceptions import HomeAssistantError

from zwave_js_server.client import Client as ZWaveClient
from homeassistant.components.zwave_js.const import DATA_CLIENT, DOMAIN as ZWAVEJS_DOMAIN

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import (callback, HomeAssistant)
from homeassistant.helpers import device_registry
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.service import async_register_admin_service

from . import const
from .locksy import Locksy
from .frontend import register_frontend


_LOGGER = logging.getLogger(__name__)

@callback
def register_services(hass: HomeAssistant):
    """Register services used by Locksy component."""
    async def add_code(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.addCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "add_code", add_code, schema=vol.Schema({'name': str, 'code': str}))

    async def change_code(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.changeCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "change_code", change_code, schema=vol.Schema({'name': str, 'code': str}))

    async def delete_code(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.deleteCode(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "delete_code", delete_code, schema=vol.Schema({'name': str}))

    async def add_name_to_lock(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.addNameToLock(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "add_name_to_lock", add_name_to_lock, schema=vol.Schema({'name': str, 'lockid': str}))

    async def remove_name_from_lock(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.removeNameFromLock(**call.data)
    async_register_admin_service(hass, const.DOMAIN, "remove_name_from_lock", remove_name_from_lock, schema=vol.Schema({'name': str, 'lockid': str}))


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Unload Locksy config entry."""
    locksy: Locksy = hass.data.get(const.DOMAIN, None)
    if locksy:
        await locksy.async_unload()    
        del hass.data[const.DOMAIN]
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Set up Locksy integration from a config entry."""

    if ZWAVEJS_DOMAIN not in hass.data or not len(hass.data[ZWAVEJS_DOMAIN].values()):
        raise HomeAssistantError("No valid zwave_js setup, cannot install locksy")

    client = list(hass.data[ZWAVEJS_DOMAIN].values())[0][DATA_CLIENT]
    while not client.driver:
        await asyncio.sleep(1)
        
    locksy = Locksy(hass)
    await locksy.setup(client)
    if const.DOMAIN in hass.data:
        _LOGGER.error("Locksy is already installed?  Overwritting old")
    hass.data[const.DOMAIN] = locksy

    dr = await device_registry.async_get_registry(hass)
    dr.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(const.DOMAIN, 'singleton')},
        name=const.NAME,
        model=const.NAME,
        sw_version=const.VERSION,
        manufacturer=const.MANUFACTURER,
    )

    # Register panel and services
    register_services(hass)
    await register_frontend(hass)

    return True
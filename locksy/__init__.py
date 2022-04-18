"""The Locksy Integration."""
import asyncio
import logging
import voluptuous as vol

from zwave_js_server.client import Client as ZWaveClient

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import (callback, HomeAssistant)
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.service import async_register_admin_service
from homeassistant.helpers.storage import Store

from . import const
from .locksy import Locksy, LocksyData
from .frontend import register_frontend


_LOGGER = logging.getLogger(__name__)

@callback
def register_services(hass: HomeAssistant):
    """Register services used by Locksy component."""
    async def set_codes(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.setCodes(call.data)
    async_register_admin_service(hass, const.DOMAIN, "set_codes", set_codes, schema=vol.Schema({cv.string: cv.string}))

    async def add_name_to_lock(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.addNameToLock(call.data['name'], call.data['lockid'])
    async_register_admin_service(hass, const.DOMAIN, "add_name_to_lock", add_name_to_lock, schema=vol.Schema({'name': str, 'lockid': int}))

    async def remove_name_from_lock(call):
        locksy:Locksy = hass.data[const.DOMAIN]
        await locksy.removeNameFromLock(call.data['name'], call.data['lockid'])
    async_register_admin_service(hass, const.DOMAIN, "remove_name_from_lock", remove_name_from_lock, schema=vol.Schema({'name': str, 'lockid': int}))


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Unload Locksy config entry."""
    del hass.data[const.DOMAIN]
    #async_unregister_panel(hass)
    return True

async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Remove Locksy config entry."""
    #async_unregister_panel(hass)
    locksy: Locksy = hass.data.get(const.DOMAIN, None)
    if locksy:
        await locksy.storage.async_remove()
        del hass.data[const.DOMAIN]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Set up Locksy integration from a config entry."""
    #session = async_get_clientsession(hass)
    client = ZWaveClient(entry.data['url'], async_get_clientsession(hass))
    driver_ready = asyncio.Event()
    await client.connect()
    listen_task = asyncio.create_task(client.listen(driver_ready))
    await driver_ready.wait()

    storage = Store(hass, const.STORAGE_VERSION, const.STORAGE_KEY)
    loaded = await storage.async_load()
    data = LocksyData(storage=storage, **loaded or {})
    locksy = Locksy(hass, storage, data)
    await locksy.setup(client)
    if const.DOMAIN in hass.data:
        _LOGGER.error("Locksy is already installed?  Overwritting old")
    hass.data[const.DOMAIN] = locksy

    device_registry = await dr.async_get_registry(hass)
    device_registry.async_get_or_create(
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
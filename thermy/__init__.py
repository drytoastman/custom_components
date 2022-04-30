"""The Thermy Integration."""
import logging
import os
import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.typing import ConfigType

from . import const
from .entity import ThermyEntity

log = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    component = hass.data[const.DOMAIN] = EntityComponent(log, const.DOMAIN, hass)
    await component.async_setup(config)

    component.async_register_entity_service("offtimer",  {vol.Required('timeout'): int}, "offtimer")
    component.async_register_entity_service("canceltimer", {}, "canceltimer")

    await component.async_add_entities([
        ThermyEntity(hass, id, conf) for id,conf in config[const.DOMAIN].items()
    ])

    hass.http.register_static_path(
        "/thermy",
        os.path.join(hass.config.path('custom_components'), 'thermy/frontend/dist/'),
        cache_headers=False
    )

    return True

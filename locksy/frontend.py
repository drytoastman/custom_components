
import os
import logging
import voluptuous as vol
from typing import Any
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.websocket_api.connection import ActiveConnection
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from . import const
from .locksy import Locksy

log = logging.getLogger(__name__)

@websocket_api.decorators.async_response
async def websocket_updates(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]):
    @callback
    def updated():
        locksy:Locksy = hass.data[const.DOMAIN]
        connection.send_message({ "id": msg["id"], "type": "event", "event": locksy.data.getAll() })

    locksy:Locksy = hass.data[const.DOMAIN]
    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, "locksy_updated", updated)
    connection.send_result(msg["id"])
    connection.send_message({ "id": msg["id"], "type": "event", "event": locksy.data.getAll() })


@callback
def websocket_getData(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]):
    locksy:Locksy = hass.data[const.DOMAIN]
    connection.send_result(msg["id"], locksy.data.getAll())

PANEL_URL = "/api/panel_custom/locks-panel"

@callback
async def register_frontend(hass: HomeAssistant):
    websocket_api.async_register_command(hass, "locksy/updates", websocket_updates,  
        websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend({vol.Required("type"): "locksy/updates"}))
    websocket_api.async_register_command(hass, "locksy/data", websocket_getData,  
        websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend({vol.Required("type"): "locksy/data"}))

    view_url = os.path.join(hass.config.path('custom_components'), 'locksy/frontend/dist/locks-panel.js')

    hass.http.register_static_path(
        PANEL_URL,
        view_url,
        cache_headers=False
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name='locks-panel',
        frontend_url_path='locksy',
        module_url=PANEL_URL,
        sidebar_title='Locksy',
        sidebar_icon='mdi:shield-home',
        require_admin=True,
        config={},
    )
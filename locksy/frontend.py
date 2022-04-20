
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

def send_data(locksy: Locksy, connection: ActiveConnection, id):
    data = locksy.data.getAll()
    data['entitymap'] = locksy.idmap
    connection.send_message({ "id": id, "type": "event", "event": data })

@websocket_api.decorators.async_response
async def websocket_updates(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]):
    @callback
    def updated():
        send_data(hass.data[const.DOMAIN], connection, msg["id"])

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, "locksy_updated", updated)
    connection.send_result(msg["id"])
    send_data(hass.data[const.DOMAIN], connection, msg["id"])


PANEL_URL = "/api/panel_custom/locks-panel"

@callback
async def register_frontend(hass: HomeAssistant):
    websocket_api.async_register_command(hass, "locksy/updates", websocket_updates,  
        websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend({vol.Required("type"): "locksy/updates"}))

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

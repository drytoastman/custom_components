"""Config flow for the Locksy component."""
import secrets
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from .const import DOMAIN
class LocksyConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config flow for Locksy."""

    VERSION = "1.0.0"
    CONNECTION_CLASS = config_entries.CONN_CLASS_LOCAL_PUSH
    
    async def async_step_user(self, user_input = None) -> FlowResult:
        """Handle a flow initialized by the user."""

        # Only a single instance of the integration
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        await self.async_set_unique_id(secrets.token_hex(12))

        # Abort any other flows that may be in progress
        for progress in self._async_in_progress():
            self.hass.config_entries.flow.async_abort(progress["flow_id"])

        return self.async_create_entry(title="Locksy", data={})






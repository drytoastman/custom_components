"""Store constants."""
import datetime
import voluptuous as vol

from homeassistant.helpers import config_validation as cv

from homeassistant.const import (ATTR_ENTITY_ID)

VERSION = "0.0.1"
NAME = "Locksy"
MANUFACTURER = "@drytoastman"

DOMAIN = "locksy"
CONF_URL = "url"

CUSTOM_COMPONENTS = "custom_components"
INTEGRATION_FOLDER = DOMAIN
PANEL_FOLDER = "frontend"
PANEL_FILENAME = "dist/locksy-panel.js"

PANEL_URL = "/api/panel_custom/locksy"
PANEL_TITLE = NAME
PANEL_ICON = "mdi:shield-home"
PANEL_NAME = "locks-panel"

INITIALIZATION_TIME = datetime.timedelta(seconds=60)
SENSOR_ARM_TIME = datetime.timedelta(seconds=5)

#DATA_REGISTRY = f"{DOMAIN}_storage"
STORAGE_KEY = f"{DOMAIN}.storage"
STORAGE_VERSION = 1

SERVICE_SET_CODES = "set_codes"
SERVICE_SET_CODES_SCHEMA = vol.Schema({cv.string: cv.string})

SERVICE_SET_LOCATIONS = "set_locations"
SERVICE_SET_LOCATIONS_SCHEMA = vol.Schema({cv.string: vol.All(cv.ensure_list, [cv.string])})

"""Store constants."""
import datetime

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

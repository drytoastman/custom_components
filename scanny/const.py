"""Store constants."""
import datetime

VERSION = "0.0.1"
NAME = "Scanny"
MANUFACTURER = "@drytoastman"

DOMAIN = "scanny"
CONF_URL = "url"

CUSTOM_COMPONENTS = "custom_components"
INTEGRATION_FOLDER = DOMAIN
PANEL_FOLDER = "frontend"
PANEL_FILENAME = "dist/scanny-panel.js"

PANEL_TITLE = NAME
PANEL_ICON = "mdi:tag"
PANEL_NAME = "scanny-panel"

INITIALIZATION_TIME = datetime.timedelta(seconds=60)
SENSOR_ARM_TIME = datetime.timedelta(seconds=5)

#DATA_REGISTRY = f"{DOMAIN}_storage"
STORAGE_KEY = f"{DOMAIN}.storage"
STORAGE_VERSION = 1

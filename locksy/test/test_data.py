import logging
import pytest
import types

from homeassistant.exceptions import HomeAssistantError
from zwave_js_server.const import CommandClass

from ..locksy import Locksy, LocksyData, testmode

log = logging.getLogger(__name__)

class MockStore:
    async def async_save(self, data):
        pass

class MockNode:
    def __init__(self, id):
        self.node_id = id
        self.command_classes = [
            types.SimpleNamespace(id = CommandClass.USER_CODE),
            types.SimpleNamespace(id = CommandClass.DOOR_LOCK)
        ]
        self.values = {}
    def on(self, x, y):
        pass


@pytest.mark.asyncio
async def test_basic():
    global testmode
    testmode = True

    data = LocksyData(MockStore())
    locksy = Locksy(None, None, data)

    await locksy.node_added(MockNode(6))
    await locksy.node_added(MockNode(12))
    data.slots[6][1] = 'external'

    await locksy.setCodes({
        "main": "1234"
    })
    await locksy.setLocations({"6": ["main"], "12": ["main"]})

    await locksy.setCodes({
        "main": "1234",
        "other": "5678"
    })

    with pytest.raises(HomeAssistantError) as exc_info:
        await locksy.setCodes({"other": "5678"})
    assert exc_info.value.args[0] == "Removing code that is still assigned to a lock"

    with pytest.raises(HomeAssistantError) as exc_info:
        await locksy.setCodes({"external": "1234"})
    assert exc_info.value.args[0] == "Cannot use 'external' for code name"

    await locksy.setLocations({"6": [], "12": []})

    with pytest.raises(HomeAssistantError) as exc_info:
        await locksy.setLocations({"6": ['missing'], "12": []})
    log.debug(exc_info.value)
    assert exc_info.value.args[0] == "missing is not a valid code name"
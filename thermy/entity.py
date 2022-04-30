import datetime
import logging
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util.temperature import convert

from homeassistant.components.climate import DOMAIN as CLIMATE_DOMAIN
from homeassistant.components.mqtt import SERVICE_PUBLISH, DOMAIN as MQTT_DOMAIN
from homeassistant.components.mqtt.const import ATTR_PAYLOAD, ATTR_TOPIC
from homeassistant.components.mqtt.climate import CONF_TEMP_COMMAND_TOPIC, MqttClimate

from . import const

log = logging.getLogger(__name__)


class ThermyEntity(Entity):

    def __init__(self, hass: HomeAssistant, id: str, conf) -> None:
        self.entity_id = "{}.{}".format(const.DOMAIN, id)
        self.hvacid    = conf['hvacid']
        self.tempid    = conf['sensorid'] + "_temperature"
        self.humidid   = conf['sensorid'] + "_humidity"

        self.stoptime  = None
        self.thermystate = const.STATUS_INACTIVE
        self.unsub = None

        hass.bus.async_listen(EVENT_STATE_CHANGED, self.sensorUpdate)


    @property
    def should_poll(self): return False
    @property
    def force_update(self) -> bool: return True
    @property
    def icon(self): return "mdi:timer"
    @property
    def state(self): return self.thermystate

    @property
    def extra_state_attributes(self):
        return {
            'hvacid': self.hvacid,
            'tempid': self.tempid,
            'humidid': self.humidid,
            'stoptime': self.stoptime
        }

    def clearunsub(self):
        if self.unsub:
            self.unsub()
            self.unsub = None

    @callback
    def offtimer(self, timeout: int):
        log.error("offtimer called {}".format(timeout))
        @callback
        async def complete(time):
            if self.thermystate == const.STATUS_ACTIVE:
                try:
                    await self.hass.services.async_call('climate', 'turn_off', { 'entity_id': self.hvacid })
                except Exception as e:
                    log.exception('error calling climate turn_off', exc_info=e)
            self.canceltimer()

        self.clearunsub()
        self.stoptime = datetime.datetime.utcnow() + datetime.timedelta(seconds=timeout)
        self.unsub = async_track_point_in_utc_time(self.hass, complete, self.stoptime)
        self.thermystate = const.STATUS_ACTIVE
        self.async_write_ha_state()


    @callback
    def canceltimer(self):
        self.clearunsub()
        self.stoptime = None
        self.thermystate = const.STATUS_INACTIVE
        self.async_write_ha_state()


    @callback
    async def sensorUpdate(self, event: Event):
        state = event.data.get("new_state")
        if state is None or state.entity_id != self.tempid or state.state == 'unknown': return

        # get hvac info
        hvacentity:MqttClimate = self.hass.data[CLIMATE_DOMAIN].get_entity(self.hvacid)
        if not hvacentity:
            log.error("No entity found for {}".format(self.hvacid))
            return

        if '/temp/' not in hvacentity._config[CONF_TEMP_COMMAND_TOPIC]:
            log.error('{} mqtt commands don\'t appear to have the expected temp command')
            return

        # generate our remote temperature topic (not in the normal climate schema but close)
        topic:str = hvacentity._config[CONF_TEMP_COMMAND_TOPIC].replace('/temp/', '/remote_temp/')

        # sensor conversion
        sendtemp:float = convert(float(state.state), state.attributes[ATTR_UNIT_OF_MEASUREMENT], hvacentity.temperature_unit)

        # send remote temp update to air handler
        log.error("send publish call here")
        #self.hass.services.async_call(MQTT_DOMAIN, SERVICE_PUBLISH, { ATTR_TOPIC: topic, ATTR_PAYLOAD: sendtemp })
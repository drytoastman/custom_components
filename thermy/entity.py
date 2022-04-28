import datetime
import logging
from homeassistant.components.mqtt.climate import MqttClimate
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util.temperature import convert

from . import const

log = logging.getLogger(__name__)


class ThermyEntity(Entity):

    def __init__(self, hass: HomeAssistant, id: str, conf) -> None:
        self.entity_id = "{}.{}".format(const.DOMAIN, id)
        self.climateid = conf['climateid']
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
            'climateid': self.climateid,
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
        @callback
        async def complete(time):
            if self.thermystate == const.STATUS_ACTIVE:
                try:
                    await self.hass.services.async_call('climate', 'turn_off', { 'entity_id': self.climateid })
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
        if state is None or state.entity_id != self.tempid: return

        # get hvac info
        climateentity:MqttClimate = self.hass.data['climate'].get_entity(self.climateid)
        topic:str = climateentity._config['temperature_command_topic'].replace('/temp/', '/remote_temp/')

        # sensor conversion
        sendtemp:float = convert(float(state.state), state.attributes['unit_of_measurement'], climateentity.temperature_unit)

        log.error("call hass.services.async_call('mqtt', 'publish', {})".format({ 'topic': topic, 'payload': sendtemp }))
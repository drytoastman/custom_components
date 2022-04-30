/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, LitElement, PropertyValues, TemplateResult, css, html } from 'lit';
import type { ClimateState, SensorState, ThermyCardConfig, ThermyState } from './types';
import {
  HomeAssistant,
  fireEvent,
} from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators';
import { mdiAirConditioner, mdiCameraTimer, mdiCircleOffOutline, mdiFan, mdiFire, mdiMinusCircle, mdiPlusCircle, mdiSnowflake, mdiWeatherRainy } from '@mdi/js'

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'thermy-card',
  name: 'Thermy Card',
  description: 'thermy',
});

@customElement('thermy-card')
export class ThermyCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private config!: ThermyCardConfig;
    @state() private timerLeft!: number | null;
    @state() private interval!: NodeJS.Timer;

    public setConfig(config: ThermyCardConfig): void {
        if (!config) { throw new Error("Invalid Configuration"); }
        this.config = { name: 'Thermy', ...config };

        if (this.interval) clearInterval(this.interval)
        this.interval = setInterval(this.periodic.bind(this), 500)
    }


    protected shouldUpdate(changedProps: PropertyValues): boolean {
        if (changedProps.has("config") || changedProps.has('timerLeft')) { return true; }

        const oldHass = changedProps.get("hass") as HomeAssistant;
        if (!oldHass) return false;
        if (oldHass.connected !== this.hass.connected ||
            oldHass.themes !== this.hass.themes ||
            oldHass.locale !== this.hass.locale ||
            oldHass.localize !== this.hass.localize ||
            oldHass.config.state !== this.hass.config.state) {
            return true;
        }

        if (this.config.entity != null) {
            const attr = (this.hass.states[this.config.entity] as unknown as ThermyState).attributes
            return [this.config.entity, attr.hvacid, attr.tempid, attr.humidid].some((entityid) => oldHass.states[entityid] !== this.hass.states[entityid]);
        }

        return false
    }

    protected getStateIcon(hvac: ClimateState): string {
        switch (hvac.state) {
            case 'heat': return mdiFire
            case 'cool': return mdiSnowflake
            case 'heat_cool': return mdiAirConditioner
            case 'dry': return mdiWeatherRainy
            case 'fan_only': return mdiFan
        }
        return mdiCircleOffOutline
    }

    protected getStateColor(hvac: ClimateState): string {
        const action = hvac.attributes.hvac_action
        if (action == 'idle') return 'grey'
        switch (hvac.state) {
            case 'heat':
                if (action === 'heating') return 'orange'
                break
            case 'cool':
                if (action === 'cooling') return 'blue'
                break
            case 'heat_cool':
                if (action === 'cooling') return 'blue'
                if (action === 'heating') return 'orange'
                break
            case 'dry':
                if (action === 'drying') return '#c1cc32'
                break
            case 'fan_only':
                if (action === 'fan') return 'grey'
                break
            case 'off':
                if (action === 'off') return 'grey'
        }
        return 'red'
    }

    protected moreInfo(entityId: string) {
        fireEvent(this, "hass-more-info", { entityId })
    }

    protected timer(entity_id: string, timeout: number) {
        console.warn("call service")
        this.hass.callService('thermy', 'offtimer', { entity_id, timeout })
    }

    protected setmode(entity_id: string, hvac_mode: string) {
        console.warn("call service")
        this.hass.callService('climate', 'set_hvac_mode', { entity_id, hvac_mode })
    }


    protected periodic() {
        if (!this.config || !this.config.entity) return;
        const thermy = this.hass.states[this.config.entity] as unknown as ThermyState
        if (!thermy.attributes.stoptime) {
            this.timerLeft = null
            return;
        }

        const endtime = new Date(thermy.attributes.stoptime + 'Z').getTime()
        const now = new Date().getTime()
        this.timerLeft = Math.round((endtime - now)/1000)
    }

    protected render(): TemplateResult | void {
        // TODO Check for stateObj or other necessary things and render a warning if missing
        if (this.config.show_warning) {
            return this._showWarning("Warning");
        }
        if (this.config.show_error) {
            return this._showError("Error");
        }

        if (!this.hass) return
        if (!this.config.entity) return

        const thermy = this.hass.states[this.config.entity] as unknown as ThermyState
        const hvac   = this.hass.states[thermy.attributes.hvacid] as unknown as ClimateState
        const temp   = this.hass.states[thermy.attributes.tempid] as unknown as SensorState
        const humid  = this.hass.states[thermy.attributes.humidid] as unknown as SensorState

        return html`
        <div class='outercontainer'>
            <div class='stateicon'>
                <ha-button-menu class="ha-icon-overflow-menu-overflow" corner="BOTTOM_START" absolute>
                    <ha-icon-button label="select mode" .path=${this.getStateIcon(hvac)} slot="trigger" .style="color: ${this.getStateColor(hvac)}"></ha-icon-button>
                    ${hvac.attributes.hvac_modes.map((item) =>
                        html`<mwc-list-item @click=${() => this.setmode(hvac.entity_id, item)}>${item}</mwc-list-item>`
                    )}
                </ha-button-menu>
                ${hvac.attributes.friendly_name}
            </div>

            <div class='timerbox'>
                <ha-button-menu class="ha-icon-overflow-menu-overflow" corner="BOTTOM_START" absolute>
                    <ha-icon-button label="off timer" .path=${mdiCameraTimer} slot="trigger" .style="color: ${this.timerLeft !== null ? 'green' : 'grey'}"></ha-icon-button>
                    ${[15,30,60,120].map((item) =>
                        html`<mwc-list-item @click=${() => this.timer(thermy.entity_id, item)}>${item}</mwc-list-item>`
                    )}
                </ha-button-menu>
                ${this.timerLeft}
            </div>

            <div class='tempcontrol'>
                <ha-icon-button .path=${mdiMinusCircle}></ha-icon-button>
                <span class='temperature'>${hvac.attributes.temperature}</span>
                <ha-icon-button .path=${mdiPlusCircle}></ha-icon-button>
            </div>

            <div class='statusbox' @click=${() => this.moreInfo(hvac.entity_id)}>
                <span>${temp.state} ${this.hass.config.unit_system.temperature}</span>
                <span>${humid.state} %</span>
                <span class='unittemp'>unit: ${hvac.attributes.current_temperature} ${this.hass.config.unit_system.temperature}</span>
            </div>
        </div>
        `;
    }


    private _showWarning(warning: string): TemplateResult {
        return html`<hui-warning>${warning}</hui-warning>`;
    }

    private _showError(error: string): TemplateResult {
        const errorCard = document.createElement('hui-error-card');
        errorCard.setConfig({
        type: 'error',
        error,
        origConfig: this.config,
        });
        return html` ${errorCard} `;
    }

    // https://lit.dev/docs/components/styles/
    static get styles(): CSSResultGroup {
        return css`
            .stategrid {
                display: inline-grid;
                grid-template-columns: auto auto;
                grid-template-rows: auto;
                grid-template-areas:
                    "temperature current_temperature"
                    "state hvac_action"
                    "fan_mode swing_mode";
                grid-column-gap: 1rem;
            }

            .outercontainer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .stateicon, .statusbox {
                display: flex;
                flex-direction: column;
            }

            .timerbox {
                display: flex;
                flex-direction: column;
                align-self: flex-start;
                align-items: center;
            }

            .statusbox {
                align-items: end;
            }

            .tempcontrol {
                display: flex;
                align-items: center;
                font-size: 250%;
            }

            .tempcontrol ha-icon-button {
                color: #222;
            }

            .unittemp {
                font-size: 90%;
                color: grey;
            }
        `;
    }
}

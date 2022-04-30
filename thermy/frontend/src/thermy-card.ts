import './timer-control'
import './mode-control'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, LitElement, PropertyValues, TemplateResult, css, html } from 'lit';
import type { ClimateState, SensorState, ThermyCardConfig, ThermyState } from './types';
import {
  HomeAssistant,
  fireEvent,
} from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators';
import { mdiMinusCircle, mdiPlusCircle } from '@mdi/js'

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

    public setConfig(config: ThermyCardConfig): void {
        if (!config) { throw new Error("Invalid Configuration"); }
        this.config = { name: 'Thermy', ...config };
    }


    protected shouldUpdate(changedProps: PropertyValues): boolean {
        if (changedProps.has("config")) { return true; }

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


    protected moreInfo(entityId: string) {
        fireEvent(this, "hass-more-info", { entityId })
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
            ${hvac.attributes.friendly_name}
            <mode-control .hass=${this.hass} .hvac=${hvac}></mode-control>
            <timer-control .hass=${this.hass} .thermyState=${thermy}></timer-control>

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
                align-items: flex-start;
            }

            .statusbox {
                display: flex;
                flex-direction: column;
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

import './timer-control'
import './mode-control'
import './temp-control'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, LitElement, PropertyValues, TemplateResult, css, html } from 'lit';
import type { ClimateState, SensorState, ThermyCardConfig, ThermyState } from './types';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators';

@customElement('thermy-row')
export class ThermyRow extends LitElement {
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

    protected render(): TemplateResult | void {
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
            <mode-control  .hass=${this.hass} .hvac=${hvac}></mode-control>
            <timer-control .hass=${this.hass} .thermyState=${thermy}></timer-control>
            <temp-control  .hass=${this.hass} .hvac=${hvac}></temp-control>

            <div class='statusbox' @click=${() => fireEvent(this, "hass-more-info", { entityId: hvac.entity_id })}>
                <span>${temp.state} ${this.hass.config.unit_system.temperature}</span>
                <span>${humid.state} %</span>
                <span class='unittemp'>unit: ${hvac.attributes.current_temperature} ${this.hass.config.unit_system.temperature}</span>
            </div>
        </div>
        `;
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

    static get styles(): CSSResultGroup {
        return css`
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

            .unittemp {
                font-size: 90%;
                color: grey;
            }
        `;
    }
}

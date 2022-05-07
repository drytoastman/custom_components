import './timer-control'
import './mode-control'
import './temp-control'
import './thermy-groups-row'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, PropertyValues, TemplateResult, html } from 'lit';
import type { ClimateState, SensorState, ThermyCardConfig, ThermyState } from './types';
import { HassBase, rowstyle, sround } from './util';
import { customElement, state } from 'lit/decorators';

@customElement('thermy-row')
export class ThermyRow extends HassBase {
    @state() private config!: ThermyCardConfig;

    public setConfig(config: ThermyCardConfig): void {
        if (!config) { throw new Error("Invalid Configuration"); }
        this.config = { name: 'Thermy', ...config };
    }

    protected shouldUpdate(changedProps: PropertyValues): boolean {
        if (this.config.entity != null) {
            const attr = (this.hass.states[this.config.entity] as unknown as ThermyState).attributes
            return this.shouldIUpdate(changedProps, [this.config.entity, attr.hvacid, attr.tempid, attr.humidid])
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

        if (!thermy || !hvac || !temp || !humid) {
            return this._showError(`Bad values thermy=${thermy}, hvac=${hvac}, temp=${temp}, humid=${humid}`)
        }

        return html`
        <div class='outercontainer'>
            <span class='modebox'>
                <mode-control  .hass=${this.hass} .hvac=${hvac}></mode-control>
                <span class='aligner'></span>
                <span class='name' @click=${() => this.more(hvac.entity_id)}>${hvac.attributes.friendly_name}</span>
            </span>
            <span class='filler1'></span>
            <timer-control .hass=${this.hass} .thermyState=${thermy}></timer-control>
            <span class='filler2'></span>
            <temp-control  .hass=${this.hass} .hvac=${hvac}></temp-control>
            <span class='filler3'></span>
            <div class='statusbox'>
                ${hvac.attributes.remote_temp?
                    html `
                       <span @click=${()=>this.more(temp.entity_id)}>${sround(temp.state, 1)} ${this.hass.config.unit_system.temperature}</span>
                       <span @click=${()=>this.more(humid.entity_id)}>${sround(humid.state, 1)}  &nbsp;%</span>
                         ` :
                    html `
                        <span>unit: ${hvac.attributes.current_temperature} ${this.hass.config.unit_system.temperature}</span>`
                }
            </div>
        </div>
        `;
    }

    static get styles(): CSSResultGroup { return rowstyle }
}

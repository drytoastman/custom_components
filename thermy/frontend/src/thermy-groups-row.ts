/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, PropertyValues, TemplateResult, html } from 'lit';
import type { ClimateState, ThermyCardConfig, ThermyState } from './types';
import { HassBase, average, rowstyle } from './util';
import { customElement, property, state } from 'lit/decorators';

import { HassEntity } from 'home-assistant-js-websocket';
import { ModeControl } from './mode-control';
import { TempControl } from './temp-control';
import { TimerControl } from './timer-control';
import { mdiArrowDownDropCircleOutline } from '@mdi/js';

@customElement('multi-mode-control')
export class MultiModeControl extends ModeControl {
    @property({ attribute: false }) public targets!: string[]
    protected setmode(hvac_mode: string) {
        this.targets.forEach(target =>
            this.hass.callService('climate', 'set_hvac_mode', { entity_id: target, hvac_mode })
        )
    }
    protected getStateIcon(): string {
        return mdiArrowDownDropCircleOutline
    }
    protected getStateColor(): string {
        return '#555'
    }
}

@customElement('multi-temp-control')
export class MultiTempControl extends TempControl {
    @property({ attribute: false }) public targets!: string[]
    protected settemp(temp: number | null) {
        this.targets.forEach(target =>
            this.hass.callService('climate', 'set_temperature', { entity_id: target, temperature: temp })
        )
        this.isSetting = false
        this.workingTemp = null
    }
}

@customElement('multi-timer-control')
export class MultiTimerControl extends TimerControl {
    @property({ attribute: false }) public targets!: string[]
    protected starttimer(timeout: number) {
        this.targets.forEach(t =>
            this.hass.callService('thermy', 'offtimer', { entity_id: t, timeout: timeout*60 })
        )
    }
    protected stoptimer() {
        this.targets.forEach(t =>
            this.hass.callService('thermy', 'canceltimer', { entity_id: t })
        )
    }
}


@customElement('thermy-groups-row')
export class ThermyGroupsRow extends HassBase {
    @state() private config!: ThermyCardConfig
    private group!: HassEntity
    private thermys: ThermyState[] = []
    private hvacids: string[] = []

    public setConfig(config: ThermyCardConfig): void {
        if (!config) { throw new Error("Invalid Configuration") }
        this.config = { name: 'ThermyGroup', ...config }
    }

    protected shouldUpdate(changedProps: PropertyValues): boolean {
        if (!this.config || !this.hass) return false;
        if (changedProps.has("hass")) {
            this.group   = this.hass.states[this.config.entity]
            this.thermys = this.group.attributes.entity_id.map(t => this.hass.states[t] as ThermyState)
            this.hvacids = this.thermys.map(t => t.attributes.hvacid)
        }
        return this.shouldIUpdate(changedProps, [this.config.entity, ...this.thermys.map(t => t.entity_id), ...this.hvacids])
    }

    protected render(): TemplateResult | void {
        if (this.config.show_error) {
            return this._showError("Error");
        }

        if (!this.hass) return
        if (!this.config.entity) return

        const hvacs = this.hvacids.map(h => this.hass.states[h] as ClimateState)
        const groupclimate: ClimateState = {
            attributes: {
                hvac_modes:hvacs[0].attributes.hvac_modes,
                fan_modes: hvacs[0].attributes.fan_modes,
                swing_modes: hvacs[0].attributes.swing_modes,
                compressor_frequency: hvacs[0].attributes.compressor_frequency,
                temperature: Math.round(average(hvacs.map(h => h.attributes.temperature)))
            },
        } as never as ClimateState

        const stoptimes = this.thermys.map(t => new Date(t.attributes.stoptime || 0).getTime())
        const groupthermy: ThermyState = {
            attributes: {
                stoptime: new Date(Math.min(...stoptimes.filter(t => t > 0)))
            }
        } as never as ThermyState

        return html`
            <div class='outercontainer'>
                <span class='modebox'>
                    <multi-mode-control .hass=${this.hass} .hvac=${groupclimate} .targets=${this.hvacids}></multi-mode-control>
                    <span class='aligner'></span>
                    <span class='name'>${this.group.attributes.friendly_name}</span>
                </span>
                <span class='filler1'></span>
                <multi-timer-control .hass=${this.hass} .thermyState=${groupthermy} .targets=${this.thermys.map(t => t.entity_id)}></multi-timer-control>
                <span class='filler2'></span>
                <multi-temp-control .hass=${this.hass} .hvac=${groupclimate} .targets=${this.hvacids}></multi-temp-control>
                <span class='filler3'></span>
                <div class='statusbox'>
                    ${groupclimate.attributes.compressor_frequency} Hz
                </div>
            </div>
        `;
    }

    static get styles(): CSSResultGroup { return rowstyle }
}

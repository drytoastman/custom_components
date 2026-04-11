import { CSSResultGroup, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiAirConditioner, mdiCircleOffOutline, mdiFan, mdiFire, mdiSnowflake, mdiWeatherRainy } from '@mdi/js'

import { ClimateState } from "./types";
import { HassBase } from "./util";

@customElement('mode-control')
export class ModeControl extends HassBase {
    @property({ attribute: false }) public hvac!: ClimateState;

    protected getStateIcon(): string {
        switch (this.hvac.state) {
            case 'heat': return mdiFire
            case 'cool': return mdiSnowflake
            case 'heat_cool': return mdiAirConditioner
            case 'dry': return mdiWeatherRainy
            case 'fan_only': return mdiFan
        }
        return mdiCircleOffOutline
    }

    protected getStateColor(): string {
        const action = this.hvac.attributes.hvac_action
        if (action == 'idle') return 'grey'
        switch (this.hvac.state) {
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

    protected setmode(event) {
        const hvac_mode = event.detail.item.value;
        this.hass.callService('climate', 'set_hvac_mode', { entity_id: this.hvac.entity_id, hvac_mode })
        this.requestUpdate();
    }

    protected render(): TemplateResult | void {
        return html`
            <ha-dropdown @wa-select=${this.setmode}>
                <ha-icon-button slot="trigger" label="select mode" .path=${this.getStateIcon()} .style="color: ${this.getStateColor()}">
                </ha-icon-button>
                ${this.hvac.attributes.hvac_modes.filter(item => !['heat_cool', 'dry'].includes(item)).map((item) =>
                    html`<ha-dropdown-item value="${item}">${item}</ha-dropdown-item>`
                )}
            </ha-dropdown>
        `
    }

    static get styles(): CSSResultGroup {
        return css`
            ha-dropdown {
                --mdc-icon-button-size: 40px;
            }
        `
    }
}

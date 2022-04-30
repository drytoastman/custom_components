import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiAirConditioner, mdiCircleOffOutline, mdiFan, mdiFire, mdiSnowflake, mdiWeatherRainy } from '@mdi/js'

import { ClimateState } from "./types";
import { HomeAssistant } from "custom-card-helpers";

@customElement('mode-control')
export class ModeControl extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
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

    protected setmode(hvac_mode: string) {
        this.hass.callService('climate', 'set_hvac_mode', { entity_id: this.hvac.entity_id, hvac_mode })
    }

    protected render(): TemplateResult | void {
        return html`
            <ha-button-menu class="ha-icon-overflow-menu-overflow" corner="BOTTOM_START" absolute>
                <ha-icon-button label="select mode" .path=${this.getStateIcon()} slot="trigger" .style="color: ${this.getStateColor()}"></ha-icon-button>
                ${this.hvac.attributes.hvac_modes.map((item) =>
                    html`<mwc-list-item @click=${() => this.setmode(item)}>${item}</mwc-list-item>`
                )}
            </ha-button-menu>
        `
    }

    static get styles(): CSSResultGroup {
        return css`
        `
    }
}
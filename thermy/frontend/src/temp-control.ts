import { CSSResultGroup, PropertyValueMap, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiMinusCircle, mdiPlusCircle } from '@mdi/js'

import { ClimateState } from "./types";
import { HassBase } from "./util";

@customElement('temp-control')
export class TempControl extends HassBase {
    @property({ attribute: false }) public hvac!: ClimateState
    @state() protected workingTemp: number | null = null
    @state() protected isSetting = false
    private timeout!: NodeJS.Timeout

    protected settemp(temp: number | null) {
        if (temp != null) {
            this.hass.callService('climate', 'set_temperature', { entity_id: this.hvac.entity_id, temperature: temp })
            this.isSetting = false
        }
    }

    protected willUpdate(changedProperties: PropertyValueMap<never> | Map<PropertyKey, unknown>): void {
        if (changedProperties.has('hvac')) {
            const newhvac = changedProperties.get('hvac') as ClimateState
            if (newhvac && this.hvac.attributes.temperature != newhvac.attributes.temperature) {
                this.workingTemp = null
            }
        }
    }

    protected tempadj(amount: number) {
        if (!this.workingTemp) this.workingTemp = this.hvac.attributes.temperature
        this.workingTemp += amount
        this.isSetting = true
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = setTimeout(() => this.settemp(this.workingTemp), 2000)
    }

    protected tempColor(): string {
        if (this.isSetting) return "orange"
        if (this.workingTemp) return "red"
        return "currentColor"
    }

    protected render(): TemplateResult | void {
        return html`
            <div class='tempcontrol'>
                <ha-icon-button .path=${mdiMinusCircle} @click=${() => this.tempadj(-1)}></ha-icon-button>
                <span class='temperature' style="color: ${this.tempColor()}">
                    ${this.workingTemp ? this.workingTemp : this.hvac.attributes.temperature}
                </span>
                <ha-icon-button .path=${mdiPlusCircle} @click=${() => this.tempadj(+1)}></ha-icon-button>
            </div>
        `
    }

    static get styles(): CSSResultGroup {
        return css`
            ha-icon-button {
                --mdc-icon-button-size: 36px;
            }
            .tempcontrol {
                display: flex;
                align-items: center;
                font-size: 24px;
            }
        `
    }
}

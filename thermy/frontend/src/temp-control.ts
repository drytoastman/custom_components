import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiMinusCircle, mdiPlusCircle } from '@mdi/js'

import { ClimateState } from "./types";
import { HomeAssistant } from "custom-card-helpers";

@customElement('temp-control')
export class TempControl extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public hvac!: ClimateState;


    protected render(): TemplateResult | void {
        return html`
            <div class='tempcontrol'>
                <ha-icon-button .path=${mdiMinusCircle}></ha-icon-button>
                <span class='temperature'>${this.hvac.attributes.temperature}</span>
                <ha-icon-button .path=${mdiPlusCircle}></ha-icon-button>
            </div>
        `
    }

    static get styles(): CSSResultGroup {
        return css`
            .tempcontrol {
                display: flex;
                align-items: center;
                font-size: 250%;
                color: #333;
            }
        `
    }
}
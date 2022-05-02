import { LitElement, TemplateResult, html, css, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";

import { HomeAssistant } from "custom-card-helpers";
import { ThermyState } from "./types";
import { mdiCameraTimer, mdiCloseCircle } from '@mdi/js'

@customElement('timer-control')
export class TimerControl extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public thermyState!: ThermyState;
    @state() private timerLeft!: number | null;
    @state() private interval!: NodeJS.Timer;

    override connectedCallback() {
        super.connectedCallback()
        if (this.interval) clearInterval(this.interval)
        this.interval = setInterval(this.periodic.bind(this), 500)
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback()
        if (this.interval) clearInterval(this.interval)
    }

    protected starttimer(timeout: number) {
        this.hass.callService('thermy', 'offtimer', { entity_id: this.thermyState.entity_id, timeout: timeout*60 })
    }

    protected stoptimer() {
        this.hass.callService('thermy', 'canceltimer', { entity_id: this.thermyState.entity_id })
    }

    protected periodic() {
        if (!this.thermyState.attributes.stoptime) {
            this.timerLeft = null
            return;
        }

        const endtime = new Date(this.thermyState.attributes.stoptime + 'Z').getTime()
        const now = new Date().getTime()
        this.timerLeft = Math.floor((endtime - now)/1000)
    }

    protected render(): TemplateResult | void {
        if (this.timerLeft) {
            const min = ('00'+Math.floor(this.timerLeft/60)).slice(-2)
            const sec = ('00'+this.timerLeft%60).slice(-2)
            return html`
                <div class='timercontrol'>
                    <ha-icon-button label="cancel timer" .path=${mdiCloseCircle} class='cancelbutton' @click=${() => this.stoptimer()}></ha-icon-button>
                    <span>${min}:${sec}</span>
                </div>
            `;
        } else {
            return html`
                <ha-button-menu class="ha-icon-overflow-menu-overflow" corner="BOTTOM_START" absolute>
                    <ha-icon-button label="start off timer" .path=${mdiCameraTimer} slot="trigger" class='timerbutton'></ha-icon-button>
                    ${[5,15,30,60,120].map((item) =>
                        html`<mwc-list-item @click=${() => this.starttimer(item)}>${item}</mwc-list-item>`
                    )}
                </ha-button-menu>
            `;
        }
    }

    static get styles(): CSSResultGroup {
        return css`
            ha-icon-button {
                --mdc-icon-button-size: 24px;
            }

            .timerbutton {
                color: grey;
            }

            .cancelbutton {
                color: #ff6000
            }

            .timercontrol {
                display: flex;
                flex-direction: column;
                align-self: flex-start;
                align-items: center;
            }`;
    }
}
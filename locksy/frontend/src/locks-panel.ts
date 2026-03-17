import './code-table'
import './locks-table'

import { CSSResultGroup, LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { HomeAssistant } from 'custom-card-helpers'
import { LocksyData } from './types'

const hassneeds = ['ha-card', 'state-badge']

@customElement('locks-panel')
export class MyLocksPanel extends LitElement {
    @property() public hass!: HomeAssistant;
    @property({ type: Boolean, reflect: true }) public narrow!: boolean;

    data: LocksyData = {
        codes: {},
        slots: {},
        entitymap: {}
    };

    async firstUpdated() {
        if (!customElements.get('mwc-button')) { import('@material/mwc-button') }
        if (!customElements.get('mwc-menu')) { import('@material/mwc-menu') }

        window.addEventListener('location-changed', () => {
            this.requestUpdate();
        });

        this.hass!.connection.subscribeMessage((msgdata: LocksyData) => {
            this.data = msgdata
            this.requestUpdate();
        }, { type: 'locksy/updates'}, { resubscribe: true })
    }

    render() {
        for (const index in hassneeds) {
            if (!customElements.get(hassneeds[index])) return html`waiting (${hassneeds[index]}) ...`;
        }

        return html`
            <div class="header">
                <div class="toolbar">
                    <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
                    <div class="main-title">Locksy</div>
                </div>
            </div>
            <div class="view">
                <ha-card header="Codes">
                    <code-table .hass=${this.hass} .data=${this.data}></code-table>
                </ha-card>
                <ha-card header="Locks">
                    <locks-table .hass=${this.hass} .data=${this.data}></locks-table>
                </ha-card>
            </div>
        `;
    }

    static get styles(): CSSResultGroup {
        return css`
        .header,.toolbar {
            background-color: var(--app-header-background-color);
            font-weight: 400;
            color: var(--app-header-text-color, white);
        }
        .toolbar {
            height: var(--header-height);
            display: flex;
            align-items: center;
        }

        ha-app-layout {
            display: block;
            z-index: 2;
        }

        ha-card {
            margin: 1rem;
        }

        .main-title-container {
            display: inline-block;
            height: 100%;
        }

        .toolbar .main-title {
            margin-left: 20px;
            font-size: 1.8rem;
            display: inline-block;
        }

        :host {
            color: var(--primary-text-color);
            --paper-card-header-color: var(--primary-text-color);
        }
        `;
    }
}

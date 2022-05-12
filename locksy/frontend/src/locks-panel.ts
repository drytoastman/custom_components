import './code-table'
import './locks-table'

import { CSSResultGroup, LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { HomeAssistant } from 'custom-card-helpers'
import { LocksyData } from './types'

const hassneeds = ['ha-app-layout', 'ha-card', 'state-badge']

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
          <ha-app-layout>
            <app-header fixed slot="header">
              <app-toolbar>
                <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
                <div main-title>
                  Locksy
                </div>
              </app-toolbar>
            </app-header>
          </ha-app-layout>
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
        app-header,
        app-toolbar {
            background-color: var(--app-header-background-color);
            font-weight: 400;
            color: var(--app-header-text-color, white);
        }
        app-toolbar {
            height: var(--header-height);
        }

        ha-app-layout {
            display: block;
            z-index: 2;
        }

        ha-card {
            margin: 1rem;
        }

        app-toolbar [main-title] {
            margin-left: 20px;
        }

        :host {
            color: var(--primary-text-color);
            --paper-card-header-color: var(--primary-text-color);
        }
        `;
    }
}

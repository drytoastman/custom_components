// import './code-table'
// import './scans-table'

import { CSSResultGroup, LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { HomeAssistant } from 'custom-card-helpers'

// import { LocksyData } from './types'

const hassneeds = ['ha-app-layout', 'ha-card', 'state-badge']

@customElement('scanny-panel')
export class MyLocksPanel extends LitElement {
    @property() public hass!: HomeAssistant;
    @property({ type: Boolean, reflect: true }) public narrow!: boolean;

    async firstUpdated() {
        if (!customElements.get('mwc-button')) { import('@material/mwc-button') }
        if (!customElements.get('mwc-menu')) { import('@material/mwc-menu') }

        /*
        window.addEventListener('location-changed', () => {
            this.requestUpdate();
        });
        */

        /*
        this.hass!.connection.subscribeMessage((msgdata: LocksyData) => {
            this.data = msgdata
            this.requestUpdate();
        }, { type: 'scansy/updates'}, { resubscribe: true })
        */
    }

    render() {
        for (const index in hassneeds) {
            if (!customElements.get(hassneeds[index])) return html`waiting (${hassneeds[index]}) ...`;
        }

        const scanny = this.hass.states['scanny.single'].attributes;
        return html`
          <ha-app-layout>
            <app-header fixed slot="header">
              <app-toolbar>
                <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
                <div main-title>
                  Scanny
                </div>
              </app-toolbar>
            </app-header>
          </ha-app-layout>
          <div class="view">
            <ha-card header="Codes">
                <div>${JSON.stringify(scanny)}</div>
                <mwc-button @click=${() => this.setAddMode(this.hass, !scanny.addMode)}>${scanny.addMode ? 'Cancel Add Mode' : 'Enable Add Mode'}</mwc-button>
                <div>After text</div>
            </ha-card>
          </div>
        `;
    }

    private setAddMode(hass: HomeAssistant, on: boolean): Promise<void> {
        return hass.callService('scanny', 'setaddmode', { on }, { entity_id: 'scanny.single' } )
        .catch(e => alert(`Error setting mode: ${JSON.stringify(e)}`))
        // .then(() => {  });
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

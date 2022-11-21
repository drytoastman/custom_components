// import './code-table'
// import './scans-table'

import { CSSResultGroup, LitElement, css, html } from 'lit'
import { HomeAssistant, fireEvent } from 'custom-card-helpers'
import { customElement, property } from 'lit/decorators.js'
import { mdiLockPlus, mdiPencil, mdiPlus, mdiTrashCanOutline } from '@mdi/js';

// import { LocksyData } from './types'

interface ScannyData {
    addMode: boolean,
    allowed: { [key: string]: string }
}

export async function setAddMode(hass: HomeAssistant, on: boolean): Promise<void> {
    return hass.callService('scanny', 'set_add_mode', { on } )
    .catch(e => alert(`Error setting mode: ${JSON.stringify(e)}`))
}

export async function deleteTag(hass: HomeAssistant, uid: string): Promise<void> {
    return hass.callService('scanny', 'delete_tag', { uid } )
    .catch(e => alert(`Error deleting tag: ${JSON.stringify(e)}`))
}

export async function changeTagName(hass: HomeAssistant, uid: string, name: string): Promise<void> {
    return hass.callService('scanny', 'change_name', { uid, name } )
    .catch(e => alert(`Error deleting tag: ${JSON.stringify(e)}`))
}

const hassneeds = ['ha-app-layout', 'ha-card', 'state-badge']

@customElement('scanny-panel')
export class MyLocksPanel extends LitElement {
    @property() public hass!: HomeAssistant;
    @property({ type: Boolean, reflect: true }) public narrow!: boolean;

    data: ScannyData = {
        addMode: false,
        allowed: {}
    };

    async firstUpdated() {
        if (!customElements.get('mwc-button')) { import('@material/mwc-button') }
        if (!customElements.get('mwc-menu')) { import('@material/mwc-menu') }

        window.addEventListener('location-changed', () => {
            this.requestUpdate();
        });

        this.hass!.connection.subscribeMessage((msgdata: ScannyData) => {
            this.data = msgdata
            this.requestUpdate();
        }, { type: 'scanny/updates'}, { resubscribe: true })
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
                  Scanny
                </div>
              </app-toolbar>
            </app-header>
          </ha-app-layout>
          <div class="view">
            <ha-card header="Codes">
                <div>${JSON.stringify(this.data)}</div>
                <ol>
                ${Object.keys(this.data.allowed).map(uid => html`
                    <li>
                        <mwc-button raised dense @click=${() => deleteTag(this.hass, uid)}>
                            <ha-svg-icon path=${mdiTrashCanOutline}></ha-svg-icon>
                        </mwc-button>
                        <mwc-button raised dense @click=${(e) => this.editTag(e, uid, this.data.allowed[uid])}>
                            <ha-svg-icon path=${mdiPencil}></ha-svg-icon>
                        </mwc-button>
                        ${this.data.allowed[uid]} (${uid})
                    </li>
                `)}
                </ol>
                <mwc-button @click=${() => setAddMode(this.hass, !this.data.addMode)}>${this.data.addMode ? 'Cancel Add Mode' : 'Enable Add Mode'}</mwc-button>
            </ha-card>
          </div>
        `;
    }

    private editTag(ev: Event, uid: string,  name: string) {
        const element = ev.target as HTMLElement;
        fireEvent(element, 'show-dialog', {
          dialogTag: 'name-dialog',
          dialogImport: () => import('./name-dialog'),
          dialogParams: {
              title: 'Change Tag Name',
              uid: uid,
              name: name,
              confirm: false,
          },
        });
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

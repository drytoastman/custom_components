/*
May need some day
import '@material/mwc-button';
import '@material/mwc-menu';
*/

import { CSSResultGroup, LitElement, css, html } from 'lit';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { customElement, property } from 'lit/decorators.js';

export interface LocksyData {
    codes: { [name: string]: string }
    slots: { [lockid: string]: { [slotid: string]: string }}
    entitymap: { [lockid: string]: { entity: string, name: string } }
}

const needs = ['ha-app-layout', 'ha-card', 'state-badge']

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
        for (const index in needs) {
            await customElements.whenDefined(needs[index])
        }        

        window.addEventListener('location-changed', () => {
            this.requestUpdate();
        });

        this.hass!.connection.subscribeMessage((msgdata: LocksyData) => {
            this.data = msgdata
            this.requestUpdate();
        }, { type: 'locksy/updates'}, { resubscribe: true })
    }

    getStateForLockId(lockid: string) {
        return this.hass.states[this.data.entitymap[lockid].entity]
    }

    moreInfo(lockid: string) {
        fireEvent(this, "hass-more-info", { entityId: this.data.entitymap[lockid].entity });
    }

    locksWithoutCode(name: string): string[] {
        return Object.keys(this.data.slots).filter(lockid => !Object.values(this.data.slots[lockid]).includes(name))
    }

    getLockName(lockid: string): string {
        return this.data.entitymap[lockid].name
    }

    menu(name: string) {
        const el = this.shadowRoot?.getElementById(`menu${name}`)
        if (!el) return;
        (el as any).show()
    }

    addCode(ev: Event) {
        const element = ev.target as HTMLElement;
        fireEvent(element, 'show-dialog', {
          dialogTag: 'new-code-dialog',
          dialogImport: () => import('./new-code-dialog'),
          dialogParams: {},
        });
    }

    render() {
        for (const index in needs) {
            if (!customElements.get(needs[index])) return html`waiting (${needs[index]}) ...`;
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
                <div class="codetable">
                    ${Object.keys(this.data.codes).map(name => html`
                        <div class='name'>${name}</div>
                        <div class='value'>${this.data.codes[name].replace(/./g, '*')}</div>
                        <div style="position: relative;">
                            <mwc-button class='menubutton' raised dense label="Assign To ..." @click="${() => this.menu(name)}"></mwc-button>
                            <mwc-menu activatable id="menu${name}">
                                ${this.locksWithoutCode(name).map(lockid => html`
                                    <mwc-list-item>${this.getLockName(lockid)}</mwc-list-item>
                                `)}
                            </mwc-menu>
                        </div>
                    `)}
                </div>
                <div class='addwrapper'>
                    <mwc-button class='addbutton' raised dense label="Add Code" @click=${this.addCode}></mwc-button>
                </div>

            </ha-card>
            <ha-card header="Locks">
                <div class="loctable">
                    ${Object.keys(this.data.slots).map(lockid => html`
                        <div class='lockid'>
                            <div class='clickwrap' @click=${() => this.moreInfo(lockid)}>
                                <state-badge .hass=${this.hass} .stateObj=${this.getStateForLockId(lockid)}></state-badge>
                                <div class='lname'>${this.getLockName(lockid)}</div>
                            </div>
                        </div>
                        <div class='slottable'>
                        ${Object.keys(this.data.slots[lockid]).map(slotid => html`
                            <div class='slot'>${slotid}</div>
                            <div class='aname'>${this.data.slots[lockid][slotid]}</div>
                            <div class='button'>${this.data.slots[lockid][slotid] != 'external' ? html`
                                <mwc-button raised dense>
                                    <ha-icon icon="hass:trash-can-outline"></ha-icon>
                                </mwc-button>` : ''}
                            </div>
                        `)}
                        </div>
                    `)}
                </div>
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

        .codetable { 
            display: inline-grid;
            grid-template-columns: auto auto auto;
            grid-gap: 1rem;
            margin: 1rem;
            align-items: center;
        }

        .loctable {
            display: inline-grid;
            grid-template-columns: auto auto;
            grid-gap: 1rem;
            align-items: baseline;
        }

        .slottable {
            display: inline-grid;
            grid-template-columns: 1rem auto auto;
            align-items: center;
            grid-column-gap: 0.7rem;
        }

        .clickwrap {
            display: inline-flex;
            cursor: pointer;
            align-items: center;
        }

        .clickwrap > * {
            flex-grow: 1;
        }

        .addwrapper {
            width: 50%;
            padding: 1rem;
        }
        .addbutton {
            width: 100%;
        }
        
        :host {
            color: var(--primary-text-color);
            --paper-card-header-color: var(--primary-text-color);
        }
        `;
    }
}

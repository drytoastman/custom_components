// import '@material/mwc-button';

import { CSSResultGroup, LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { fireEvent, HomeAssistant } from 'custom-card-helpers';

export interface LocksyData {
    codes: { [name: string]: string }
    slots: { [lockid: string]: { [slotid: string]: string }}
    entitymap: { [lockid: string]: { entity: string, name: string } }
}

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
        await customElements.whenDefined("ha-app-layout");
        await customElements.whenDefined("state-info");

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
        //console.error(ev)
        fireEvent(this, "hass-more-info", { entityId: this.data.entitymap[lockid].entity });
    }

    render() {
        if (!customElements.get('ha-app-layout')) return html`loading...`;
        if (!customElements.get('state-info')) return html`loading...`;

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
                <div class="nametable">
                    ${Object.keys(this.data.codes).map(name => html`
                        <div class='name'>${name}</div>
                        <div class='value'>${this.data.codes[name]}</div>
                    `)}
                </div>
            </ha-card>
            <ha-card header="Locations">
                <div class="loctable">
                    ${Object.keys(this.data.slots).map(lockid => html`
                        <div class='lockid'>
                            <div class='clickwrap' @click=${() => this.moreInfo(lockid)}>
                                <state-badge .hass=${this.hass} .stateObj=${this.getStateForLockId(lockid)}></state-badge>
                                <div class='lname'>${this.data.entitymap[lockid].name}</div>
                            </div>
                        </div>
                        <div class='slottable'>
                        ${Object.keys(this.data.slots[lockid]).map(slotid => html`
                            <div class='slot'>${slotid}</div>
                            <div class='aname'>
                                ${this.data.slots[lockid][slotid]}
                                ${this.data.slots[lockid][slotid] != 'external' ? html`
                                <mwc-button outlined dense>
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

        app-toolbar [main-title] {
            margin-left: 20px;
        }

        .nametable { 
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 10px;
            margin: 1rem;
        }

        .nametable .name {
            border-right: 1px solid #ccc;
        }

        .loctable {
            display: grid;
            grid-template-columns: 1fr 2fr;
            grid-gap: 10px;
            margin: 1rem;
        }

        .slottable {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 10px;
        }

        .clickwrap {
            display: inline-flex;
            cursor: pointer;
            align-items: center;
        }

        .clickwrap > * {
            flex-grow: 1;
        }

        .aname {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        :host {
        color: var(--primary-text-color);
        --paper-card-header-color: var(--primary-text-color);
        }
        `;
    }
}

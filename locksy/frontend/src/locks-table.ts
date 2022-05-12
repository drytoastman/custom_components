import { CSSResultGroup, LitElement, css, html } from 'lit';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { customElement, property } from 'lit/decorators.js';

import { LocksyData } from './types';
import { removeNameFromLock } from './actions';

@customElement('locks-table')
export class LocksTable extends LitElement {
    @property() public hass!: HomeAssistant;
    @property() public data!: LocksyData;

    private getStateForLockId(lockid: string) {
        return this.hass.states[this.data.entitymap[lockid].entity]
    }

    private moreInfo(lockid: string) {
        fireEvent(this, "hass-more-info", { entityId: this.data.entitymap[lockid].entity });
    }

    private getLockName(lockid: string): string {
        return this.data.entitymap[lockid].name
    }

    render() {
        return html`
            <div class="loctable">
                ${Object.keys(this.data.slots).map(lockid => html`
                    <div class='lockid'>
                        <div class='clickwrap' @click=${() => this.moreInfo(lockid)}>
                            <state-badge .hass=${this.hass} .stateObj=${this.getStateForLockId(lockid)}></state-badge>
                            <div class='lname'>${this.getLockName(lockid)}</div>
                        </div>
                    </div>
                    ${Object.keys(this.data.slots[lockid]).map(slotid => html`
                        <div class='slot'>${slotid}</div>
                        <div class='aname'>${this.data.slots[lockid][slotid]+ 'x'.repeat(parseInt(slotid)*2)}</div>
                        <div class='button'>
                            <mwc-button raised dense>
                                <ha-icon icon="hass:trash-can-outline" @click=${() => removeNameFromLock(this.hass, this.data.slots[lockid][slotid], lockid)}></ha-icon>
                            </mwc-button>
                        </div>
                    `)}
                `)}
            </div>
        `;
    }

    static get styles(): CSSResultGroup {
        return css`
        .loctable {
            display: inline-grid;
            grid-template-columns: auto auto auto auto;
            grid-gap: 0.75rem;
            align-items: center;
            padding: 1rem;
            padding-top: 0;
        }

        .lockid { grid-column: 1; }
        .slot   { grid-column: 2; }
        .aname  { grid-column: 3; }
        .button { grid-column: 4; }

        .clickwrap {
            display: inline-flex;
            cursor: pointer;
            align-items: center;
        }

        .clickwrap > * {
            flex-grow: 1;
        }
        `;
    }
}

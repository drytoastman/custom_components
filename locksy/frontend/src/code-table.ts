import { CSSResultGroup, LitElement, css, html } from 'lit';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { addNameToLock, deleteCode } from './actions';
import { customElement, property } from 'lit/decorators.js';
import { mdiLockPlus, mdiPencil, mdiPlus, mdiTrashCanOutline } from '@mdi/js';

import { LocksyData } from './types';

@customElement('code-table')
export class CodeTable extends LitElement {
    @property() public hass!: HomeAssistant;
    @property() public data!: LocksyData;

    private locksWithoutCode(name: string): string[] {
        return Object.keys(this.data.slots).filter(lockid => !Object.values(this.data.slots[lockid]).includes(name))
    }

    private unusedCode(name: string): boolean {
        return Object.keys(this.data.slots).filter(lockid => Object.values(this.data.slots[lockid]).includes(name)).length == 0
    }

    private getLockName(lockid: string): string {
        return this.data.entitymap[lockid].name
    }

    private menu(name: string) {
        const el = this.shadowRoot?.getElementById(`menu${name}`)
        if (!el) return;
        (el as any).show()
    }

    private addCodeEvent(ev: Event) {
        const element = ev.target as HTMLElement;
        fireEvent(element, 'show-dialog', {
          dialogTag: 'name-code-dialog',
          dialogImport: () => import('./name-code-dialog'),
          dialogParams: {
            title: 'New Code',
            name: '',
            code: '',
            change: false,
            confirm: false
          },
        });
    }

    private changeCodeEvent(ev: Event, name: string, code: string) {
        const element = ev.target as HTMLElement;
        fireEvent(element, 'show-dialog', {
          dialogTag: 'name-code-dialog',
          dialogImport: () => import('./name-code-dialog'),
          dialogParams: {
              title: 'Change Code',
              name: name,
              code: code,
              change: true,
              confirm: false,
          },
        });
    }


    render() {
        return html`
            <div class="codetable">
            ${Object.keys(this.data.codes).map(name => html`
                <div class='name'>${name}</div>
                <div class='value'>${this.data.codes[name].replace(/./g, '*')}</div>
                <div style="position: relative;">
                    ${this.locksWithoutCode(name).length > 0 ? html`
                        <mwc-button label='' raised dense @click="${() => this.menu(name)}">
                            <ha-svg-icon path=${mdiLockPlus}></ha-svg-icon>
                        </mwc-button>
                        <mwc-menu activatable id="menu${name}" @selected=${(e) => addNameToLock(this.hass, name, e.target.selected.value)}>
                            ${this.locksWithoutCode(name).map(lockid => html`
                                <mwc-list-item value=${lockid}>${this.getLockName(lockid)}</mwc-list-item>
                            `)}
                        </mwc-menu>
                    `: html``}

                    <mwc-button raised dense @click=${(e) => this.changeCodeEvent(e, name, this.data.codes[name])}>
                        <ha-svg-icon path=${mdiPencil}></ha-svg-icon>
                    </mwc-button>

                    ${this.unusedCode(name) ? html`
                        <mwc-button raised dense @click=${() => deleteCode(this.hass, name)}>
                            <ha-svg-icon path=${mdiTrashCanOutline}></ha-svg-icon>
                        </mwc-button>
                    `: html``}
                </div>`)}

                <mwc-button class='addbutton' raised dense @click=${this.addCodeEvent}>
                    <ha-svg-icon path=${mdiPlus}></ha-svg-icon>
                </mwc-button>
            </div>
        `;
    }

    static get styles(): CSSResultGroup {
        return css`
            .codetable {
                display: inline-grid;
                grid-template-columns: auto auto auto;
                grid-gap: 1rem;
                align-items: center;
                padding: 1rem;
                padding-top: 0;
            }

            .addbutton {
                grid-column: 1 / span 2;
            }
        `;
    }
}

import { CSSResultGroup, LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose } from '@mdi/js';

@customElement('new-code-dialog')
export class NewCodeDialog extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _params?: any;
    private name = ''
    private code = ''

    public async showDialog(params): Promise<void> {
        this._params = params;
        this.name = ''
        this.code = ''
    }

    public closeDialog(): boolean {
        this._params = undefined
        return true;
    }

    render() {
        if (!this._params) return html``;
        return html`
        <ha-dialog open .heading=${true} @closed=${this.closeDialog} @close-dialog=${this.closeDialog}>
            <div slot="heading">
            <ha-header-bar>
                <ha-icon-button slot="navigationIcon" dialogAction="cancel" .path=${mdiClose}></ha-icon-button>
                <span slot="title">
                New Code
                </span>
            </ha-header-bar>
            </div>
            <div class="wrapper">
            <ha-textfield label="Name" @input=${(ev: Event) => (this.name = (ev.target as HTMLInputElement).value)} value="${this.name}"></ha-textfield>
            <ha-textfield label="Code" @input=${(ev: Event) => (this.code = (ev.target as HTMLInputElement).value)} value="${this.code}"></ha-textfield>

            </div>
            <mwc-button slot="primaryAction" @click=${this.saveClick}>Ok</mwc-button>
        </ha-dialog>
        `;
    }

    private saveClick(_ev: Event) {
        const name = this.name.trim();
        const code = this.code.trim();
        if (!name.length || !code.length) return;

        this.hass.callService('locksy', 'add_code', { name: name, code: code })
        .catch(e => alert(`Error adding code: ${e}`))
        .then(() => { this.closeDialog(); });
    }


    static get styles(): CSSResultGroup {
        return css`
        div.wrapper {
            color: var(--primary-text-color);
        }
        span.note {
            color: var(--secondary-text-color);
        }
        ha-textfield {
            display: block;
        }
        alarmo-select {
            margin-top: 10px;
        }
        `;
    }
}

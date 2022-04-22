import { CSSResultGroup, LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose } from '@mdi/js';

@customElement('name-code-dialog')
export class NameCodeDialog extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _params?: any;

    public async showDialog(params): Promise<void> {
        this._params = params;
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
                <span slot="title">${this._params.title}</span>
            </ha-header-bar>
            </div>
            <div class="wrapper">
                <ha-textfield id='namefield' label="Name" @input=${(ev: Event) => (this._params.name = (ev.target as HTMLInputElement).value)} value="${this._params.name}" 
                    minLength=3 maxLength=20 validationMessage="name must be between 3 and 30 characters"
                    ?readOnly="${this._params.change}"></ha-textfield>
                <ha-textfield id='codefield' label="Code" @input=${(ev: Event) => (this._params.code = (ev.target as HTMLInputElement).value)} value="${this._params.code}" 
                    minlength=4 maxlength=4 validationMessage="code must be 4 digits"
                ></ha-textfield>
            </div>
            <mwc-button slot="primaryAction" @click=${this.saveClick}>Ok</mwc-button>
        </ha-dialog>
        `;
    }

    private saveClick() {

        const name = this._params.name.trim();
        const code = this._params.code.trim();
        if (!name.length || !code.length) return;
        if (!(this.shadowRoot?.getElementById('namefield') as any).checkValidity() ||
            !(this.shadowRoot?.getElementById('codefield') as any).checkValidity()) return;

        this.hass.callService('locksy', this._params.change ? 'change_code' : 'add_code', { name: name, code: code })
        .catch(e => alert(`Error ${this._params.change ? 'changing' : 'adding'} code: ${JSON.stringify(e)}`))
        .then(() => { this.closeDialog(); });
    }

    static get styles(): CSSResultGroup {
        return css`
        div.wrapper {
            color: var(--primary-text-color);
        }
        ha-textfield {
            display: block;
        }
        `;
    }
}

import { HomeAssistant, fireEvent } from "custom-card-helpers";
import { LitElement, PropertyValues, TemplateResult, css, html } from "lit";

import { property } from "lit/decorators";

declare module "custom-card-helpers" {
    interface Themes {
        darkMode: boolean;
    }
}

export function sround(value: string, decimal: number): string {
    const scale = decimal*10
    return (Math.round(parseFloat(value)*scale)/scale).toFixed(decimal)
}

export function average(array: number[]): number {
    return array.reduce((a, b) => a + b) / array.length;
}

export class HassBase extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;

    protected shouldIUpdate(changedProps: PropertyValues, ids: string[]): boolean {
        for (const k in changedProps.keys) {
            if (k != 'hass') return true   // anything that isn't hass means update
        }

        const oldHass = changedProps.get("hass") as HomeAssistant;
        if (!oldHass) return true;
        if (oldHass.connected !== this.hass.connected ||
            oldHass.themes !== this.hass.themes ||
            oldHass.locale !== this.hass.locale ||
            oldHass.localize !== this.hass.localize ||
            oldHass.config.state !== this.hass.config.state) {
            return true;
        }

        return ids.some((entityid) => oldHass.states[entityid] !== this.hass.states[entityid]);
    }

    protected _showError(error: string): TemplateResult {
        const errorCard = document.createElement('hui-error-card');
        errorCard.setConfig({
            type: 'error',
            error,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            origConfig: (this as any).config,
        });
        return html` ${errorCard} `;
    }

    protected menustyle(): string {
        if (this.hass.themes.darkMode)
            return "--mdc-theme-surface: #555; --mdc-theme-text-primary-on-background: white;"
        return "";
    }

    protected more(entityId: string) {
        fireEvent(this, "hass-more-info", { entityId })
    }
}

export const rowstyle = css`
    .outercontainer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modebox {
        display: flex;
        align-items: center;
    }

    .aligner {
        display: block;
        width: 16px;
    }

    .filler1 {
        flex-grow: 1;
    }

    .filler2, .filler3 {
        display: block;
        width: 12px;
    }

    .statusbox {
        display: flex;
        flex-direction: column;
        align-items: end;
        font-size: 16px;
        width: 3.8rem;
    }
`;

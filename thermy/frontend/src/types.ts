import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

import { HassEntity } from 'home-assistant-js-websocket';

declare global {
    interface HTMLElementTagNameMap {
        'thermy-card-editor': LovelaceCardEditor;
        'hui-error-card': LovelaceCard;
    }
}

export interface ThermyCardConfig extends LovelaceCardConfig {
    type: string;
    name?: string;
    show_warning?: boolean;
    show_error?: boolean;
    test_gui?: boolean;
    entity?: string;
    tap_action?: ActionConfig;
    hold_action?: ActionConfig;
    double_tap_action?: ActionConfig;
}

export interface ThermyState extends HassEntity {
    attributes: {
        hvacid: string
        tempid: string
        humidid: string
        stoptime: null | string
        icon: string
    }
}

export interface ClimateState extends HassEntity {
    attributes: {
        hvac_modes: string[]
        min_temp: number
        max_temp: number
        target_temp_step: number
        fan_modes: string[]
        swing_modes: string[]
        current_temperature: number
        temperature: number
        fan_mode: string
        hvac_action: string
        swing_mode: string
        friendly_name: string
        supported_features: number
        unit_of_measurement: string
    }
}

export interface SensorState extends HassEntity {
    attributes: {
        state_class: string
        unit_of_measurement: string
        device_class: string
        friendly_name: string
    }
}

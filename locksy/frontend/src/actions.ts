import { HomeAssistant } from "custom-card-helpers"

export function addCode(hass: HomeAssistant, name: string, code: string): Promise<void> {
    return hass.callService('locksy', 'add_code', { name, code })
    .catch(e => alert(`Error adding code: ${JSON.stringify(e)}`))
    // .then(() => {  });
}

export function changeCode(hass: HomeAssistant, name: string, code: string): Promise<void> {
    return hass.callService('locksy', 'change_code', { name, code })
    .catch(e => alert(`Error changing code: ${JSON.stringify(e)}`))
    // .then(() => {  });
}

export function deleteCode(hass: HomeAssistant, name: string): Promise<void> {
    return hass.callService('locksy', 'delete_code', { name })
    .catch(e => alert(`Error deleting code: ${JSON.stringify(e)}`))
    // .then(() => {  });
}

export function addNameToLock(hass: HomeAssistant, name: string, lockid: string): Promise<void> {
    return hass.callService('locksy', 'add_name_to_lock', { name, lockid })
    .catch(e => alert(`Error adding code to lock: ${JSON.stringify(e)}`))
    // .then(() => {  });
}

export function removeNameFromLock(hass: HomeAssistant, name: string, lockid: string): Promise<void> {
    return hass.callService('locksy', 'remove_name_from_lock', { name, lockid })
    .catch(e => alert(`Error remove code from lock: ${JSON.stringify(e)}`))
    // .then(() => {  });
}
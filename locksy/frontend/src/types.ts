
export interface LocksyData {
    codes: { [name: string]: string }
    slots: { [lockid: string]: { [slotid: string]: string }}
    entitymap: { [lockid: string]: { entity: string, name: string } }
}

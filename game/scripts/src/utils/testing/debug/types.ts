export type DevCallback = (hero: CDOTA_BaseNPC_Hero, ...args: string[]) => void;
export type GmCallback = (hero: CDOTA_BaseNPC_Hero, ...args: string[]) => void;
export type PlayerCallback = (hero: CDOTA_BaseNPC_Hero, ...args: string[]) => void;

export interface CommandEntry<T> {
    desc: string;
    func: T;
}

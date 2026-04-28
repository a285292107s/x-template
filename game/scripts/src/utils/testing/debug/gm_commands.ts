import type { CommandEntry, GmCallback } from './types';

export const GmCommands: Record<string, CommandEntry<GmCallback>> = {
    ['get_key_v3']: {
        desc: '获取v3版本的key',
        func: (hero, ...args) => {
            const version = args[0];
            const key = GetDedicatedServerKeyV3(version);
            Say(hero, `${version}: ${key}`, true);
        },
    },
    ['get_key_v2']: {
        desc: '获取v2版本的key',
        func: (hero, ...args) => {
            const version = args[0];
            const key = GetDedicatedServerKeyV2(version);
            Say(hero, `${version}: ${key}`, true);
        },
    },
};

import { reloadable } from '../../tstl-utils';
import { GM_WHITELIST } from './config';
import { DevCommands } from './dev_commands';
import { GmCommands } from './gm_commands';
import { PlayerCommands } from './player_commands';

@reloadable
export class Debug {
    constructor() {
        ListenToGameEvent('player_chat', keys => this.OnPlayerChat(keys), this);
    }

    OnPlayerChat(keys: GameEventProvidedProperties & PlayerChatEvent): void {
        const strs = keys.text.split(' ');
        const cmd = strs[0].toLowerCase();
        const args = strs.slice(1);
        const steamid = PlayerResource.GetSteamAccountID(keys.playerid);
        const hero = HeroList.GetHero(0);

        if (cmd === '-help') {
            this._showHelp(hero, steamid);
            return;
        }

        if (DevCommands[cmd]) {
            if (!IsInToolsMode()) return;
            DevCommands[cmd].func(hero, ...args);
            return;
        }

        if (GmCommands[cmd]) {
            if (!GM_WHITELIST.includes(steamid)) return;
            GmCommands[cmd].func(hero, ...args);
            return;
        }

        if (PlayerCommands[cmd]) {
            PlayerCommands[cmd].func(hero, ...args);
            return;
        }
    }

    private _showHelp(hero: CDOTA_BaseNPC_Hero, steamid: number): void {
        if (IsInToolsMode()) {
            for (const [cmd, entry] of Object.entries(DevCommands)) {
                Say(hero, `[Dev] ${cmd}: ${entry.desc}`, true);
            }
        }

        if (IsInToolsMode() || GM_WHITELIST.includes(steamid)) {
            for (const [cmd, entry] of Object.entries(GmCommands)) {
                Say(hero, `[GM] ${cmd}: ${entry.desc}`, true);
            }
        }

        for (const [cmd, entry] of Object.entries(PlayerCommands)) {
            Say(hero, `[Player] ${cmd}: ${entry.desc}`, true);
        }

        Say(hero, '[Player] -help: 显示所有可用指令', true);
    }
}

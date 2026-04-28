import { reloadable } from '../utils/tstl-utils';
import type { EasingFunctionName } from '../utils/tween';
import { tween } from '../utils/tween';
import { runAll, printResult } from '../utils/testing';

// !!! 请将下方的 SteamID 替换为你自己的 SteamID（拥有调试权限的账号）!!!
// Xavier 的 SteamID: 86815341（占位符，请替换）
const ONLINE_DEBUG_WHITELIST = [
    86815341, // Xavier (占位符)
];

type DebugCallbackFunction = (hero: CDOTA_BaseNPC_Hero, steamid: number, ...args: string[]) => void;

/** 所有的测试指令的回调 */
const DebugCallbacks: Record<string, { desc: string; func: DebugCallbackFunction }> = {
    ['-help']: {
        desc: '显示所有的测试指令',
        func: (_hero, _steamid) => {
            if (!IsInToolsMode()) return;
            print('所有的测试指令:');
            for (const [cmd, { desc }] of Object.entries(DebugCallbacks)) {
                print(`${cmd}: ${desc}`);
            }
        },
    },
    ['-s']: {
        desc: '重载脚本',
        func: (_hero, _steamid) => {
            if (!IsInToolsMode()) return;
            SendToServerConsole('script_reload');
            print('-s 命令script_reload!重载脚本!');
        },
    },
    ['-r']: {
        desc: '重启游戏',
        func: (_hero, _steamid) => {
            if (!IsInToolsMode()) return;
            SendToServerConsole('restart'); // 重启游戏
            print('-r 命令restart重启游戏!');
        },
    },
    ['get_key_v3']: {
        desc: '获取v3版本的key',
        func: (hero, steamid, ...args: string[]) => {
            if (!ONLINE_DEBUG_WHITELIST.includes(steamid)) return;
            const version = args[0];
            const key = GetDedicatedServerKeyV3(version);
            Say(hero, `${version}: ${key}`, true);
        },
    },
    ['get_key_v2']: {
        desc: '获取v2版本的key， get_key_v2 version',
        func: (hero, steamid, ...args: string[]) => {
            if (!ONLINE_DEBUG_WHITELIST.includes(steamid)) return;
            const version = args[0];
            const key = GetDedicatedServerKeyV2(version);
            Say(hero, `${version}: ${key}`, true);
        },
    },
    ['-tween']: {
        desc: '测试Tween',
        func: (hero, _steamid, ...args: string[]) => {
            if (!IsInToolsMode()) return;
            FindClearSpaceForUnit(hero, hero.GetAbsOrigin(), true);
            const source = { scale: 1 };
            const target = { scale: 3 };
            const duration = 0.3;
            const funcName = args[0];
            const myTween = tween(duration, source, target, funcName as EasingFunctionName);
            let now = GameRules.GetGameTime();
            Timers.CreateTimer(() => {
                const dt = GameRules.GetGameTime() - now;
                now = GameRules.GetGameTime();
                const finished = myTween.update(dt);
                if (finished) {
                    return null;
                } else {
                    print(source.scale);
                    hero.SetModelScale(source.scale);
                    return 0.03;
                }
            });
        },
    },
    ['-tx']: {
        desc: '运行测试用例，可指定筛选名称，如 -tx TimerTests',
        func: (_hero, _steamid, ...args: string[]) => {
            if (!IsInToolsMode()) return;
            const filter = args[0];
            print(`\n[Test] Running${filter ? ` suites matching "${filter}"` : ' all suites'}…\n`);
            runAll(filter).then(result => {
                printResult(result);
            });
        },
    },
};

@reloadable
export class Debug {
    constructor() {
        ListenToGameEvent(`player_chat`, keys => this.OnPlayerChat(keys), this);
    }

    OnPlayerChat(keys: GameEventProvidedProperties & PlayerChatEvent): void {
        const strs = keys.text.split(' ');
        const cmd = strs[0].toLowerCase();
        const args = strs.slice(1);
        const steamid = PlayerResource.GetSteamAccountID(keys.playerid);
        const hero = HeroList.GetHero(0);

        if (DebugCallbacks[cmd]) {
            DebugCallbacks[cmd].func(hero, steamid, ...args);
        }
    }
}

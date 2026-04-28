import type { CommandEntry, DevCallback } from './types';
import type { EasingFunctionName } from '../../tween';
import { tween } from '../../tween';
import { runAll, printResult } from '../test_framework';

export const DevCommands: Record<string, CommandEntry<DevCallback>> = {
    ['-s']: {
        desc: '重载脚本',
        func: () => {
            SendToServerConsole('script_reload');
            print('script_reload! 重载脚本!');
        },
    },
    ['-r']: {
        desc: '重启游戏',
        func: () => {
            SendToServerConsole('restart');
            print('重启游戏!');
        },
    },
    ['-tween']: {
        desc: '测试Tween',
        func: (hero, ...args) => {
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
        func: (_hero, ...args) => {
            const filter = args[0];
            print(`\n[Test] Running${filter ? ` suites matching "${filter}"` : ' all suites'}…\n`);
            runAll(filter).then(result => {
                printResult(result);
            });
        },
    },
};

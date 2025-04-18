import { Debug } from './Debug';
import { GameConfig } from './GameConfig';
import { XNetTable } from './xnet-table';

export function ActivateModules() {
    // 初始化各个模块
    new XNetTable();
    new GameConfig();
    new Debug();
}

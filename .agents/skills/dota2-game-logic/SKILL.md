---
name: dota2-game-logic
description: DOTA2 自定义游戏服务端逻辑开发指南。触发词：游戏逻辑、服务端、server、game mode、游戏模式、GameRules、modifier、timer、lua、TSTL。Use when user asks to create or modify DOTA2 custom game server-side logic, game mode configuration, modules, game events, net tables, or data synchronization.
---

为 DOTA2 自定义游戏项目编写服务端游戏逻辑。

## 核心原则

1. **使用 TSTL 开发**：TypeScript 编写，通过 `tstl` 编译为 Lua 运行在 Dota 2 服务端
2. **严格使用 dota_ts_adapter**：所有技能/物品/modifier 必须通过 `@registerAbility()` / `@registerModifier()` 注册，继承 `BaseAbility` / `BaseItem` / `BaseModifier`
3. **前后端通信优先级**：前端 API 可获取的数据不给后端加 → Game Events → NetTable → XNetTable
4. **编译验证**：代码修改完成后，必须运行编译验证，确保无错误

## 文件结构

| 文件 | 路径 | 用途 |
|---|---|---|
| 服务端入口 | `game/scripts/src/addon_game_mode.ts` | 游戏模式初始化入口 |
| 客户端入口 | `game/scripts/src/addon_game_mode_client.ts` | 客户端逻辑入口 |
| 游戏模块 | `game/scripts/src/modules/` | 游戏功能模块（GameConfig、Debug 等） |
| 模块激活 | `game/scripts/src/modules/index.ts` | 模块激活入口（`ActivateModules()`） |
| 技能源码 | `game/scripts/src/abilities/<模块名>/` | 技能和物品的 TSTL 逻辑 |
| 独立 Modifier | `game/scripts/src/modifiers/<模块名>/` | 独立的机制性 modifier |
| 工具函数 | `game/scripts/src/utils/` | 通用工具库 |
| 事件类型 | `shared/gameevents.d.ts` | 前后端通信事件类型声明 |
| 网络表类型 | `shared/net_tables.d.ts` | CustomNetTable 类型声明 |
| X网络表类型 | `shared/x-net-table.d.ts` | XNetTable 类型声明 |
| 网络表注册 | `game/scripts/custom_net_tables.txt` | 注册 NetTable 表名（KV3 格式） |
| KV 配置 | `game/scripts/npc/` | NPC 键值对定义（技能/英雄/物品/单位） |
| 本地化 | `game/resource/addon.csv` | 文本本地化 |
| TSTL 配置 | `game/scripts/tsconfig.json` | TSTL 开发环境编译配置 |
| TSTL 生产配置 | `game/scripts/tsconfig.prod.json` | TSTL 生产环境编译配置（加密） |

## 工作流

### 步骤 1：确认需求

- 明确功能需求、涉及的模块、需要修改的文件
- 确定是否需要前后端通信（Game Events 或 Net Table）
- 确定是否需要新建模块或修改现有模块

### 步骤 2：编写代码

- 模块代码放在 `game/scripts/src/modules/` 下
- 在 `modules/index.ts` 的 `ActivateModules()` 中激活新模块
- 如需通信，在 `shared/gameevents.d.ts` 声明事件类型

### 步骤 3：配置数据通信（如需要）

- Game Events：声明类型 → 后端发送/监听 → 前端接收/发送
- NetTable：注册表名 → 声明类型 → 后端写入 → 前端读取
- XNetTable：仅用于大数据量场景

### 步骤 4：编译验证（必须执行）

**完成代码编写后，必须运行编译命令验证没有错误：**

```bash
# 验证服务端 TSTL 编译
npx tstl --project game/scripts/tsconfig.json
```

- 如果编译成功（退出码 0），无错误输出，则验证通过
- 如果编译失败，根据错误信息修复代码后重新编译验证
- **必须确保编译通过后才能告知用户完成**

## 游戏模式入口

### addon_game_mode.ts

服务端入口文件，通过 `Object.assign(getfenv(), {...})` 将函数注册到 Dota 2 引擎：

```typescript
import 'utils/index';
import { ActivateModules } from './modules';
import Precache from './utils/precache';

Object.assign(getfenv(), {
    Activate: () => {
        ActivateModules();
    },
    Precache: Precache,
});
```

- `Activate()`：游戏模式激活时调用，初始化所有模块
- `Precache()`：预缓存资源

### 模块激活 (modules/index.ts)

```typescript
import { XNetTable } from '../utils/xnet-table';

declare global {
    interface CDOTAGameRules {
        XNetTable: XNetTable;
    }
}

export function ActivateModules() {
    GameRules.XNetTable = new XNetTable();
    new GameConfig();
    new Debug();
}
```

## 模块开发

### 新建模块

1. 在 `game/scripts/src/modules/` 创建 `<模块名>.ts`
2. 导出类并在 `modules/index.ts` 中激活

```typescript
// modules/MyModule.ts
import { reloadable } from '../utils/tstl-utils';

@reloadable
export class MyModule {
    constructor() {
        // 初始化逻辑
        ListenToGameEvent('entity_killed', event => this.OnEntityKilled(event), this);
    }

    OnEntityKilled(event: EntityKilledEvent): void {
        // 处理逻辑
    }
}
```

```typescript
// modules/index.ts - 添加激活
import { MyModule } from './MyModule';

export function ActivateModules() {
    // ...existing modules...
    new MyModule();
}
```

### GameConfig 常用配置

```typescript
export class GameConfig {
    constructor() {
        // 游戏设置
        GameRules.SetCustomGameSetupAutoLaunchDelay(3);
        GameRules.SetHeroSelectionTime(0);
        GameRules.SetPreGameTime(0);
        GameRules.SetStartingGold(0);
        GameRules.SetSameHeroSelectionEnabled(true);
        GameRules.SetHeroRespawnEnabled(false);

        // 游戏模式实体设置
        const game = GameRules.GetGameModeEntity();
        game.SetCustomGameForceHero('npc_dota_hero_phoenix');
        game.SetBuybackEnabled(false);
        game.SetDaynightCycleDisabled(true);

        // 队伍人数
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.GOODGUYS, 3);
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.BADGUYS, 3);
    }
}
```

## dota_ts_adapter 核心

### 装饰器与基类

| 装饰器/基类 | 用途 |
|---|---|
| `@registerAbility()` | 注册技能/物品类，类名即为注册名 |
| `@registerModifier()` | 注册 modifier 类，类名即为注册名，自动调用 `LinkLuaModifier` |
| `BaseAbility` | 技能基类，`super.*` 可调用原生 `CDOTA_Ability_Lua` 方法 |
| `BaseItem` | 物品基类，`super.*` 可调用原生 `CDOTA_Item_Lua` 方法 |
| `BaseModifier` | modifier 基类，提供 `apply`/`find_on`/`remove` 静态方法 |
| `BaseModifierMotionHorizontal` | 水平运动 modifier 基类 |
| `BaseModifierMotionVertical` | 垂直运动 modifier 基类 |
| `BaseModifierMotionBoth` | 双向运动 modifier 基类 |

### Modifier 静态方法（类型安全）

```typescript
// 施加 modifier（参数类型与 OnCreated 参数自动关联）
const mod = MyModifier.apply(target, caster, ability, { duration: 5 });

// 查找 modifier
const existing = MyModifier.find_on(target);

// 移除 modifier
MyModifier.remove(target);
```

### @reloadable 装饰器

标记支持热重载的类，在 Debug 模式下 `-s` 指令可重载脚本：

```typescript
import { reloadable } from '../utils/tstl-utils';

@reloadable
export class MyModule { /* ... */ }
```

## 前后端通信

### Game Events

**声明**（`shared/gameevents.d.ts`）：

```typescript
declare interface CustomGameEventDeclarations {
    c2s_player_action: { action_type: number; target_entity: number };
    s2c_sync_data: { data_key: string; data_value: number };
}
```

**后端发送**：

```typescript
// 发送给所有客户端
CustomGameEventManager.Send_ServerToAllClients('s2c_sync_data', {
    data_key: 'score',
    data_value: 100,
});

// 发送给指定玩家
CustomGameEventManager.Send_ServerToPlayer(playerID, 's2c_sync_data', {
    data_key: 'score',
    data_value: 100,
});
```

**后端监听**：

```typescript
// 监听前端事件
CustomGameEventManager.RegisterListener('c2s_player_action', (userID, event) => {
    const playerID = userID as PlayerID;
    // 处理逻辑
});
```

### CustomNetTable

**1. 注册表名**（`game/scripts/custom_net_tables.txt`）：

```
<!-- kv3 encoding:text:version{e21c7f3c-8a33-41c5-9977-a76d3a32aa0d} format:generic:version{7412167c-06e9-4698-aff2-e63eb59037e7} -->
{
    custom_net_tables = 
    [
        "hero_list",
        "game_timer",
        "my_table"
    ]
}
```

**2. 声明类型**（`shared/net_tables.d.ts`）：

```typescript
declare interface CustomNetTableDeclarations {
    my_table: {
        my_key: {
            value: number;
            name: string;
        };
    };
}
```

**3. 后端写入**：

```typescript
CustomNetTables.SetTableValue('my_table', 'my_key', {
    value: 42,
    name: 'hello',
});
```

**限制**：每个表不超过 2MB，超过请使用 XNetTable。

### XNetTable

大数据量场景使用，通过 Game Events 分片传输。访问 `GameRules.XNetTable`：

```typescript
// 写入
GameRules.XNetTable.Set('large_table', 'some_key', data);

// 需要在 shared/x-net-table.d.ts 声明类型
```

## 常用 API

### 游戏规则

| API | 用途 |
|---|---|
| `GameRules.GetGameTime()` | 获取游戏时间 |
| `GameRules.GetGameModeEntity()` | 获取游戏模式实体 |
| `GameRules.SetCustomGameTeamMaxPlayers(team, count)` | 设置队伍人数上限 |
| `GameRules.IsDaytime()` | 是否白天 |
| `GameRules.SetHeroSelectionTime(seconds)` | 选英雄时间 |
| `GameRules.SetPreGameTime(seconds)` | 准备时间 |
| `GameRules.SetStartingGold(gold)` | 初始金钱 |

### 单位操作

| API | 用途 |
|---|---|
| `CreateUnitByName(name, origin, findClear, owner, playerOwner)` | 创建单位 |
| `unit.Kill(ability, attacker)` | 杀死单位 |
| `unit.RemoveSelf()` | 移除单位 |
| `unit.AddAbility(name)` | 添加技能 |
| `unit.FindAbilityByName(name)` | 查找技能 |
| `unit.AddNewModifier(caster, ability, name, kv)` | 添加 modifier |
| `unit.GetAbsOrigin()` | 获取位置 |
| `unit.SetAbsOrigin(vec)` | 设置位置 |
| `unit.GetHealth()` / `unit.SetHealth(v)` | 生命值 |
| `unit.GetTeamNumber()` | 获取队伍 |
| `unit.IsAlive()` | 是否存活 |

### 粒子与音效

| API | 用途 |
|---|---|
| `ParticleManager.CreateParticle(path, attach, unit)` | 创建粒子 |
| `ParticleManager.SetParticleControl(particle, cp, vec)` | 设置控制点 |
| `ParticleManager.ReleaseParticleIndex(particle)` | 释放粒子 |
| `EmitSoundOn(soundName, unit)` | 在单位上播放音效 |
| `EmitGlobalSound(soundName)` | 全局播放音效 |
| `StopSoundOn(soundName, unit)` | 停止音效 |

### 定时器

```typescript
// 延迟执行
Timers.CreateTimer(delay, () => {
    // 回调
});

// 循环执行（返回间隔秒数继续循环，返回 null 停止）
Timers.CreateTimer(() => {
    // 每帧执行
    return 0.03;
});

// 使用 timer_utils
import { registerTimerFunction } from '../utils/timer_utils';
```

### 向量操作

```typescript
const pos = unit.GetAbsOrigin();
const direction = (target.GetAbsOrigin() - pos as Vector).Normalized();
const distance = (target.GetAbsOrigin() - pos as Vector).Length();
const newPos = pos + direction * 100 as Vector;
```

## 调试

### 聊天指令（工具模式自动启用）

| 指令 | 说明 |
|---|---|
| `-help` | 显示所有测试指令 |
| `-s` | 重载脚本（`script_reload`） |
| `-r` | 重启游戏 |
| `-debug` | 切换调试模式（线上需白名单） |
| `-testx [filter]` | 运行测试用例 |

### 控制台输出

```typescript
print('debug message'); // 服务端控制台输出
Say(hero, 'message', true); // 在游戏中显示消息
```

## 编译验证（必须）

**代码编写完成后，必须执行以下命令验证编译无错误：**

```bash
# 编译服务端 TSTL（非 watch 模式，仅编译一次检查错误）
npx tstl --project game/scripts/tsconfig.json
```

- 编译成功：退出码 0，无错误输出
- 编译失败：输出错误信息（文件名、行号、错误描述），修复后重新编译
- **必须确保编译通过后才能认为任务完成**

如果同时修改了前端代码，还需要验证前端编译：

```bash
# 编译前端 Panorama（非 watch 模式）
npx webpack --config content/panorama/webpack.dev.js
```

### 完整验证命令

```bash
# 同时验证服务端 + 前端
npx tstl --project game/scripts/tsconfig.json && npx webpack --config content/panorama/webpack.dev.js
```

## 常见陷阱

1. **忘记注册 modifier**：使用 `@registerModifier()` 装饰器，否则 `LinkLuaModifier` 不会被调用
2. **modifier 放错位置**：技能/物品自己的 modifier 放在同一文件，独立机制性的才放 `src/modifiers/`
3. **NetTable 未注册**：新表名必须加到 `custom_net_tables.txt`
4. **事件类型未声明**：自定义事件必须在 `shared/gameevents.d.ts` 声明，否则前后端类型不一致
5. **KV 文件未引用**：新建的 KV 文件必须在对应的入口文件中 `#base` 引用
6. **ScriptFile 路径错误**：KV 中的 `ScriptFile` 指向编译后的 `.lua` 文件路径（如 `abilities/module/ability.lua`）
7. **print vs Say**：`print()` 只在服务端控制台输出，`Say()` 在游戏内显示
8. **Vector 运算**：向量运算结果需要 `as Vector` 类型断言
9. **编译后才能测试**：TSTL 代码修改后需要编译才能在游戏中生效，开发模式用 `npm run dev` 自动编译
10. **shared/ 类型声明**：`shared/` 目录的修改会同时影响前后端编译，确保声明正确

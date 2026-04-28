---
name: dota2-ability
description: Dota 2 自定义技能编写指南。触发词：技能、ability、spell、被动、主动。
---

为 DOTA2 自定义游戏项目编写 Dota 2 自定义技能。

## 核心原则

1. **配置与代码分离**：所有可能与前端共享或需要集中管理的配置、数值、常量（包括但不限于技能属性、施法参数、伤害值、持续时间等），都必须放在 `game/scripts/npc/` 下的 KV 文件的 `AbilityValues` 中。通过 `this.GetSpecialValueFor('键名')` 在 TSTL 中读取，禁止在代码中硬编码任何可能变化的配置值。修改配置后需运行 `npx gulp kv_2_js` 刷新 JSON，保证前后端数据一致

## 文件结构

| 文件 | 路径 | 用途 |
|---|---|---|
| 技能源码 | `game/scripts/src/abilities/<模块名>/<技能名>.ts` | TSTL 技能逻辑 |
| 修饰器源码 | `game/scripts/src/modifiers/<模块名>/<modifier名>.ts` | TSTL modifier 逻辑（仅用于独立的机制性 modifier） |
| KV 配置 | `game/scripts/npc/abilities/<技能名>.txt` | 技能 KV 键值对（AI创建的自定义技能） |
| KV 入口 | `game/scripts/npc/npc_abilities_custom.txt` | 引用 `#base "abilities.txt"`，自动生成部分由 Excel 管理 |
| Excel 数据 | `excels/技能表.xlsx` | 自动生成 `abilities.txt`（请勿手动修改） |
| 本地化 | `game/resource/addon.csv` | 技能名称、描述、数值标签 |

## 工作流

### 步骤 1：确认技能需求

- 明确技能名称、行为类型（被动/主动/切换/持续施法等）、施法方式、伤害类型
- 确认技能是否需要自定义 modifier

### 步骤 2：编写 KV 配置

在 `game/scripts/npc/abilities/<技能名>.txt` 中创建 KV 文件
如果这是一个写在 npc/abilities.txt 的文件，不要手动修改，告知用户需要到 `excels/技能表.xlsx` 中修改内容。

KV 文件必须在 `npc_abilities_custom.txt` 中通过 `#base` 引用后生效。

**KV 结构规则**：技能名称必须在第一级，所有属性写在第二级的 `{}` 内：
```kv
"dbg_card_heal"
{
    "BaseClass"                     "ability_lua"
    "ScriptFile"                    "abilities/dbg/card_heal"
    "AbilityBehavior"               "DOTA_ABILITY_BEHAVIOR_NO_TARGET | DOTA_ABILITY_BEHAVIOR_IMMEDIATE"
    "AbilityCastPoint"              "0.2"
    "AbilityCooldown"               "0.0"
    "AbilityManaCost"               "0"
    "MaxLevel"                      "1"
}
```

### 步骤 2b：编译 KV 到 JSON（必须执行）

修改 KV 文件后，必须运行以下命令将 KV 编译为 JSON，供前后端统一引用：

```bash
# 编译所有 KV 文件为 JSON
npx gulp kv_2_js
# 或快捷命令（同时执行 sheet→kv 和 kv→js）
npx gulp jssync
```

编译后输出到：
- `content/panorama/src/json/` — 前端 Panorama 使用
- `game/scripts/src/json/` — 后端 TSTL 使用

**前后端数据分离原则**：
- 所有游戏数值配置（伤害、CD、范围、速度等）写在 KV 文件中
- 前后端都从编译后的 JSON 文件中读取同一份数据
- 禁止在前端或后端代码中硬编码数值常量，避免数据不一致

### 步骤 3：编写 TSTL 源码

在 `game/scripts/src/abilities/<模块名>/<技能名>.ts` 中：

1. 从 `dota_ts_adapter` 导入 `BaseAbility`、`BaseModifier`、`registerAbility`、`registerModifier`
2. 用 `@registerAbility()` 装饰器注册技能类，继承 `BaseAbility`
3. 如需 modifier，用 `@registerModifier()` 装饰器注册，继承 `BaseModifier` 或其运动变体
   - **重要**：如果 modifier 是技能自己的（被该技能引用），直接放在技能同一个 `.ts` 文件中，不需要单独建文件
   - 只有独立的、机制性的 modifier（不被任何技能引用，如通用抛物线运动、通用buff等）才需要单独放在 `src/modifiers/` 目录下
4. 重写必要的生命周期方法（`OnSpellStart`、`OnCreated`、`DeclareFunctions` 等）
5. 通过 `this.GetSpecialValueFor('键名')` 读取 KV 中的 `AbilityValues`
6. 如有粒子特效/音效，重写 `Precache(context)` 方法
7. 如果是制作被动技能或者被动物品，使用 GetIntrinsicModifierName 方法获取 modifier 名称。

### 步骤 4：添加本地化

在 `game/resource/addon.csv` 中添加：
- `DOTA_Tooltip_ability_<技能名>` → 技能显示名
- `DOTA_Tooltip_ability_<技能名>_Description` → 技能描述
- `DOTA_Tooltip_ability_<技能名>_<AbilityValues键名>` → 数值标签

### 步骤 5：验证

- 编译 TSTL，确认无类型错误
- 告知用户进入游戏测试技能行为

## KV 键值参考

### 通用键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `BaseClass` | 基类 | `ability_lua` / `ability_datadriven` / 原版技能名 |
| `AbilityBehavior` | 技能行为（可用 `\|` 组合） | `DOTA_ABILITY_BEHAVIOR_POINT \| DOTA_ABILITY_BEHAVIOR_AOE` |
| `AbilityType` | 技能类型 | `DOTA_ABILITY_TYPE_BASIC` / `DOTA_ABILITY_TYPE_ULTIMATE` |
| `AbilityTextureName` | 技能图标 | `crystal_maiden_crystal_nova` |
| `MaxLevel` | 最大等级 | `4` |
| `AbilityCastAnimation` | 施法动画 | `ACT_DOTA_CAST_ABILITY_1` |
| `IsBreakable` | 可被破被动 | `1` |
| `ScriptFile` | 脚本文件路径（TSTL 编译后的 lua） | `abilities/<模块名>/crystal_nova_x.lua` |

### 施法键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `AbilityCastRange` | 施法距离（支持多级，空格分隔） | `700` / `600 700 800 900` |
| `AbilityCastPoint` | 施法前摇 | `0.3` |
| `AbilityCooldown` | 冷却（支持多级） | `12 12 12 12` |
| `AbilityManaCost` | 魔法消耗（支持多级） | `100 120 140 160` |
| `AbilityChannelTime` | 持续施法时间 | `3` |
| `AbilityDuration` | 持续时间（支持多级） | `5 6 7 8` |

### 目标选择键

| 键名 | 说明 | 可选值 |
|---|---|---|
| `AbilityUnitTargetTeam` | 目标队伍 | `DOTA_UNIT_TARGET_TEAM_ENEMY` / `DOTA_UNIT_TARGET_TEAM_FRIENDLY` / `DOTA_UNIT_TARGET_TEAM_BOTH` |
| `AbilityUnitTargetType` | 目标类型 | `DOTA_UNIT_TARGET_HERO` / `DOTA_UNIT_TARGET_BASIC` / `DOTA_UNIT_TARGET_BUILDING` / `DOTA_UNIT_TARGET_TREE`（可 `\|` 组合） |
| `AbilityUnitTargetFlags` | 目标标志 | `DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES` / `DOTA_UNIT_TARGET_FLAG_NOT_MAGIC_IMMUNE_ALLIES` 等 |
| `AbilityUnitDamageType` | 伤害类型 | `DAMAGE_TYPE_MAGICAL` / `DAMAGE_TYPE_PHYSICAL` / `DAMAGE_TYPE_PURE` |
| `AbilityUnitMotionControllerPriority` | 运动控制器优先级 | `LOWEST` / `LOW` / `MEDIUM` / `HIGH` / `HIGHEST` |

### 其他键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `AbilityModifierSupportBonus` | 修饰器支持加成 | `100` |
| `AbilityProcsMagicStick` | 充能魔棒 | `1` |
| `AbilityCharges` | 充能次数 | `3` |
| `AbilityChargeRestoreTime` | 充能恢复时间 | `30` |
| `AbilityCastRangeIsBuffered` | 施法距离缓冲 | `1` |
| `IsHiddenOnHero` | 英雄上隐藏 | `1` |
| `IsGrantedByScepter` | A杖升级 | `1` |
| `IsGrantedByShard` | 魔晶升级 | `1` |
| `ScepterUpgradeRule` | A杖升级规则 | `SCEPTER_UPGRADE_RULE_BASE` |
| `SpellDispellableType` | 驱散类型 | `SPELL_DISPELLABLE_YES` / `SPELL_DISPELLABLE_NO` / `SPELL_DISPELLABLE_YES_STRONG` |
| `SpellImmunityType` | 免疫类型 | `SPELL_IMMUNITY_ENEMIES_YES` / `SPELL_IMMUNITY_ENEMIES_NO` / `SPELL_IMMUNITY_ALLIES_YES` / `SPELL_IMMUNITY_ALLIES_NO` |
| `FightRecapLevel` | 战斗回放等级 | `1` / `2` |
| `HasSharedCooldown` | 共享冷却 | `1` |
| `SharedCooldownName` | 共享冷却名 | `arcane_boots` |
| `ConjureEffectName` | 召唤特效 | `particles/...` |

### AbilityValues

自定义数值变量，在 TSTL 中通过 `this.GetSpecialValueFor('键名')` 读取：

```kv
"AbilityValues"
{
    "duration" "4.5"
    "aoe_radius" "400"
    "movespeed_slow" "-20 -30 -40 -50"
}
```

新版也支持对象格式：

```kv
"AbilityValues"
{
    "radius"
    {
        "value" "400 500 600 700"
    }
}
```

### Precache

预缓存资源：

```kv
"Precache"
{
    "particle" "particles/units/heroes/hero_axe/axe_counterhelix_ad.vpcf"
    "soundfile" "soundevents/game_sounds_heroes/game_sounds_axe.vsndevts"
    "model" "models/heroes/axe/axe.vmdl"
}
```

### AbilityBehavior 常量

| 常量 | 说明 |
|---|---|
| `DOTA_ABILITY_BEHAVIOR_HIDDEN` | 隐藏技能 |
| `DOTA_ABILITY_BEHAVIOR_PASSIVE` | 被动技能 |
| `DOTA_ABILITY_BEHAVIOR_NO_TARGET` | 无目标技能 |
| `DOTA_ABILITY_BEHAVIOR_UNIT_TARGET` | 单位目标技能 |
| `DOTA_ABILITY_BEHAVIOR_POINT` | 点目标技能 |
| `DOTA_ABILITY_BEHAVIOR_AOE` | 范围技能 |
| `DOTA_ABILITY_BEHAVIOR_NOT_LEARNABLE` | 不可学习 |
| `DOTA_ABILITY_BEHAVIOR_CHANNELLED` | 持续施法 |
| `DOTA_ABILITY_BEHAVIOR_ITEM` | 物品技能 |
| `DOTA_ABILITY_BEHAVIOR_TOGGLE` | 切换技能 |
| `DOTA_ABILITY_BEHAVIOR_DIRECTIONAL` | 方向性技能 |
| `DOTA_ABILITY_BEHAVIOR_IMMEDIATE` | 立即释放 |
| `DOTA_ABILITY_BEHAVIOR_AUTOCAST` | 自动施法 |
| `DOTA_ABILITY_BEHAVIOR_NOASSIST` | 无辅助网格 |
| `DOTA_ABILITY_BEHAVIOR_AURA` | 光环 |
| `DOTA_ABILITY_BEHAVIOR_ATTACK` | 法球/攻击 modifier |
| `DOTA_ABILITY_BEHAVIOR_DONT_RESUME_MOVEMENT` | 施法后不恢复移动 |
| `DOTA_ABILITY_BEHAVIOR_ROOT_DISABLES` | 定身时禁用 |
| `DOTA_ABILITY_BEHAVIOR_UNRESTRICTED` | 不受限制 |
| `DOTA_ABILITY_BEHAVIOR_IGNORE_PSEUDO_QUEUE` | 忽略伪队列 |
| `DOTA_ABILITY_BEHAVIOR_IGNORE_CHANNEL` | 忽略持续施法 |
| `DOTA_ABILITY_BEHAVIOR_DONT_CANCEL_MOVEMENT` | 不取消移动 |
| `DOTA_ABILITY_BEHAVIOR_DONT_ALERT_TARGET` | 不惊醒目标 |
| `DOTA_ABILITY_BEHAVIOR_DONT_RESUME_ATTACK` | 施法后不恢复攻击 |
| `DOTA_ABILITY_BEHAVIOR_NORMAL_WHEN_STOLEN` | 被偷取时变为基础技能 |
| `DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING` | 忽略后摇 |
| `DOTA_ABILITY_BEHAVIOR_RUNE_TARGET` | 符文目标 |

## TSTL 编程参考

### 装饰器与基类

| 装饰器/基类 | 用途 |
|---|---|
| `@registerAbility()` | 注册技能类 |
| `BaseAbility` | 技能基类，对应 `CDOTA_Ability_Lua` |
| `@registerModifier()` | 注册修饰器类 |
| `BaseModifier` | 修饰器基类，对应 `CDOTA_Modifier_Lua` |
| `BaseModifierMotionHorizontal` | 水平运动修饰器 |
| `BaseModifierMotionVertical` | 垂直运动修饰器 |
| `BaseModifierMotionBoth` | 双向运动修饰器 |

### 技能常用方法

| 方法 | 用途 |
|---|---|
| `OnSpellStart()` | 施法开始 |
| `OnAbilityPhaseStart()` | 施法前摇阶段（返回 bool） |
| `OnAbilityPhaseEnd()` | 施法前摇结束 |
| `OnChannelFinish(bInterrupted)` | 持续施法结束 |
| `GetBehavior()` | 获取行为类型 |
| `GetAOERadius()` | 获取 AOE 半径 |
| `GetIntrinsicModifierName()` | 获取内置 modifier 名（被动技能用） |
| `GetSpecialValueFor(key)` | 读取 AbilityValues 中的值 |
| `Precache(context)` | 预缓存资源 |
| `GetCastRange()` | 获取施法范围 |
| `GetCooldown(level)` | 获取冷却 |
| `GetManaCost(level)` | 获取魔法消耗 |

### Modifier 常用方法

| 方法 | 用途 |
|---|---|
| `OnCreated(kv)` | modifier 创建时 |
| `OnRefresh(kv)` | modifier 刷新时 |
| `OnDestroy()` | modifier 销毁时 |
| `DeclareFunctions()` | 声明修饰器函数 |
| `IsHidden()` | 是否隐藏 |
| `IsDebuff()` | 是否减益 |
| `IsPurgable()` | 是否可驱散 |
| `IsStunDebuff()` | 是否眩晕减益 |
| `GetOverrideAnimation()` | 覆盖动画 |
| `CheckState()` | 返回状态表 |

### Modifier 静态方法

| 方法 | 用途 |
|---|---|
| `ModifierClass.apply(target, caster, ability, kv)` | 施加 modifier |
| `ModifierClass.find_on(target)` | 查找 modifier |
| `ModifierClass.remove(target)` | 移除 modifier |

### Modifier 事件（DeclareFunctions 返回值）

| 事件常量 | 说明 |
|---|---|
| `ModifierFunction.ON_ATTACK_LANDED` | 攻击命中时 |
| `ModifierFunction.ON_ATTACK_START` | 攻击开始时 |
| `ModifierFunction.ON_ATTACKED` | 被攻击时 |
| `ModifierFunction.ON_TAKEDAMAGE` | 受到伤害时 |
| `ModifierFunction.ON_DEATH` | 死亡时 |
| `ModifierFunction.ON_ABILITY_EXECUTED` | 施法完成时 |
| `ModifierFunction.ON_ABILITY_START` | 施法开始时 |
| `ModifierFunction.ON_BREAK_INVISIBILITY` | 打破隐身时 |
| `ModifierFunction.ON_RESPAWN` | 复活时 |
| `ModifierFunction.ON_UNIT_MOVED` | 单位移动时 |
| `ModifierFunction.ON_HEALTH_GAINED` | 获得生命时 |
| `ModifierFunction.ON_MANA_GAINED` | 获得魔法时 |
| `ModifierFunction.ON_SPENT_MANA` | 消耗魔法时 |
| `ModifierFunction.ON_TELEPORTING` | 传送中 |
| `ModifierFunction.ON_TELEPORTED` | 传送完成 |

### Modifier 属性函数（DeclareFunctions 返回值）

| 属性常量 | 说明 |
|---|---|
| `ModifierFunction.PREATTACK_BONUS_DAMAGE` | 额外攻击力 |
| `ModifierFunction.ATTACKSPEED_BONUS_CONSTANT` | 攻击速度加成 |
| `ModifierFunction.MOVESPEED_BONUS_CONSTANT` | 移速加成 |
| `ModifierFunction.MOVESPEED_BONUS_PERCENTAGE` | 移速百分比加成 |
| `ModifierFunction.PHYSICAL_ARMOR_BONUS` | 护甲加成 |
| `ModifierFunction.MAGICAL_RESISTANCE_BONUS` | 魔抗加成 |
| `ModifierFunction.STATS_STRENGTH_BONUS` | 力量加成 |
| `ModifierFunction.STATS_AGILITY_BONUS` | 敏捷加成 |
| `ModifierFunction.STATS_INTELLECT_BONUS` | 智力加成 |
| `ModifierFunction.HEALTH_BONUS` | 生命加成 |
| `ModifierFunction.MANA_BONUS` | 魔法加成 |
| `ModifierFunction.HEALTH_REGEN_CONSTANT` | 生命回复 |
| `ModifierFunction.MANA_REGEN_CONSTANT` | 魔法回复 |
| `ModifierFunction.PREATTACK_CRITICALSTRIKE` | 暴击 |
| `ModifierFunction.PROCATTACK_BONUS_DAMAGE_PHYSICAL` | 物理额外伤害 |
| `ModifierFunction.PROCATTACK_BONUS_DAMAGE_MAGICAL` | 魔法额外伤害 |
| `ModifierFunction.PROCATTACK_BONUS_DAMAGE_PURE` | 纯粹额外伤害 |
| `ModifierFunction.EVASION_CONSTANT` | 闪避 |
| `ModifierFunction.STATUS_RESISTANCE_STACKING` | 状态抗性 |
| `ModifierFunction.SPELL_AMPLIFY_PERCENTAGE` | 法术增幅 |
| `ModifierFunction.SPELL_LIFESTEAL` | 法术吸血 |
| `ModifierFunction.HEALTH_REGEN_PERCENTAGE` | 百分比生命回复 |
| `ModifierFunction.TURN_RATE_PERCENTAGE` | 转身速率 |
| `ModifierFunction.RESPAWNTIME` | 重生时间 |
| `ModifierFunction.RESPAWNTIME_PERCENTAGE` | 重生时间百分比 |
| `ModifierFunction.COOLDOWN_PERCENTAGE` | 冷却缩减 |
| `ModifierFunction.MANA_COST_PERCENTAGE` | 魔耗增减 |
| `ModifierFunction.INCOMING_DAMAGE_PERCENTAGE` | 受到伤害百分比 |
| `ModifierFunction.TOTALDAMAGEOUTGOING_PERCENTAGE` | 造成伤害百分比 |
| `ModifierFunction.PERSISTENT_INVISIBILITY` | 持续隐身 |
| `ModifierFunction.REINCARNATION` | 重生（骷髅王） |

### Modifier 状态（CheckState 返回值）

| 状态常量 | 说明 |
|---|---|
| `ModifierState.STUNNED` | 眩晕 |
| `ModifierState.ROOTED` | 定身 |
| `ModifierState.SILENCED` | 沉默 |
| `ModifierState.DISARMED` | 缴械 |
| `ModifierState.INVULNERABLE` | 无敌 |
| `ModifierState.MAGIC_IMMUNE` | 魔法免疫 |
| `ModifierState.INVISIBLE` | 隐身 |
| `ModifierState.FLYING` | 飞行 |
| `ModifierState.FROZEN` | 冰冻 |
| `ModifierState.HEXED` | 妖术 |
| `ModifierState.MUTED` | 静默（物品不可用） |
| `ModifierState.OUT_OF_GAME` | 脱离游戏 |
| `ModifierState.UNSELECTABLE` | 不可选中 |
| `ModifierState.NOT_ON_MINIMAP` | 不在小地图 |
| `ModifierState.NOT_ON_MINIMAP_FOR_ENEMIES` | 敌方小地图不可见 |
| `ModifierState.NO_UNIT_COLLISION` | 无碰撞 |
| `ModifierState.ATTACK_IMMUNE` | 攻击免疫 |
| `ModifierState.BLIND` | 致盲 |
| `ModifierState.PASSIVES_DISABLED` | 被动禁用 |
| `ModifierState.NO_HEALTH_BAR` | 无血条 |
| `ModifierState.NO_TEAM_MOVE_TO` | 队友不可移动至 |
| `ModifierState.NO_TEAM_SELECT` | 队友不可选中 |
| `ModifierState.SPECIALLY_DENIABLE` | 可反补 |
| `ModifierState.COMMAND_RESTRICTED` | 指令受限 |
| `ModifierState.NIGHTMARED` | 噩梦 |
| `ModifierState.LOW_ATTACK_PRIORITY` | 低攻击优先级 |
| `ModifierState.PROVIDES_VISION` | 提供视野 |
| `ModifierState.BLOCK_DISABLED` | 格挡禁用 |
| `ModifierState.EVADE_DISABLED` | 闪避禁用 |
| `ModifierState.CANNOT_MISS` | 不可闪避 |
| `ModifierState.SOFT_DISARMED` | 软缴械 |

更多的API请查阅 node_modules/dota-lua-types 目录下的文件。

## 数据来源

- d2vpkr：`https://github.com/dotabuff/d2vpkr/tree/master/dota/scripts/npc`
- Valve Developer Wiki：`https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/Abilities_Data_Driven`
- ModDota：`https://moddota.com/abilities/ability-keyvalues`
- DOTA2 中文 Wiki：`https://www.dota2.com.cn/wiki/Dota_2_Workshop_Tools/Scripting/Abilities_Data_Driven.htm`

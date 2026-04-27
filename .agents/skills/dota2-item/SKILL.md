---
name: dota2-item
description: Dota 2 自定义物品编写指南。触发词：物品、item、装备、道具、配方、recipe、合成。
---

为 DOTA2 自定义游戏项目编写自定义物品。

## 文件结构

| 文件 | 路径 | 用途 |
|---|---|---|
| 物品 KV | `game/scripts/npc/items_list/<物品名>.txt` | 物品 KV 键值对（手动创建的自定义物品） |
| KV 入口 | `game/scripts/npc/npc_items_custom.txt` | 引用 `#base "items_list.txt"`，自动生成部分由 Excel 管理 |
| Excel 数据 | `excels/物品表.xlsx` | 自动生成 `items_list.txt`（请勿手动修改） |
| 物品源码 | `game/scripts/src/abilities/<模块名>/<物品名>.ts` | TSTL 物品逻辑（物品继承 `BaseItem`） |
| 本地化 | `game/resource/addon.csv` | 物品名称、描述、数值标签 |

## 工作流

### 步骤 1：确认物品需求

- 明确物品类型（被动/主动/切换/消耗品）
- 确认物品价格、商店标签、品质
- 确认物品是否可合成、是否需要配方
- 确认物品是否需要自定义 TSTL 逻辑

### 步骤 2：编写 KV 配置

在 `game/scripts/npc/items_list/<物品名>.txt` 中创建 KV 文件，或在 `excels/物品表.xlsx` 中添加行（由 Gulp 自动生成到 `items_list.txt`）。

KV 文件必须在 `npc_items_custom.txt` 中通过 `#base` 引用后生效。

物品名必须以 `item_` 开头。

### 步骤 3：编写 TSTL 源码（如需要）

如果物品有自定义行为（包括纯被动），在 `game/scripts/src/abilities/<模块名>/<物品名>.ts` 中：

1. 从 `dota_ts_adapter` 导入 `BaseItem`、`registerAbility`
2. 用 `@registerAbility()` 装饰器注册物品类，继承 `BaseItem`
3. 重写必要的生命周期方法（`OnSpellStart`、`OnChannelFinish` 等）
4. 通过 `this.GetSpecialValueFor('键名')` 读取 KV 中的 `AbilityValues`
5. 如果是制作被动技能或者被动物品，使用 GetIntrinsicModifierName 方法获取 modifier 名称，之后在被动modifier里面配置所有的属性或者被动触发的效果。
6. **Modifier 放置规则**：如果 modifier 是物品自己的（被该物品引用），直接放在物品同一个 `.ts` 文件中，不需要单独建文件；只有独立的、机制性的 modifier（不被任何技能/物品直接引用，如通用抛物线运动、通用buff，或者多个技能共用的modifier等）才需要单独放在 `src/modifiers/` 目录下

### 步骤 4：添加本地化

在 `game/resource/addon.csv` 中添加：
- `DOTA_Tooltip_ability_item_<物品名>` → 物品显示名
- `DOTA_Tooltip_ability_item_<物品名>_Description` → 物品描述
- `DOTA_Tooltip_ability_item_<物品名>_<AbilityValues键名>` → 数值标签

### 步骤 5：验证

- 编译 TSTL（如有自定义逻辑），确认无类型错误
- 进入游戏测试物品效果

## KV 键值参考

物品继承所有技能的 KV 键，此外还有物品专属键。

### 通用键（继承自技能）

| 键名 | 说明 | 示例值 |
|---|---|---|
| `BaseClass` | 基类 | `item_lua` |
| `AbilityBehavior` | 行为类型 | `DOTA_ABILITY_BEHAVIOR_PASSIVE` / `DOTA_ABILITY_BEHAVIOR_NO_TARGET \| DOTA_ABILITY_BEHAVIOR_ITEM` |
| `AbilityTextureName` | 图标名称 | `item_magic_wand` |
| `MaxLevel` | 最大等级 | `1` / `3` |
| `AbilityCooldown` | 冷却 | `12` |
| `AbilityManaCost` | 魔法消耗 | `100` |
| `AbilityCastRange` | 施法距离 | `600` |
| `AbilityCastPoint` | 施法前摇 | `0.0` |
| `AbilityUnitTargetTeam` | 目标队伍 | `DOTA_UNIT_TARGET_TEAM_ENEMY` |
| `AbilityUnitTargetType` | 目标类型 | `DOTA_UNIT_TARGET_HERO \| DOTA_UNIT_TARGET_BASIC` |
| `AbilityUnitDamageType` | 伤害类型 | `DAMAGE_TYPE_MAGICAL` |
| `ScriptFile` | 脚本路径 | `abilities/<模块名>/item_custom.lua` |
| `AbilityValues` | 自定义数值 | （子键） |
| `Precache` | 预缓存 | （子键：`particle`、`soundfile`、`model`） |

### 物品基础键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `ItemCost` | 物品价格 | `2150` |
| `ItemShopTags` | 商店标签 | `damage;attack_speed` |
| `ItemQuality` | 物品品质 | `component` / `common` / `rare` / `epic` / `secret_shop` / `consumable` |
| `ItemAliases` | 别名 | `tp;town portal scroll;teleport` |
| `ID` | 唯一 ID | `3003` |

### 物品属性键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `ItemStackable` | 是否可堆叠 | `1` |
| `ItemInitialCharges` | 初始充能数 | `1` |
| `ItemRequiresCharges` | 需要充能 | `1` |
| `ItemDisplayCharges` | 显示充能数 | `1` |
| `ItemPermanent` | 永久物品 | `0` |
| `ItemShareability` | 共享性 | `ITEM_FULLY_SHAREABLE` / `ITEM_PARTIALLY_SHAREABLE` / `ITEM_NOT_SHAREABLE` |
| `ItemDeclares` | 物品声明 | `DECLARE_USAGE_BOT` |
| `ItemCanBeDisassembled` | 可拆分 | `1` |
| `ItemCanBeSoldByPlayer` | 玩家可出售 | `0` |

### 物品商店键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `SecretShop` | 秘密商店 | `1` |
| `SideShop` | 边路商店 | `1` |
| `IsObsolete` | 是否过时 | `1` |
| `SuggestPregame` | 建议出门装 | `1` |
| `SuggestEarlygame` | 建议前期装 | `1` |
| `SuggestLategame` | 建议后期装 | `1` |

### 物品合成键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `ItemRecipe` | 是否为配方 | `1` |
| `ItemResult` | 合成结果 | `item_bfury` |
| `ItemRequirements` | 合成需求 | `"01" "item_broadsword;item_mithril_hammer"` |
| `UpgradesItems` | 升级物品 | `item_boots` |
| `UpgradeRecipe` | 升级配方 | `1` |
| `MaxUpgradeLevel` | 最大升级等级 | `3` |
| `SubAbilityNames` | 子技能名称 | `ability1;ability2` |
| `ReplaceAbility` | 替换技能 | `ability_name` |

### 物品特效与声音键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `Model` | 模型路径 | `models/props_gameplay/quelling_blade.vmdl` |
| `Effect` | 效果 | `particles/...` |
| `UIDropSound` | 丢弃声音 | `Item.Drop` |
| `UIPickupSound` | 拾取声音 | `Item.PickUp` |
| `WorldDropSound` | 世界丢弃声音 | `Item.WorldDrop` |
| `PingOverrideText` | Ping 覆盖文本 | `#DOTA_Ping_GG` |

### 物品限制键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `SpeciallyAllowedInNeutralSlot` | 允许放入中立物品栏 | `1` |
| `SpeciallyBannedFromNeutralSlot` | 禁止放入中立物品栏 | `1` |
| `ShouldNotSuggestMainGame` | 主模式不推荐 | `1` |
| `ShowDroppedItemTooltip` | 显示掉落提示 | `1` |
| `ShowGiveIndicatorOnTargetCast` | 显示给与指示 | `1` |
| `TokenTier` | 代币等级 | `1` / `2` / `3` / `4` / `5` |

### ItemShareability 常量

| 常量 | 说明 |
|---|---|
| `ITEM_FULLY_SHAREABLE` | 完全共享 |
| `ITEM_PARTIALLY_SHAREABLE` | 部分共享 |
| `ITEM_NOT_SHAREABLE` | 不可共享 |

### ItemQuality 常量

| 常量 | 说明 |
|---|---|
| `component` | 组件 |
| `common` | 普通 |
| `rare` | 稀有 |
| `epic` | 史诗 |
| `secret_shop` | 秘密商店 |
| `consumable` | 消耗品 |

## TSTL 编程参考

### 装饰器与基类

| 装饰器/基类 | 用途 |
|---|---|
| `@registerAbility()` | 注册物品类（物品也使用此装饰器） |
| `BaseItem` | 物品基类，所有的物品类都需要继承 |

### 物品常用方法

| 方法 | 用途 |
|---|---|
| `OnSpellStart()` | 使用物品时 |
| `OnAbilityPhaseStart()` | 使用前摇阶段（返回 bool） |
| `OnChannelFinish(bInterrupted)` | 持续施法结束 |
| `GetBehavior()` | 获取行为类型 |
| `GetSpecialValueFor(key)` | 读取 AbilityValues 中的值 |
| `Precache(context)` | 预缓存资源 |
| `GetCooldown(level)` | 获取冷却 |
| `GetManaCost(level)` | 获取魔法消耗 |
| `GetCurrentCharges()` | 获取当前充能数 |
| `SetCurrentCharges(charges)` | 设置充能数 |
| `GetCost()` | 获取物品价格 |
| `GetPurchaseTime()` | 获取购买时间 |
| `GetPurchaser()` | 获取购买者 |
| `IsCombineLocked()` | 是否锁定合成 |
| `SetCombineLocked(bLocked)` | 锁定/解锁合成 |

### 物品事件回调

| 方法 | 用途 |
|---|---|
| `OnItemEquipped(hUnit)` | 装备时 |
| `OnItemUnequipped(hUnit)` | 卸下时 |
| `OnItemPurchased()` | 购买时 |
| `OnItemSold()` | 出售时 |
| `OnItemSpawned()` | 物品生成时 |

---
name: dota2-unit
description: Dota 2 自定义单位编写指南。适用于编写/修改单位 KV 配置文件（`game/scripts/npc/custom_units/`）。触发词：单位、unit、creature、怪物、召唤物、建筑、塔、npc。
---

为 DOTA2 自定义游戏项目编写 Dota 2 自定义单位。

## 文件结构

| 文件 | 路径 | 用途 |
|---|---|---|
| 单位 KV | `game/scripts/npc/custom_units/<单位名>.txt` | 单位 KV 键值对（手动创建的自定义单位） |
| KV 入口 | `game/scripts/npc/npc_units_custom.txt` | 引用 `#base "custom_units.txt"`，自动生成部分由 Excel 管理 |
| Excel 数据 | `excels/单位表.xlsx` | 自动生成 `custom_units.txt`（请勿修改） |
| 单位逻辑 | `game/scripts/src/abilities/<模块名>/<关联技能>.ts` | 单位关联的技能逻辑（如召唤物技能），制作技能请使用 dota2-ability skill 的工作流 |
| 本地化 | `game/resource/addon.csv` | 单位名称 |

## 工作流

### 步骤 1：确认单位需求

- 明确单位类型（生物/召唤物/建筑/塔/辅助单位）
- 确认模型的来源路径
- 确认单位需要的技能、属性、攻击方式
- 确认单位是否需要自定义 TSTL 逻辑

### 步骤 2：编写 KV 配置

在 `game/scripts/npc/custom_units/<单位名>.txt` 中创建 KV 文件，或在 `excels/单位表.xlsx` 中添加行（由 Gulp 自动生成到 `custom_units.txt`）。

KV 文件必须在 `npc_units_custom.txt` 中通过 `#base` 引用后生效。

单位名必须以 `npc_dota_` 开头。

### 步骤 3：编写关联的技能逻辑（如需要）

如果单位拥有自定义技能，在 `game/scripts/src/abilities/<模块名>/` 中创建技能源码，按 dota2-ability skill 的工作流编写。

### 步骤 4：添加本地化

在 `game/resource/addon.csv` 中添加：
- `npc_dota_unit_<单位名>` → 单位显示名

### 步骤 5：验证

- 进入游戏测试单位属性、行为、技能

## KV 键值参考

### 通用键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `BaseClass` | 基类 | `npc_dota_creature` / `npc_dota_tower` / `npc_dota_creep_lane` / `npc_dota_building` |
| `Model` | 模型路径 | `models/heroes/earthshaker/earthshaker.vmdl` |
| `ModelScale` | 模型缩放 | `1.0` |
| `SoundSet` | 声音集 | `Hero_EarthShaker` / `Creep_Bad_Melee` / `Tower.Water` |
| `Level` | 等级 | `5` |
| `IsNeutralUnitType` | 是否中立单位 | `1` |
| `ConsideredHero` | 是否视为英雄 | `1` |
| `GameSoundsFile` | 游戏声音文件 | `soundevents/game_sounds_heroes/game_sounds_earthshaker.vsndevts` |
| `VoiceFile` | 语音文件 | `soundevents/voscripts/game_sounds_vo_earthshaker.vsndevts` |

### 碰撞与体积

| 键名 | 说明 | 示例值 |
|---|---|---|
| `BoundsHullName` | 碰撞体大小 | `DOTA_HULL_SIZE_HERO` / `DOTA_HULL_SIZE_SMALL` / `DOTA_HULL_SIZE_REGULAR` / `DOTA_HULL_SIZE_LARGE` |
| `RingRadius` | 环半径 | `70` |
| `HealthBarOffset` | 血条偏移 | `200` |

### 移动

| 键名 | 说明 | 示例值 |
|---|---|---|
| `MovementCapabilities` | 移动能力 | `DOTA_UNIT_CAP_MOVE_GROUND` / `DOTA_UNIT_CAP_MOVE_FLY` / `DOTA_UNIT_CAP_MOVE_NONE` |
| `MovementSpeed` | 移动速度 | `325` |
| `MovementTurnRate` | 转身速率 | `0.5` |
| `HasAggressiveStance` | 攻击姿态 | `0` |

### 技能

| 键名 | 说明 | 示例值 |
|---|---|---|
| `Ability1` | 技能槽 1 | `earthshaker_fissure` |
| `Ability2` | 技能槽 2 | `` |
| `Ability3` | 技能槽 3 | `` |
| `Ability4` | 技能槽 4 | `` |
| `Ability5` | 技能槽 5 | `` |
| `Ability6` | 技能槽 6（额外） | `` |
| `Ability7` | 技能槽 7（额外） | `` |
| `Ability8` | 技能槽 8（额外） | `` |

### 护甲与抗性

| 键名 | 说明 | 示例值 |
|---|---|---|
| `ArmorPhysical` | 物理护甲 | `5` |
| `MagicalResistance` | 魔法抗性 | `0` / `25` |

### 攻击

| 键名 | 说明 | 示例值 |
|---|---|---|
| `AttackCapabilities` | 攻击能力 | `DOTA_UNIT_CAP_MELEE_ATTACK` / `DOTA_UNIT_CAP_RANGED_ATTACK` / `DOTA_UNIT_CAP_NO_ATTACK` |
| `AttackDamageMin` | 最小攻击力 | `50` |
| `AttackDamageMax` | 最大攻击力 | `60` |
| `AttackDamageType` | 攻击伤害类型 | `DAMAGE_TYPE_ArmorPhysical` |
| `AttackRate` | 攻击速率 | `1.5` |
| `AttackAnimationPoint` | 攻击动画点 | `0.3` |
| `AttackAcquisitionRange` | 攻击获取范围 | `600` |
| `AttackRange` | 攻击范围 | `130` / `500` |
| `ProjectileModel` | 弹道模型 | `particles/base_attacks/ranged_badguy.vpcf` |
| `ProjectileSpeed` | 弹道速度 | `900` |

### 属性

| 键名 | 说明 | 示例值 |
|---|---|---|
| `AttributePrimary` | 主属性 | `DOTA_ATTRIBUTE_STRENGTH` / `DOTA_ATTRIBUTE_AGILITY` / `DOTA_ATTRIBUTE_INTELLECT` / `DOTA_ATTRIBUTE_ALL` |
| `AttributeBaseStrength` | 基础力量 | `21` |
| `AttributeStrengthGain` | 力量成长 | `1.6` |
| `AttributeBaseAgility` | 基础敏捷 | `24` |
| `AttributeAgilityGain` | 敏捷成长 | `2.8` |
| `AttributeBaseIntelligence` | 基础智力 | `12` |
| `AttributeIntelligenceGain` | 智力成长 | `1.8` |

### 状态

| 键名 | 说明 | 示例值 |
|---|---|---|
| `StatusHealth` | 基础生命值 | `500` |
| `StatusHealthRegen` | 生命回复 | `2` |
| `StatusMana` | 基础魔法值 | `100` |
| `StatusManaRegen` | 魔法回复 | `0.75` |
| `StatusStartingMana` | 初始魔法 | `0` |

### 赏金

| 键名 | 说明 | 示例值 |
|---|---|---|
| `BountyXP` | 经验赏金 | `22` |
| `BountyGoldMin` | 最小金钱赏金 | `19` |
| `BountyGoldMax` | 最大金钱赏金 | `25` |

### 视野

| 键名 | 说明 | 示例值 |
|---|---|---|
| `VisionDaytimeRange` | 白天视野 | `1800` |
| `VisionNighttimeRange` | 夜晚视野 | `800` |

### 队伍

| 键名 | 说明 | 示例值 |
|---|---|---|
| `TeamName` | 队伍 | `DOTA_TEAM_GOODGUYS` / `DOTA_TEAM_BADGUYS` / `DOTA_TEAM_NEUTRALS` |
| `CombatClassAttack` | 攻击战斗类 | `DOTA_COMBAT_CLASS_ATTACK_HERO` / `DOTA_COMBAT_CLASS_ATTACK_BASIC` |
| `CombatClassDefend` | 防御战斗类 | `DOTA_COMBAT_CLASS_DEFEND_HERO` / `DOTA_COMBAT_CLASS_DEFEND_BASIC` |
| `UnitRelationshipClass` | 单位关系类 | `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT` / `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_HERO` |

### 装饰与外观

| 键名 | 说明 | 示例值 |
|---|---|---|
| `HasInventory` | 是否有物品栏 | `1` |
| `Creature` | 生物配置 | （子键：`AttachWearables`、`DefaultState` 等） |
| `AttachWearables` | 装饰品 | （子键：`"1" { "ItemDef" "123" }`） |
| `particle_folder` | 粒子文件夹 | `particles/units/heroes/hero_earthshaker` |
| `skin` | 皮肤 | `0` |
| `wearable` | 装饰 | （子键） |
| `OverrideWearableClass` | 覆盖装饰类 | `dota_item_wearable` |

### 其他键

| 键名 | 说明 | 示例值 |
|---|---|---|
| `SelectionGroup` | 选择组 | `1` |
| `SelectOnSpawn` | 生成时选中 | `1` |
| `MinimapIcon` | 小地图图标 | `minimap_icon_tower` |
| `MinimapIconSize` | 小地图图标大小 | `1000` |
| `WakesNeutrals` | 唤醒中立生物 | `1` |
| `UnitLabel` | 单位标签 | `custom` |
| `UnitToAbilityMap` | 单位到技能映射 | （子键） |
| `ScaleSet` | 缩放集 | `0` |
| `PathfindingSearchDepthScale` | 寻路深度缩放 | `1` |
| `ProjectileCollisionSize` | 弹道碰撞大小 | `50` |
| `precache` | 预缓存 | （子键：`particle`、`soundfile`、`model`） |

### AttackCapabilities 常量

| 常量 | 说明 |
|---|---|
| `DOTA_UNIT_CAP_NO_ATTACK` | 无攻击能力 |
| `DOTA_UNIT_CAP_MELEE_ATTACK` | 近战攻击 |
| `DOTA_UNIT_CAP_RANGED_ATTACK` | 远程攻击 |

### MovementCapabilities 常量

| 常量 | 说明 |
|---|---|
| `DOTA_UNIT_CAP_MOVE_NONE` | 不可移动 |
| `DOTA_UNIT_CAP_MOVE_GROUND` | 地面移动 |
| `DOTA_UNIT_CAP_MOVE_FLY` | 飞行移动 |

### BoundsHullName 常量

| 常量 | 说明 |
|---|---|
| `DOTA_HULL_SIZE_SMALL` | 小碰撞体（小兵） |
| `DOTA_HULL_SIZE_REGULAR` | 普通碰撞体 |
| `DOTA_HULL_SIZE_HERO` | 英雄碰撞体 |
| `DOTA_HULL_SIZE_LARGE` | 大碰撞体 |
| `DOTA_HULL_SIZE_BUILDING` | 建筑碰撞体 |

### TeamName 常量

| 常量 | 说明 |
|---|---|
| `DOTA_TEAM_GOODGUYS` | 天辉 |
| `DOTA_TEAM_BADGUYS` | 夜魇 |
| `DOTA_TEAM_NEUTRALS` | 中立 |

### CombatClass 常量

| 常量 | 说明 |
|---|---|
| `DOTA_COMBAT_CLASS_ATTACK_HERO` | 英雄攻击 |
| `DOTA_COMBAT_CLASS_ATTACK_BASIC` | 基础攻击 |
| `DOTA_COMBAT_CLASS_ATTACK_PIERCE` | 穿透攻击 |
| `DOTA_COMBAT_CLASS_ATTACK_SIEGE` | 攻城攻击 |
| `DOTA_COMBAT_CLASS_DEFEND_HERO` | 英雄防御 |
| `DOTA_COMBAT_CLASS_DEFEND_BASIC` | 基础防御 |
| `DOTA_COMBAT_CLASS_DEFEND_SOFT` | 软甲防御 |
| `DOTA_COMBAT_CLASS_DEFEND_STRUCTURE` | 建筑防御 |

### UnitRelationshipClass 常量

| 常量 | 说明 |
|---|---|
| `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT` | 默认 |
| `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_HERO` | 英雄 |
| `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_BARRACKS` | 兵营 |
| `DOTA_NPC_UNIT_RELATIONSHIP_TYPE_BUILDING` | 建筑 |

## TSTL 编程

如果单位拥有自定义技能，技能逻辑按 dota2-ability skill 工作流编写。

单位可以拥有 vscript 文件，用于规定单位的行为，或者用于制作AI：
具体函数需要使用诸如： 
```
Object.assign(getfenv(), {
    Spawn: callback
});
```
这样的方式方法注册到单位的脚本文件中

### 单位创建 API

| API | 用途 |
|---|---|
| `CreateUnitByName(unitName, location, bFindClearSpace, hNpcOwner, hPlayerOwner)` | 创建单位 |
| `unit.Kill(hAbility, hAttacker)` | 杀死单位 |
| `unit.RemoveSelf()` | 移除单位 |
| `unit.SetTeam(teamNumber)` | 设置队伍 |
| `unit.SetOwner(hPlayer)` | 设置所有者 |
| `unit.SetControllableByPlayer(playerID, bControllable)` | 设置可控制 |
| `unit.AddAbility(abilityName)` | 添加技能 |
| `unit.RemoveAbility(abilityName)` | 移除技能 |
| `unit.SetHealth(value)` | 设置生命值 |
| `unit.SetMaxHealth(value)` | 设置最大生命值 |
| `unit.SetMana(value)` | 设置魔法值 |
| `unit.SetBaseMoveSpeed(speed)` | 设置移动速度 |
| `unit.SetAcquisitionRange(range)` | 设置攻击获取范围 |
| `unit.SetAttackCapability(capability)` | 设置攻击能力 |
| `unit.SetMoveCapability(capability)` | 设置移动能力 |
| `unit.AddNewModifier(caster, ability, modifierName, kv)` | 添加 modifier |

### 单位查询 API

| API | 用途 |
|---|---|
| `unit.GetTeamNumber()` | 获取队伍号 |
| `unit.GetOrigin()` | 获取位置 |
| `unit.GetAbsOrigin()` | 获取绝对位置 |
| `unit.GetHealth()` | 获取生命值 |
| `unit.GetMaxHealth()` | 获取最大生命值 |
| `unit.GetMana()` | 获取魔法值 |
| `unit.GetBaseMoveSpeed()` | 获取移动速度 |
| `unit.GetAttackDamage()` | 获取攻击力 |
| `unit.GetArmor()` | 获取护甲 |
| `unit.GetMagicalArmorValue()` | 获取魔抗 |
| `unit.IsAlive()` | 是否存活 |
| `unit.IsHero()` | 是否英雄 |
| `unit.IsCreature()` | 是否生物 |
| `unit.IsBuilding()` | 是否建筑 |
| `unit.IsAncient()` | 是否远古 |
| `unit.IsBoss()` | 是否 Boss |
| `unit.IsNeutralUnitType()` | 是否中立 |
| `unit.HasAbility(abilityName)` | 是否有技能 |
| `unit.FindAbilityByName(abilityName)` | 查找技能 |
| `unit.GetUnitName()` | 获取单位名 |
---
name: dota2-localization
description: 为 DOTA2自定义游戏 项目生成 Dota 2 本地化文本（addon.csv）。触发词：本地化、翻译、loc、i18n、addon.csv、文本、tooltip、多语言。Use when user asks to generate localization entries for abilities/units/items/modifiers, translate Chinese to English based on character width balance, or add entries to game/resource/addon.csv.
---

为 DOTA2自定义游戏 项目生成 Dota 2 本地化文本（`game/resource/addon.csv`）。

## 本地化规则

### CSV 格式

```csv
Tokens,English,SChinese
DOTA_Tooltip_ability_arcane_hawk_x,Arcane Hawk,奥法鹰隼
```

- `kv_generated.csv` 的列序是 `Tokens,SChinese,English`（注意区别）

### Token 命名规则

| 实体 | Token 模板 | 对应文件 |
|---|---|---|
| 技能名 | `DOTA_Tooltip_ability_<技能名>` | npc/abilities/ |
| 技能描述 | `DOTA_Tooltip_ability_<技能名>_Description` | |
| 技能数值标签 | `DOTA_Tooltip_ability_<技能名>_<AbilityValues键名>` | |
| 单位名 | `npc_dota_unit_<单位名>` | npc/custom_units/ |
| 英雄名 | `npc_dota_hero_<英雄名>` | npc/heroes.txt |
| 物品名 | `DOTA_Tooltip_ability_item_<物品名>` | npc/items_list/ |
| 物品描述 | `DOTA_Tooltip_ability_item_<物品名>_Description` | |
| 物品数值标签 | `DOTA_Tooltip_ability_item_<物品名>_<键名>` | |
| Modifier 名 | `DOTA_Tooltip_modifier_<修饰器名>` | src/modifiers/ |
| Modifier 描述 | `DOTA_Tooltip_modifier_<修饰器名>_Description` | |

### 本地化工作流

1. 用户提供中文文本（技能名称、描述、数值标签）
2. 计算中文文本的显示宽度：
   - 1 个 CJK 字符 ≈ 2 个拉丁字符的显示宽度
   - 例如 5 个中文字 → 英文长约 10 个字符
3. 生成对其他语言的翻译，确保在不同语言 UI 中显示宽度大致平衡
4. 写入 `game/resource/addon.csv`（遵循现有的 CSV 格式）

### 翻译准则

- **技能名称**：简短有力，1-5 个中文词 → 1-3 个英文词
- **技能描述**：根据中文长度控制英文长度，保持 UI tooltip 不溢出（中文 30-60 字 → 英文 60-120 字符）
- **数值标签**：保持简洁，关键词对齐，例如 `基础伤害` → `Base Damage`、`智力系数` → `Intelligence Multiplier`
- **单位名称**：保持与技能风格一致

### 示例

用户提供：技能名 `奥法鹰隼`，描述 `施放出缓慢移动的奥术鹰群，对敌方单位造成基于智力值的魔法伤害。`，AbilityValues 有 `base_damage`、`int_multiplier`、`projectile_speed`、`vision_radius`

生成：

```csv
DOTA_Tooltip_ability_arcane_hawk_x,Arcane Hawk,奥法鹰隼
DOTA_Tooltip_ability_arcane_hawk_x_Description,Releases slowly moving arcane hawks that damage enemy units based on intelligence.,施放出缓慢移动的奥术鹰群，对敌方单位造成基于智力值的魔法伤害。
DOTA_Tooltip_ability_arcane_hawk_x_base_damage,Base Damage,基础伤害
DOTA_Tooltip_ability_arcane_hawk_x_int_multiplier,Intelligence Multiplier,智力系数
DOTA_Tooltip_ability_arcane_hawk_x_projectile_speed,Projectile Speed,弹道速度
DOTA_Tooltip_ability_arcane_hawk_x_vision_radius, Vision Radius,视野范围
```

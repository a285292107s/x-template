# Dota 2 本地化 Token 命名参考

## 完整 Token 类型

### 技能 (Ability)

```
DOTA_Tooltip_ability_<技能名>                    → 技能名称（显示名）
DOTA_Tooltip_ability_<技能名>_Description         → 技能描述
DOTA_Tooltip_ability_<技能名>_<键名>               → AbilityValues 中数值的标签
DOTA_Tooltip_ability_<技能名>_<键名>_<等级下标>     → 特定等级的数值标签（0-based）
```

### Modifier (Buff/Debuff)

```
DOTA_Tooltip_modifier_<修饰器名>                   → Modifier 显示名
DOTA_Tooltip_modifier_<修饰器名>_Description        → Modifier 描述
```

### 物品 (Item)

物品使用与技能相同的 Token 结构，前缀为 `DOTA_Tooltip_ability_item_`：

```
DOTA_Tooltip_ability_item_<物品名>                → 物品名称（显示名）
DOTA_Tooltip_ability_item_<物品名>_Description     → 物品描述
DOTA_Tooltip_ability_item_<物品名>_<键名>          → AbilityValues 中数值的标签
```

### 英雄 (Hero)

```
<英雄名>                             → 英雄显示名
```

### 单位 (Unit)

```
<单位名>                             → 自定义单位显示名
```

## 中文宽度换算参考表

| 中文字数 | 英文建议长度 | 适用场景 |
|---------|-------------|---------|
| 1-2     | 2-4 字符 | 短标签（如"伤害"→"Damage"、"范围"→"Radius"） |
| 3-5     | 6-10 字符 | 数值名（如"基础伤害"→"Base Damage"） |
| 5-10    | 10-20 字符 | 技能名 |
| 15-40   | 30-80 字符 | 简短描述 |
| 40-80   | 80-160 字符 | 完整描述 |

## addon.csv 格式参考

当前文件：`game/resource/addon.csv`
列序：`Tokens,English,SChinese`

## kv_generated.csv 格式参考

当前文件：`game/resource/kv_generated.csv`
列序：`Tokens,SChinese,English`
注意：此文件由 Gulp 从 Excel `#Loc{}` 标签自动生成，**请勿手动修改**。如需添加 Excel 中的数据，请修改 `excels/` 目录下的对应 xlsx 文件。

---
name: dota2-ui
description: DOTA2 自定义游戏 UI（Panorama）开发指南。触发词：UI、界面、面板、panorama、frontend、前端、HUD、layout、xml、css、样式。Use when user asks to create or modify DOTA2 custom game UI panels, React components, CSS styles, layout XML, game events communication, or net table data binding.
---

为 DOTA2 自定义游戏项目编写 Panorama UI 界面。

## 核心原则

1. **严格使用 DOTA2 Panel 类型**：Panorama 不是浏览器，不能使用 HTML 标签（如 `<div>`、`<span>`、`<p>`），只能使用 Valve 提供的 Panel 类型
2. **严格使用 Panorama CSS 属性**：不能使用标准 CSS 中 Panorama 不支持的属性，所有属性值必须符合 Panorama 规范
3. **Label 文本必须使用 text 属性**：❌ 禁止 `<Label>文本</Label>` 写法（会导致语法错误），✅ 必须使用 `<Label text="文本" />`。需要本地化时使用 `<Label localizedText="#token" />` 或 `$.Localize('#token')`，并在 `game/resource/addon.csv` 中添加对应 Token
4. **优先使用前端 API 获取数据**：如果 Panorama API 可直接获取数据，优先在前端获取；需要后端提供的数据，使用 Game Events 通信
5. **Net Table 限制**：每个 CustomNetTable 不能超过 2MB，表名必须注册到 `custom_net_tables.txt`；大数据量使用 XNetTable，但原则上优先使用 NetTable
6. **配置与代码分离**：所有可能与后端共享或需要集中管理的配置、数值、常量（包括但不限于技能属性、物品数据、单位属性、游戏规则参数、界面显示配置等），都必须放在 `game/scripts/npc/` 下的 KV 文件中。前端通过编译后的 JSON（`content/panorama/src/json/`）读取，严禁在前端代码中硬编码任何可能变化的配置值。修改配置后需运行 `npx gulp kv_2_js` 刷新 JSON

## 文件结构

| 文件 | 路径 | 用途 |
|---|---|---|
| 布局 XML | `content/panorama/src/<模块名>/layout.xml` | 面板结构定义 |
| 脚本 TSX | `content/panorama/src/<模块名>/script.tsx` | React 组件逻辑 |
| 样式 LESS | `content/panorama/src/<模块名>/styles.less` | CSS 样式 |
| 类型定义 | `shared/gameevents.d.ts` | 前后端通信事件类型 |
| 网络表类型 | `shared/net_tables.d.ts` | CustomNetTable 类型定义 |
| X网络表类型 | `shared/x-net-table.d.ts` | XNetTable 类型定义 |
| 网络表注册 | `game/scripts/custom_net_tables.txt` | 注册 NetTable 表名 |

## 工作流

### 步骤 1：确认 UI 需求

- 明确 UI 的功能、交互、数据来源
- 确定是否需要后端数据（Game Events 还是 Net Table）
- 确定数据获取方式（优先前端 API → Game Events → Net Table → XNetTable）

### 步骤 2：创建布局文件 (layout.xml)

```xml
<root>
    <scripts>
        <include src="./script.tsx" />
    </scripts>
    <styles>
        <include src="s2r://panorama/styles/dotastyles.vcss_c" />
        <include src="./styles.less" />
    </styles>
    <Panel class="root" hittest="false" />
</root>
```

- `<root>` 是根节点
- `<scripts>` 引入 TSX 脚本
- `<styles>` 引入样式，`s2r://panorama/styles/dotastyles.vcss_c` 是 DOTA2 默认样式
- 根 `<Panel>` 是 React 的挂载点

### 步骤 3：编写 React 组件 (script.tsx)

```tsx
import 'panorama-polyfill-x/lib/console';
import 'panorama-polyfill-x/lib/timers';
import { FC } from 'react';
import { render } from 'react-panorama-x';

const MyComponent: FC = () => {
    return (
        <Panel className="my-container">
            <Label text="Hello DOTA2" className="my-label" />
        </Panel>
    );
};

render(<MyComponent />, $.GetContextPanel());
```

### 步骤 4：编写样式 (styles.less)

```less
.my-container {
    width: 100%;
    height: 100%;
    flow-children: down;
}

.my-label {
    font-size: 24px;
    color: white;
    horizontal-align: center;
    vertical-align: center;
}
```

### 步骤 4b：从 JSON 读取 KV 数据（推荐）

游戏数值配置（技能属性、物品数据、单位属性等）存储在 KV 文件中，编译后位于 `content/panorama/src/json/`，前端可导入使用：

```tsx
import abilityData from '../json/npc_abilities_custom.json';

// 读取技能数值
const healData = abilityData.dbg_card_heal?.AbilityValues;
const cooldown = abilityData.dbg_card_heal?.AbilityCooldown;
```

**前后端数据分离原则**：
- 所有游戏数值配置写在 KV 文件中
- 前后端都从编译后的 JSON 文件中读取同一份数据
- 禁止在前端代码中硬编码数值常量，避免数据不一致

### 步骤 5：数据通信（如需要）

- 前端 API 可获取的数据：直接使用 Panorama API
- 需要后端推送的数据：使用 Game Events
- 需要持久同步的数据：使用 Net Table

### 步骤 6：编译验证（必须执行）

**完成代码编写后，必须运行编译命令验证没有错误：**

```bash
# 验证前端 Panorama 编译（非 watch 模式，仅编译一次检查错误）
npx webpack --config content/panorama/webpack.dev.js
```

- 如果编译成功（退出码 0），无错误输出，则验证通过
- 如果编译失败，根据错误信息修复代码后重新编译验证
- **必须确保编译通过后才能告知用户完成**

如果同时修改了后端代码（如 Game Events 声明、NetTable 类型等），还需要验证服务端编译：

```bash
# 验证服务端 TSTL 编译
npx tstl --project game/scripts/tsconfig.json
```

### KV → JSON 编译（如修改了 KV 文件）

如果修改了 `game/scripts/npc/` 下的 KV 文件，在编译前端之前先编译 KV：

```bash
npx gulp kv_2_js
```

### 完整验证命令

```bash
# 先编译 KV，再同时验证前端 + 服务端
npx gulp jssync && npx webpack --config content/panorama/webpack.dev.js && npx tstl --project game/scripts/tsconfig.json
```

## Panel 类型参考

### 基础面板

| Panel 类型 | XML 标签 | 用途 | React 组件 |
|---|---|---|---|
| Panel | `<Panel>` | 基础容器，类似 HTML div | `<Panel>` |
| Label | `<Label>` | 文本标签 | `<Label>` |

**⚠️ Label 文本规则**：
- ❌ 错误：`<Label>文本内容</Label>` — 会导致语法错误
- ✅ 正确：`<Label text="文本内容" />`
- 本地化：`<Label localizedText="#my_token" />` 或 `<Label text={$.Localize('#my_token')} />`
- 动态文本：`<Label text={`HP: ${hp}/${maxHp}`} />`
| Image | `<Image>` | 图片显示 | `<Image>` |
| Button | `<Button>` | 按钮 | `<Button>` |
| ToggleButton | `<ToggleButton>` | 开关按钮 | `<ToggleButton>` |
| RadioButton | `<RadioButton>` | 单选按钮 | `<RadioButton>` |
| TextEntry | `<TextEntry>` | 文本输入框 | `<TextEntry>` |
| NumberEntry | `<NumberEntry>` | 数字输入框 | `<NumberEntry>` |
| Slider | `<Slider>` | 滑动条 | `<Slider>` |
| DropDown | `<DropDown>` | 下拉选择框 | `<DropDown>` |
| ProgressBar | `<ProgressBar>` | 进度条 | `<ProgressBar>` |
| CircularProgressBar | `<CircularProgressBar>` | 圆形进度条 | `<CircularProgressBar>` |

### DOTA2 专用面板

| Panel 类型 | XML 标签 | 用途 | 关键属性 |
|---|---|---|---|
| AbilityImage | `<DOTAAbilityImage>` | 技能图标 | `abilityname`, `contextEntityIndex` |
| ItemImage | `<DOTAItemImage>` | 物品图标 | `itemname`, `contextEntityIndex` |
| HeroImage | `<DOTAHeroImage>` | 英雄头像 | `heroid`, `heroname`, `heroimagestyle` (`icon`/`portrait`/`landscape`) |
| ScenePanel | `<DOTAScenePanel>` | 3D 场景渲染 | `SetUnit()`, `SetRotateParams()`, `LerpToCameraEntity()` |
| ParticleScenePanel | `<DOTAParticleScenePanel>` | 粒子场景 | `StartParticles()`, `SetControlPoint()` |
| UserName | `<DOTAUserName>` | 玩家名称 | `steamid`, `accountid` |
| AvatarImage | `<DOTAAvatarImage>` | 头像 | `SetAccountID()` |
| EconItemPanel | `<DOTAEconItem>` | 饰品面板 | `SetItemByDefinition()` |
| HUDOverlayMap | `<DOTAHUDOverlayMap>` | HUD 地图 | `mapscale`, `maptexture`, `mapscroll` |
| MoviePanel | `<Movie>` | 视频播放 | `Play()`, `Pause()`, `Stop()`, `SetRepeat()` |
| HTMLPanel | `<HTML>` / `<DOTAHTMLPanel>` | HTML 嵌入 | `SetURL()`, `RunJavascript()` |
| CountdownPanel | `<Countdown>` | 倒计时 | `startTime`, `endTime`, `updateInterval` |

### Panel 通用属性

| 属性 | 说明 |
|---|---|
| `id` | 面板 ID |
| `class` / `className` | CSS 类名 |
| `hittest` | 是否响应鼠标点击 (`true`/`false`) |
| `hittestchildren` | 子面板是否响应鼠标点击 |
| `enabled` | 是否启用 |
| `visible` | 是否可见 |
| `defaultfocus` | 默认焦点子面板 ID |
| `selectionpos_x` / `selectionpos_y` | 选择位置 |

### Panel 通用事件

| 事件 | 说明 | React 写法 |
|---|---|---|
| `onactivate` | 点击/激活 | `onactivate={() => {}}` |
| `onmouseover` | 鼠标进入 | `onmouseover={() => {}}` |
| `onmouseout` | 鼠标离开 | `onmouseout={() => {}}` |
| `oncontextmenu` | 右键菜单 | `oncontextmenu={() => {}}` |
| `onfocus` | 获得焦点 | `onfocus={() => {}}` |
| `onblur` | 失去焦点 | `onblur={() => {}}` |
| `ondblclick` | 双击 | `ondblclick={() => {}}` |
| `onselect` | 选中 | `onselect={() => {}}` |
| `ondeselect` | 取消选中 | `ondeselect={() => {}}` |
| `onvaluechanged` | 值变化（Slider/DropDown等） | `onvaluechanged={() => {}}` |
| `ontextentrychange` | 文本变化 | `ontextentrychange={() => {}}` |
| `ontextentrysubmit` | 文本提交 | `ontextentrysubmit={() => {}}` |

## CSS 属性参考

### 重要：与标准 CSS 的差异

| 差异点 | 标准 CSS | Panorama |
|---|---|---|
| 颜色格式 | `#RRGGBB` / `rgba()` | `#RRGGBBAA`（8位，最后两位为 alpha） |
| 渐变语法 | `linear-gradient(...)` | `gradient(linear, ...)` |
| 背景图路径 | `url("path")` | `url("file://{images}/path.png")` 或 `s2r://panorama/...` |
| 默认溢出 | `visible` | `squish` |
| 文字溢出默认 | `clip` | `ellipsis` |
| 可见性值 | `visible`/`hidden`/`collapse` | `visible`/`collapse`（无 `hidden`） |
| 子元素布局 | `display: flex` | `flow-children: right/down` |
| 对齐 | `justify-content`/`align-items` | `horizontal-align`/`vertical-align` |
| 尺寸特殊值 | 无 | `fit-children`、`fill-parent-flow(weight)`、`width-percentage()`、`height-percentage()` |

### 布局属性

| CSS 属性 | 可选值 | 说明 |
|---|---|---|
| `width` | `fit-children` / `<px>` / `<%>` / `fill-parent-flow(weight)` / `height-percentage(pct)` | 宽度 |
| `height` | `fit-children` / `<px>` / `<%>` / `fill-parent-flow(weight)` / `width-percentage(pct)` | 高度 |
| `flow-children` | `right` / `down` / `right-wrap` / `none` | 子元素流式布局方向 |
| `horizontal-align` | `left` / `center` / `right` | 水平对齐 |
| `vertical-align` | `top` / `center` / `bottom` | 垂直对齐 |
| `overflow` | `squish` / `clip` / `scroll`（可组合如 `squish scroll`） | 溢出处理 |
| `margin` / `margin-top/right/bottom/left` | `<px>` / `<%>` | 外边距 |
| `padding` / `padding-top/right/bottom/left` | `<px>` / `<%>` | 内边距 |
| `min-width` / `max-width` | `<px>` / `<%>` | 宽度范围 |
| `min-height` / `max-height` | `<px>` / `<%>` | 高度范围 |

### 定位属性

| CSS 属性 | 可选值 | 说明 |
|---|---|---|
| `position` | `<x> <y> <z>` | 定位（3% 20px 0px） |
| `x` / `y` / `z` | `<px>` / `<%>` | 单独坐标 |
| `z-index` | `<number>` | 绘制/点击测试排序（不影响透视） |

### 视觉属性

| CSS 属性 | 可选值 | 说明 |
|---|---|---|
| `background-color` | `#RRGGBBAA` / `gradient(...)` | 背景色/渐变 |
| `background-image` | `url("file://{images}/...")` / `url("s2r://...")` | 背景图 |
| `background-size` | `auto` / `<px>` / `<%>` / `contains` | 背景图尺寸 |
| `background-position` | `<%>` / `center` / `left` / `right` / `top` / `bottom` | 背景图位置 |
| `background-repeat` | `repeat` / `no-repeat` / `space` / `round` | 背景图重复 |
| `color` | `#RRGGBBAA` / `gradient(...)` | 前景色/文字色 |
| `opacity` | `0.0` ~ `1.0` | 透明度 |
| `wash-color` | `#RRGGBBAA` | 叠加混合色（alpha 决定着色强度） |
| `blur` | `gaussian(stdDev)` / `gaussian(h, v, passes)` | 高斯模糊 |
| `brightness` | `<multiplier>` | 亮度倍率 |
| `contrast` | `<value>` | 对比度 |
| `saturation` | `0.0`(灰度) ~ `1.0`(正常) ~ `>1.0`(过饱和) | 饱和度 |
| `hue-rotation` | `<deg>` | 色相旋转 |
| `visibility` | `visible` / `collapse` | 可见性 |

### 边框属性

| CSS 属性 | 可选值 | 说明 |
|---|---|---|
| `border` | `<width> <style> <color>` | 边框简写 |
| `border-top/right/bottom/left` | 同上 | 各方向边框 |
| `border-color` | `#RRGGBBAA`（1~4个值） | 边框颜色 |
| `border-style` | `solid` / `none` | 边框样式 |
| `border-width` | `<px>`（1~4个值） | 边框宽度 |
| `border-radius` | `<px>` / `<%>` / `<h> / <v>` | 圆角 |
| `box-shadow` | `[fill/inset] <color> <x> <y> <blur> <spread>` | 盒阴影 |

### 文字属性

| CSS 属性 | 可选值 | 说明 |
|---|---|---|
| `font-family` | 字体名称 | 字体族 |
| `font-size` | `<px>` | 字体大小（像素） |
| `font-weight` | `light` / `thin` / `normal` / `medium` / `bold` / `black` | 字体粗细 |
| `font-style` | `normal` / `italic` | 字体样式 |
| `text-align` | `left` / `right` / `center` | 文字对齐 |
| `text-decoration` | `none` / `underline` / `line-through` | 文字装饰 |
| `text-overflow` | `ellipsis`(默认) / `clip` / `shrink` | 文字溢出 |
| `text-shadow` | `<x> <y> <blur> <strength> <color>` | 文字阴影 |
| `text-transform` | `none` / `uppercase` / `lowercase` | 文字转换 |
| `letter-spacing` | `normal` / `<px>` | 字间距 |
| `line-height` | `<px>` | 行高 |
| `white-space` | `normal` / `nowrap` | 空白处理 |

### 变换与动画

| CSS 属性 | 说明 |
|---|---|
| `transform` | `translate3d(x,y,z)` / `rotateX/Y/Z(deg)` / `scale3d(x,y,z)` |
| `transform-origin` | 变换原点（默认 `50% 50%`） |
| `pre-transform-rotate2d` | 3D 变换前的 2D 旋转 |
| `pre-transform-scale2d` | 3D 变换前的 2D 缩放（`0.8` 或 `0.4, 0.6`） |
| `perspective` | 透视深度（默认 1000） |
| `perspective-origin` | 透视原点/相机位置 |
| `transition` | 过渡简写：`<property> <duration> <timing> <delay>` |
| `transition-timing-function` | `ease` / `ease-in` / `ease-out` / `ease-in-out` / `linear` / `cubic-bezier()` |
| `animation-name` | 动画名称（需在 XML `<styles>` 中用 `@keyframes` 定义） |
| `animation-duration` | 动画时长 |
| `animation-delay` | 动画延迟 |
| `animation-iteration-count` | 动画迭代次数 |
| `animation-timing-function` | 同 transition |
| `animation-direction` | 动画方向 |
| `ui-scale` | UI 缩放（布局级，`150%` 或 `50% 100% 150%`） |
| `clip` | 裁剪区域：`rect(t,r,b,l)` / `radial(cx,cy,startAngle,angularWidth)` |
| `sound` | 选择器应用时播放的声音 |
| `sound-out` | 选择器移除时播放的声音 |

### 伪选择器

| 伪选择器 | 说明 |
|---|---|
| `:hover` | 鼠标悬停 |
| `:active` | 鼠标按下 |
| `:focus` | 获得键盘焦点 |
| `:selected` | 被选中 |
| `:disabled` | 被禁用 |
| `:enabled` | 被启用 |
| `:descendantfocus` | 子级获得焦点 |
| `:parentdisabled` | 父级被禁用 |
| `:activationdisabled` | 激活被禁用但仍可聚焦 |

### 渐变语法

```
/* 线性渐变 */
background-color: gradient(linear, 0% 0%, 0% 100%, from(#fbfbfbff), to(#c0c0c0ff));
background-color: gradient(linear, 0% 0%, 0% 100%, from(#fbfbfbff), color-stop(0.3, #ebebebff), to(#c0c0c0ff));

/* 径向渐变 */
background-color: gradient(radial, 50% 50%, 0% 0%, 80% 80%, from(#00ff00ff), to(#0000ffff));

/* 多层叠加 */
background-color: #0d1c22ff, gradient(radial, 100% -0%, 100px -40px, 320% 270%, from(#3a464bff), color-stop(0.23, #0d1c22ff), to(#0d1c22ff));
```

## 数据通信

### 方式 1：前端 API 直接获取（优先）

Panorama 提供了丰富的客户端 API，优先使用这些 API 获取数据：

```tsx
// 获取本地玩家信息
const localPlayer = Game.GetLocalPlayerInfo();
const playerID = Game.GetLocalPlayerID();

// 获取英雄信息
const hero = Players.GetLocalPlayerPortraitUnit();
const heroName = Entities.GetUnitName(hero);
const hp = Entities.GetHealth(hero);
const maxHp = Entities.GetMaxHealth(hero);

// 获取能力信息
const abilityCount = Entities.GetAbilityCount(hero);

// 游戏状态
const gameState = Game.GameStateIs(DOTA_GameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS);
const gameTime = Game.GetGameTime();

// 获取玩家金钱
const gold = Players.GetGold(playerID);

// 获取队伍信息
const team = Entities.GetTeamNumber(hero);

// 获取所有玩家
const playerIDs = Game.GetAllPlayerIDs();
```

### 方式 2：Game Events（需要后端推送时使用）

**前端→后端**：`GameEvents.SendCustomGameEventToServer`
**后端→前端**：`GameEvents.Subscribe` / `GameEvents.SendCustomGameEventToAllClients`

#### 步骤 1：在 `shared/gameevents.d.ts` 声明事件类型

```typescript
declare interface CustomGameEventDeclarations {
    // 前端→后端
    c2s_buy_item: { item_name: string; count: number };
    // 后端→前端
    s2c_update_score: { team_id: number; score: number };
}
```

#### 步骤 2：前端发送事件

```tsx
GameEvents.SendCustomGameEventToServer('c2s_buy_item', {
    item_name: 'item_healing_salve',
    count: 1,
});
```

#### 步骤 3：前端监听后端事件

```tsx
import { useGameEvent } from 'react-panorama-x';

const MyComponent: FC = () => {
    const [score, setScore] = React.useState(0);

    useGameEvent('s2c_update_score', event => {
        setScore(event.score);
    }, []);

    return <Label text={`Score: ${score}`} />;
};
```

#### 步骤 4：后端处理和发送（Lua/TSTL）

```typescript
// 监听前端事件
ListenToGameEvent('c2s_buy_item', event => {
    const playerID = event.activator_entindex ? EntIndexToHScript(event.activator_entindex) : null;
    // 处理逻辑...
}, undefined);

// 发送事件到前端
CustomGameEventManager.Send_ServerToAllClients('s2c_update_score', {
    team_id: 2,
    score: 100,
});
```

### 方式 3：CustomNetTable（需要持久同步的数据）

**限制：每个表不能超过 2MB**

#### 步骤 1：在 `game/scripts/custom_net_tables.txt` 注册表名

```
<!-- kv3 encoding:text:version{e21c7f3c-8a33-41c5-9977-a76d3a32aa0d} format:generic:version{7412167c-06e9-4698-aff2-e63eb59037e7} -->
{
    custom_net_tables = 
    [
        "hero_list",
        "game_timer",
        "my_new_table"
    ]
}
```

#### 步骤 2：在 `shared/net_tables.d.ts` 声明类型

```typescript
declare interface CustomNetTableDeclarations {
    my_new_table: {
        my_new_table: {
            some_value: number;
            some_string: string;
        };
    };
}
```

#### 步骤 3：前端使用

```tsx
import { useNetTableKey, useNetTableValues } from 'react-panorama-x';

// 监听特定 key
const data = useNetTableKey('my_new_table', 'my_new_table');

// 监听整个表
const allData = useNetTableValues('my_new_table');
```

#### 步骤 4：后端写入（Lua/TSTL）

```typescript
CustomNetTables.SetTableValue('my_new_table', 'my_new_table', {
    some_value: 42,
    some_string: 'hello',
});
```

### 方式 4：XNetTable（大数据量场景）

当数据量可能超过 2MB 限制时使用 XNetTable，它通过 Game Events 分片传输，没有大小限制。

#### 在 `shared/x-net-table.d.ts` 声明类型

```typescript
declare interface XNetTableDefinitions {
    large_data_table: {
        [key: string]: any;
    };
}
```

#### 后端使用

```typescript
// XNetTable 的写入方式（通过自定义的网络表封装）
// 具体使用方式参考项目中 src/utils/xnet-table/ 的实现
```

**原则：优先使用 NetTable，仅在数据量可能超过 2MB 时才使用 XNetTable。**

## React 组件开发参考

### 常用 Hooks（react-panorama-x）

| Hook | 用途 |
|---|---|
| `useGameEvent(name, handler)` | 监听游戏事件 |
| `useNetTableKey(table, key)` | 监听 NetTable 特定 key |
| `useNetTableValues(table)` | 监听 NetTable 整个表 |
| `useRegisterForUnhandledEvent(name, handler)` | 注册未处理事件 |

### 组件示例

#### 基础面板

```tsx
const BasicPanel: FC = () => {
    return (
        <Panel className="container">
            <Label text="标题" className="title" />
            <Panel className="content">
                <Label text="内容区域" />
            </Panel>
        </Panel>
    );
};
```

#### 按钮交互

```tsx
const ButtonExample: FC = () => {
    const [count, setCount] = React.useState(0);

    return (
        <Panel className="container">
            <Label text={`点击次数: ${count}`} />
            <Button className="my-button" onactivate={() => setCount(c => c + 1)}>
                <Label text="点击我" />
            </Button>
        </Panel>
    );
};
```

#### 本地化文本

```tsx
// 方式 1：使用 localizedText 属性（推荐）
<Label localizedText="#my_ui_title" />

// 方式 2：使用 $.Localize() 函数
<Label text={$.Localize('#my_ui_title')} />

// 动态文本中使用本地化
<Label text={`${$.Localize('#score_label')}: ${score}`} />
```

**本地化 Token 需要在 `game/resource/addon.csv` 中注册：**
```csv
// addon.csv 格式：Token,English,SChinese
my_ui_title,My Title,我的标题
score_label,Score,分数
```

#### 显示技能图标

```tsx
const AbilityPanel: FC = () => {
    return (
        <Panel className="ability-container">
            <DOTAAbilityImage abilityname="lina_light_strike_array" className="ability-icon" />
            <DOTAItemImage itemname="item_blink" className="item-icon" />
            <DOTAHeroImage heroname="npc_dota_hero_lina" heroimagestyle="icon" className="hero-icon" />
        </Panel>
    );
};
```

#### 进度条

```tsx
const HealthBar: FC = () => {
    const [hp, setHp] = React.useState(100);
    const [maxHp, setMaxHp] = React.useState(100);

    // 使用 GameEvents 或 API 更新 hp/maxHp

    return (
        <Panel className="health-bar-container">
            <ProgressBar
                value={hp}
                min={0}
                max={maxHp}
                className="health-bar"
            />
        </Panel>
    );
};
```

#### 文本输入

```tsx
const InputExample: FC = () => {
    const [text, setText] = React.useState('');

    const handleSubmit = () => {
        GameEvents.SendCustomGameEventToServer('c2s_chat_message', { message: text });
        setText('');
    };

    return (
        <Panel className="input-container" flow-children="right">
            <TextEntry
                text={text}
                ontextentrychange={panel => setText(panel.text)}
                ontextentrysubmit={handleSubmit}
                className="chat-input"
                placeholder="输入消息..."
            />
            <Button onactivate={handleSubmit} className="send-button">
                <Label text="发送" />
            </Button>
        </Panel>
    );
};
```

#### 下拉选择

```tsx
const DropDownExample: FC = () => {
    const [selected, setSelected] = React.useState('');

    return (
        <Panel className="dropdown-container">
            <DropDown onvaluechanged={panel => setSelected(panel.GetSelected().id)} className="my-dropdown">
                <Label id="option1" text="选项一" />
                <Label id="option2" text="选项二" />
                <Label id="option3" text="选项三" />
            </DropDown>
        </Panel>
    );
};
```

### 样式最佳实践

```less
// 使用 LESS 变量管理主题色
@primary-color: #ffffff;
@accent-color: #4fc3f7ff;
@bg-color: #1a1a2eff;
@danger-color: #ff5252ff;

// 容器布局
.my-container {
    width: 100%;
    height: 100%;
    flow-children: down;     // 子元素纵向排列
    background-color: @bg-color;
    padding: 10px;
}

// 水平居中的标题
.my-title {
    horizontal-align: center;
    font-size: 28px;
    font-weight: bold;
    color: @primary-color;
    margin-bottom: 10px;
}

// 可交互按钮
.my-button {
    flow-children: right;
    background-color: #333355ff;
    border: 1px solid #555577ff;
    border-radius: 4px;
    padding: 8px 16px;
    transition: background-color 0.2s ease-in-out;

    &:hover {
        background-color: #444466ff;
        brightness: 1.2;
    }

    &:active {
        brightness: 0.8;
    }
}

// 响应式宽度
.my-panel {
    width: fill-parent-flow(1.0);   // 等比填充父容器
    height: fit-children;            // 高度自适应内容
}

// 悬浮面板
.floating-panel {
    width: 300px;
    background-color: #000000cc;     // 半透明背景
    border-radius: 8px;
    box-shadow: #00000080 4px 4px 12px 0px;
    padding: 16px;
}
```

## 常见陷阱

1. **不要使用 `<div>`、`<span>`**：Panorama 中没有这些标签，容器统一用 `<Panel>`，文字用 `<Label>`
2. **❌ 禁止 `<Label>文本</Label>` 写法**：Label 不支持子文本内容，必须使用 `text` 属性：`<Label text="文本" />`。这在 XML 和 React TSX 中都适用
3. **本地化文本**：需要本地化时使用 `<Label localizedText="#token" />` 或 `$.Localize('#token')`，并在 `game/resource/addon.csv` 中添加对应的 Token 行
4. **颜色必须 8 位十六进制**：`#RRGGBBAA`，如 `#FFFFFF80`（50% 透明白色）
5. **不能用 `display: flex`**：Panorama 用 `flow-children: right/down` 替代
6. **不能用 `position: absolute/relative`**：Panorama 默认就是绝对定位，子元素通过 `horizontal-align`/`vertical-align` 对齐
7. **不能用 `hidden`**：Panorama 的 `visibility` 只有 `visible` 和 `collapse`，用 `collapse` 替代 `hidden`
8. **`overflow` 默认是 `squish`**：不是标准 CSS 的 `visible`，如果内容需要溢出显示，要显式设置
9. **图片路径使用特殊协议**：`file://{images}/xxx.png` 或 `s2r://panorama/images/xxx.vtex`
10. **`font-size` 不需要单位**：直接写数字，如 `font-size: 24;`
11. **NetTable 必须注册**：忘记在 `custom_net_tables.txt` 注册表名会导致数据无法同步
12. **NetTable 大小限制**：每个表不超过 2MB，大数据用 XNetTable

## 资源路径协议

| 协议 | 用途 | 示例 |
|---|---|---|
| `file://{images}/` | 引用 `content/panorama/images/` 下的图片 | `file://{images}/custom/my_icon.png` |
| `file://{movies}/` | 引用视频文件 | `file://{movies}/intro.webm` |
| `s2r://panorama/` | 引用 DOTA2 内置资源 | `s2r://panorama/images/hud/reborn/icon_glyph_on_psd.vtex` |

## 编译验证（必须）

**代码编写完成后，必须执行以下命令验证编译无错误：**

```bash
# 编译前端 Panorama（非 watch 模式，仅编译一次检查错误）
npx webpack --config content/panorama/webpack.dev.js
```

- 编译成功：退出码 0，无错误输出
- 编译失败：输出错误信息（文件名、行号、错误描述），修复后重新编译
- **必须确保编译通过后才能认为任务完成**

如果同时修改了后端代码（如 `shared/gameevents.d.ts`、`shared/net_tables.d.ts` 等），还需要验证服务端：

```bash
# 同时验证前端 + 服务端
npx webpack --config content/panorama/webpack.dev.js && npx tstl --project game/scripts/tsconfig.json
```

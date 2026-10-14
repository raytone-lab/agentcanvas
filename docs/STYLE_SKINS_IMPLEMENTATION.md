# 七套换肤 · 实现方案

配套 `STYLE_SKINS_PLAN.md`（选了哪 7 套、为什么）。本文回答：**具体怎么设、动到哪些
元素**。

## 1. 机制：三层，不要造平行系统

做插画风时我一开始重写组件规则，改一个描边粗细要动十几处。正确做法是分三层，
**优先级从上到下，能用上层解决就不要下沉**。

### Layer A — 复写已有 token（自动广播，零新增规则）

组件**已经**在读这些变量，风格分支只要重新赋值，所有组件同时改变：

| token | 控制 | 风格怎么用 |
|---|---|---|
| `--fn-r-xs … --fn-r-xl`、`--radius-sm/md/lg`、`--radius` | 圆角 | 整套缩放（插画风已验证） |
| `--border-subtle` / `--border-strong` | 描边**颜色** | 走 theme，不写在 CSS 里 |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | 投影 | **换配方**即可：柔和 / 硬位移 / 双向柔光 |
| `--surface-canvas/panel/raised/inset/hover` | 各层底色 | 走 theme |
| `--text-primary/secondary/muted/inverse` | 文字 | 走 theme |
| `--accent` / `--accent-hover` / `--accent-soft` | 强调 | 走 theme |
| `--font-ui` / `--font-display` / `--font-mono` | 字族 | 走 theme |

**7 套里有 4 套（牛皮纸、报刊、拟物、玻璃）几乎只需要 Layer A + 一点 B。**

### Layer B — 新增 `--sk-*`（现有 token 表达不了的轴）

只加这 6 个，不多加：

```css
.preview-frame[data-style-preset="X"] {
  --sk-edge:        /* 0 | 1px | 2px | 3px | 4px   —— 描边粗细，无现成 token */
  --sk-edge-style:  /* solid | outset | inset | double | none */
  --sk-pad-unit:    /* 4px | 6px | 8px —— 密度基准，无现成间距 token */
  --sk-leading:     /* 1.35 | 1.5 | 1.7 —— 行高 */
  --sk-region-tint: /* 分区底色，只有 Y2K 用 */
  --sk-press:       /* none | sink | invert —— 按下行为 */
}
```

### Layer C — 按 `data-style-preset` 的特例规则

只给两类东西留：**图标画法**和**窗口 chrome**。这两个没法用变量表达，必须写规则。

## 2. 元素清单：15 个可换肤面

真实类名，以及每个面主要吃哪一层。这就是"和界面哪些元素相关"的完整答案。

| # | 面 | 真实类名 | 主要吃 |
|---|---|---|---|
| 1 | 外框 | `.preview-frame` | A（radius）+ B（edge） |
| 2 | 分栏线 | `.resize-handle` | B（edge）+ C |
| 3 | 左栏 | `.session-sidebar` | A（surface）+ B |
| 4 | 会话行 | `.session-item`（含选中态） | A + B + `--sk-press` |
| 5 | 品牌行 | `.product-brand-mark`、`.sidebar-title`、`.session-brand-actions` | A（font）+ C（图标） |
| 6 | 新建/搜索 | `.session-new`、`.session-search-trigger` | C（图标画法） |
| 7 | 会话头 | `.chat-frame`、`.frame-header`、`.utility-header` | A + B |
| 8 | 消息 | `.message-bubble`、`.msg-surface`、`.message-role` | A + B + `--sk-leading` |
| 9 | 头像 | `.msg-avatar` + `STYLE_AVATAR_DEFAULTS` | C（每套要指定默认头像） |
| 10 | 思考块 | `.reasoning-header`、`.reasoning-title` + 8 种指示器（`orb`/`pulse`/`terminal`/`minimal`/`bars`/`ninety-ring`/`classic`/`native-orb`） | A + C |
| 11 | 工具卡 | `.tool-card[data-status]`、`.tool-icon`、`.tool-title`、`.tool-status-icon`、`.tool-progress`、`.tool-file-row-*` | A + B + C |
| 12 | 产物面板 | `.artifact-frame`、`.utility-card`、`.output-file-icon`、`.opened-output` | A + B + C |
| 13 | 输入区 | `.composer-frame`、`.text-control`、`.composer-tools`、`.composer-actions`、`.composer-upload`、`.send-button`、`.composer-menu-chevron` | A + B + C |
| 14 | 按钮 | `.primary-button`、`.secondary-button`、`.rail-icon-btn`、`.icon-button` | A + B + `--sk-press` |
| 15 | 右栏 / 空态 | `.right-panel`、`.git-panel`、`.changed-files`、`.empty-state` | A |

### 承担视觉差异最多的 5 个面（投入产出排序）

如果只做 5 个面，做这 5 个就有八成效果：

1. **外框 + 分栏线**（1、2）—— 第一眼就是它
2. **输入区**（13）—— 视觉重心，且状态最多
3. **消息 + 头像**（8、9）—— 占屏面积最大
4. **会话行选中态**（4）—— 每套风格标记"选中"的方式差异极大（反白／凹陷／实底／左竖条）
5. **图标画法**（6、11、12、13 共用）—— 最能定调，也最容易做错

剩下 10 个面基本靠 Layer A 自动跟随。

## 3. 七套的具体设定

### 4 · 系统原生 Win9x

```css
--sk-edge: 2px;  --sk-edge-style: outset;  --sk-pad-unit: 4px;
--sk-leading: 1.4;  --sk-press: invert;
--fn-r-*: 0;  --radius*: 0;
--shadow-sm: none;  --shadow-md: none;   /* 立体感来自斜角，不是阴影 */
```

| 元素 | 变化 |
|---|---|
| 外框 | 0 圆角，外圈 1px `#000` + 内圈 outset 斜角 |
| 分栏线 | 2px，上左 `#FFF` / 下右 `#808080` 的凹槽 |
| 会话行选中 | **蓝底白字反白**（`#0A246A`），非圆角高亮 —— 这是这套最标志性的一处 |
| 会话列表容器 | `inset` **凹陷**边框，像列表框 |
| 消息 | 方角 outset 面板，无圆角无阴影 |
| 输入区 | `inset` 凹陷 2px，白底，插入符闪烁 |
| 按钮 | outset 凸起；`:active` 切 `inset` + 内容位移 1px（`--sk-press: invert`） |
| 工具卡 | **带标题栏的子窗口**，右上 `×` |
| 图标 | 复用 codicon 通路（WorkBuddy 已有），16px 方形字形 |
| 滚动条 | 方块滑块 + 两端箭头按钮 |
| 头像 | 像素位图默认头像 |

**需要组件改动**：标题栏槽位（`_ □ ×`）。7 套里**唯一**一个。

---

### 5 · 像素终端

```css
--sk-edge: 1px;  --sk-edge-style: solid;  --sk-pad-unit: 4px;
--sk-leading: 1.35;  --sk-press: none;
--fn-r-*: 0;  --radius*: 0;
--shadow-sm: none;  --shadow-md: none;  --shadow-lg: none;
```

| 元素 | 变化 |
|---|---|
| 字族 | **全局点阵等宽，含正文** —— theme 的 `font.ui` 也设成 mono，这是这套的命门 |
| 会话行 | 选中 = **1px 左侧竖条 + 极浅底**，无圆角 |
| 文件名 | 后缀 `.md` 降为 muted 色（参考图的细节） |
| 消息 | 无气泡，靠 `.message-role` 前缀区分（`> ` / `$ `） |
| 状态 | **不用图标，用文本标记** `[OK]` `[..]` `[!!]` —— 覆盖 `.tool-status-icon` 为伪元素文字 |
| 思考块 | 强制 `terminal` 指示器 |
| 头像 | `image-rendering: pixelated` |
| 图标 | **手绘 16px 网格 SVG**（工作量最大的一处）+ emoji 作目录图标 |

**风险**：点阵字体要么内嵌 webfont（增加包体），要么退化成普通 mono，风格就塌一半。
**这是一个需要你决策的取舍。**

---

### 6 · 牛皮纸 Zine

```css
--sk-edge: 1px;  --sk-edge-style: solid;  --sk-pad-unit: 8px;
--sk-leading: 1.5;  --sk-press: none;
--fn-r-*: 2–4px;
--shadow-sm: none;  --shadow-md: none;   /* 完全扁平 */
```

| 元素 | 变化 |
|---|---|
| 所有卡片 | 1px 纯黑发丝框，**零投影**，近方角 |
| 分区标题 | `.utility-header` / `.sidebar-title` → **全大写 + 等宽 + 字距 0.08em**，像标签不像标题 |
| 会话行选中 | 品红实底 + 黑框 |
| 统计/数字 | 1px 黑框方块并排，无填充 |
| 头像 | 像素位图 |
| 图标 | 线，1.5px |

**最省力的一套** —— 几乎纯 Layer A + B，无特例结构。建议当基建的第一个验证对象。

---

### 7 · Y2K 极繁

```css
--sk-edge: 4px;  --sk-edge-style: solid;  --sk-pad-unit: 8px;
--sk-leading: 1.5;  --sk-press: sink;
--fn-r-*: 0;
--shadow-sm: 4px 4px 0 var(--border-strong);
--shadow-md: 6px 6px 0 var(--border-strong);   /* 硬位移，零模糊 */
```

| 元素 | 变化 |
|---|---|
| **分区底色** | 每个 region 拿**不同**底色 —— `--sk-region-tint` 按 `[data-preview-region]` 分配（品红/亮绿/橙/紫）。**这是唯一用到这个变量的风格** |
| 分区标题 | 黑底白字小方块 + **序号**（`1.` `2.` `3.`） |
| 品牌行 | 渐变横幅 |
| 按钮 | 4px 黑边 + `6px 6px 0` 位移投影；按下整体位移到影子位置（`--sk-press: sink`） |
| 消息 | 方角 + 4px 黑边 + 位移投影 |
| 图标 | emoji + 填色字形 |

**需要组件改动**：分区序号。可以纯 CSS `counter()` 做，不必改结构 —— 但要确认
region 的 DOM 顺序稳定。

---

### 8 · 拟物 Neumorphic

```css
--sk-edge: 0;  --sk-edge-style: none;  --sk-pad-unit: 8px;
--sk-leading: 1.5;  --sk-press: invert;
--fn-r-*: 20px;
--shadow-sm: -3px -3px 6px #FFF, 3px 3px 6px #C5CAD3;
--shadow-md: -6px -6px 12px #FFF, 6px 6px 12px #C5CAD3;
```

| 元素 | 变化 |
|---|---|
| **全部** | 描边取 0 —— 一条边框线都没有，这是它与其余 9 套的分界 |
| 所有控件 | 从背景**挤出**（外投影）或**压入**（`inset` 投影） |
| 会话行选中 | **凹陷**，不变色 |
| 按钮 | `:active` 投影内外翻转（`--sk-press: invert`） |
| 输入区 | 压入式凹陷 |
| 图标 | 线，同底色 + 轻投影 |

**风险**：低对比度 → 无障碍。`--text-muted` 在这套底色上要单独抬高对比，不能照抄。

---

### 9 · 玻璃 Liquid Glass

```css
--sk-edge: 1px;  --sk-edge-style: solid;   /* 半透明白 */
--sk-pad-unit: 8px;  --sk-leading: 1.5;
--fn-r-*: 16px;
--shadow-md: 0 8px 32px rgba(0,0,0,.24);
```

| 元素 | 变化 |
|---|---|
| 所有面板 | `background: rgba(255,255,255,.08)` + `backdrop-filter: blur(24px)` |
| 边框 | `linear-gradient` 描边模拟高光边 |
| **画布底** | 需要**有内容可透** —— 得配渐变/图片底，否则毛玻璃看不出来 |

**风险两条**：① `backdrop-filter` 依赖层叠上下文，`.preview-frame` 现在有
`overflow: hidden`，嵌套多层后容易失效；② 移动端性能敏感。**排最后。**

---

### 10 · 报刊 Editorial

```css
--sk-edge: 1px;  --sk-edge-style: none;   /* 只画 border-top，不成框 */
--sk-pad-unit: 8px;  --sk-leading: 1.7;
--fn-r-*: 0;
--shadow-sm: none;  --shadow-md: none;
```

| 元素 | 变化 |
|---|---|
| **卡片概念退场** | `.utility-card` / `.tool-card` / `.message-bubble` 全部 `border: 0` + 只留 `border-top: 1px` —— 靠**横线与留白**分隔 |
| 消息 | 不做气泡；`.message-role` 作为**作者名**独占一行，正文缩进 |
| 字族 | 衬线，标题大号衬线 |
| 行高 | 1.7（`--sk-leading` 最大值） |
| 工具调用 | 折叠成**脚注**样式，小字号 + 上横线 |
| 图标 | 线，1px 极细 |

**与极简风的区别**：衬线、0 圆角、无盒、行高 1.7 —— 4 条轴不同，不会撞。

## 4. 每套的改动量

| 风格 | Layer A/B 值表 | Layer C 特例 | 组件改动 | 评级 |
|---|---|---|---|---|
| 牛皮纸 | ✅ | 大写标签 1 条 | 无 | **最省** |
| 报刊 | ✅ | 去盒 + 消息改排 2 条 | 无 | 省 |
| Y2K | ✅ | 分区底色 + 序号 2 条 | 无（`counter()`） | 中 |
| 拟物 | ✅ | 凹凸态 2 条 | 无 | 中（要调对比度） |
| 系统原生 | ✅ | 斜角 + 反白 + 滚动条 4 条 | **标题栏槽位** | 重 |
| 像素终端 | ✅ | 文本状态标记 + 点阵图标 3 条 | 点阵 SVG 图标集 | **最重** |
| 玻璃 | ✅ | 毛玻璃 + 高光边 2 条 | 画布底图 | 重（有技术风险） |

## 5. 每套必改的 8 处（交付清单）

1. `PresetStyleId` 加成员 + `presetStyleIds`
2. `presetStyleOptions` 三语标签（en/zh/ja）
3. ≥1 套专属 theme：`themeTokens.ts` + `themeDirections` + `themeOptions` 映射
4. `defaultThemeForStyle()` 加分支
5. `STYLE_AVATAR_DEFAULTS` 加条目（元素清单第 9 项）
6. `app.css` 的 `[data-style-preset="X"]` 值表 + 特例
7. `IconStyleProvider` 的三元判断 —— **两处**要同步：`App.tsx` 与
   `scaffoldManifest.ts`。漏了会导致编辑器和导出包图标不一致
8. `presetRailData.ts` 的主题卡过滤选择器（`[data-theme-style="X"]`）

## 6. 建议顺序

1. **Layer A/B 基建 + 牛皮纸** —— 用最省的一套验证值表是否够用
2. **Y2K** —— 用最"极端"的一套反向验证值表的边界（4px 边、硬投影、分区色）
3. 报刊、拟物
4. 系统原生（标题栏槽位）
5. 像素终端（点阵图标集）
6. 玻璃（技术风险最高）

第 1、2 步做完，值表的形状就定了；如果它撑得住牛皮纸和 Y2K 这两个极点，剩下 5 套
基本是填表。

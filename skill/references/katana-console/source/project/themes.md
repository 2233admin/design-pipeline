# 主题：Console（暗）与 Paper（亮）

第一版"不做亮色"撤回。两套主题同一套 token 名，`data-theme="console|paper"`，`system` 跟随 OS。每个颜色 token 在 tokens.json 里有两个值；组件零改动。Paper 不是把暗色反相，是**同一台机器放在亮环境里**：铝板、纸面、深色 LCD 窗、更克制的发光。

## 1. Paper 的材质逻辑

| 层 | Console | Paper | 说明 |
|---|---|---|---|
| 凹陷 `bg-000` | #0b0b09 最暗 | #dcd8ce **最暗**（仍是凹陷） | 亮主题里凹陷依旧比面板暗，不反转层级 |
| 地面 `bg-100` | #141311 | #e8e5dd | |
| 单元格 `bg-200` | #171511 | #efece5 | |
| 面板 `bg-300` | #1d1b18 | #f4f2ec | 纸面，不是纯白（README "不用纯白"保留） |
| 浮起 `bg-400` | #26231e | #fbfaf6 | |
| **LCD 窗** `lcd-bg` | = bg-000 | **#1e1d19 深色岛** | 真实 LCD 在亮环境里也是暗窗；LCD 文字用 `lcd-fg` #ede6d6，橙 / 琥珀读数在窗内用 Console 值 |

三档对比在 Paper 上同样成立（bg-300 上）：`ink-100` 16:1 数据墨 · `ink-200` 10:1 文字 · `ink-300` 5:1 辅助 · `ink-400` 2.2:1 只给刻度与禁用。

## 2. 信号与涨跌

| token | Paper | 对 bg-300 |
|---|---|---|
| signal-orange | #d14e0a | 3.9:1（强调 / LED / 焦点环；作文字时配 ink） |
| signal-amber | #9a6e00 | 4.1:1 |
| signal-green | #1e7d2c | 4.7:1 |
| signal-red | #b3281f | 5.2:1 |
| signal-blue | #1a5fbf | 5.5:1 |

`pnl-up / pnl-down` 仍指向 green / red（约定由 Market Profile 切）；两者在 Paper 下也有明度差（green L 0.151 > red L 0.118），色觉友好开关切 `-safe` 橙 / 蓝不变。

## 3. 图表色（已过校验）

`series-1..7` Paper：#c24a0c #2a6fc0 #2f8a3e #7a52c7 #a06d08 #0b8fb0 #c0375f — 在 #f4f2ec 上通过 dataviz 校验器五项（明度带、色度、CVD 相邻 ΔE ≥ 12.4、正常视觉 ΔE ≥ 22、对比 ≥ 3:1）。`seq-100..600` 浅→深橙单调；`div-*-100/200` 低饱和；`bid / ask` 蓝 / 橙与 series-2 / series-1 同值；`chart-grid` #e4e0d7 比 hairline 更淡。

## 4. 发光、材质、签名在 Paper 下

- **发光减半**：`glow-orange` 4px 45% 透明；LED 仍发光但不"刺"。发光体预算不变（≤ 3）。
- `plate` 高光 90% 白 / 阴影 8% 黑 / 底厚 #cfcac0；`recess` 18% 黑。
- `hazard` 条纹：amber #9a6e00 / ink #17160f，语义不变。
- **`scanline` 在 Paper 下 = none**：亮面上横纹只会脏，大屏 / 自检 / 回放改用 `bracket` 加强"非实时"提示。
- 点阵字规则不变（整数倍、关抗锯齿）；Doto / 方舟像素在亮底上用 `ink-200` 而非 `ink-300`（细笔画在亮底更吃对比）。
- 斜切、角括号（#17160f）、密排大字照旧。

## 5. 切换规则

- `data-theme` 在根节点；`system` 时跟 `prefers-color-scheme`，并可按时段自动（白天 Paper、夜间 Console——与 rendering.md 夜间模式同一时段配置，夜间模式 = Console + 亮度 −10%）。
- 切主题：颜色过渡 120ms（唯一允许 transition 的属性），不重排、不重建 canvas；图表 theme 对象重新生成后 `applyOptions`。
- 实盘 amber 框、PAPER 蓝条、hazard 带、ConsensusBlock 结构在两套主题下都不可关（安全语义）。
- 每张卡的 story 必须双主题各一张截图（DoD 第 1 条扩成两张）。

## 6. 不做

- 不做第三套"高对比"主题——Paper 的 ink-100 已 16:1，Console 的 12:1；高对比需求用字号与密度解决。
- 不做用户自定义任意颜色；只开放：主题、强调色四选一（下）、涨跌约定、色觉友好、密度、字体。
- 强调色四选一（橙 / 琥珀 / 青 / 绿）只重映射 `signal-orange` 与 `glow`，LinkGroup 四色、bid / ask、series 不受影响；默认橙。

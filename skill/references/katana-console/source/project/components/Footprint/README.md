# Footprint

> **本卡预览是可运行的实装**（2026-10-03）：PriceChart flow 层 + `ChartSurface` 接口（priceToY / yToPrice / xOf / iOf / hitTest）的参考实现，自带逐笔 mock 流。能力：10 内容模式（Volume · Trades · Volume and Trades · Volume and Delta · Delta · Centered Delta · Bid × Ask · Centered Bid × Ask · Bid/Ask · None）× 4 可视化（Full Row · Bid/Ask Profile · Volume Profile · Delta Profile）× 4 配色（Delta · Solid · Volume Proportion · Heatmap by Volume）、失衡 Rate % 可调、堆叠失衡、POC、VA 70%、Cluster Statistics 行（Delta / Volume / Trades / Max Δ / Min Δ）、Auto Transform（柱宽阈值自动 K 线 ↔ 足迹）。操作（我们的方式）：工具条只放当前模式 + 3 个最近；一切走命令表 `/`（`fp mode delta` · `fp viz profile` · `fp scheme heatmap` · `fp imb 300` · `stat trades` · `h 246.8 alert` · `order buy 246.4` · `agent`）；右键价位 = 下单草稿（ExitStrategy 括号 SL/TP，Enter 提交：草稿虚线 → 提交中 → 已挂实线）；H 后点 = 全局水平线，A 切告警；点 K 线 = 锁定括号。手感：弹簧缩放 / 平移 + 橡皮筋 + 动量、跨 Auto Transform 阈值时 `latch` 声、按键 `tick`、LCD Δ、LED LIVE。**Agent 解读**：`agent` 命令 / 按钮——Agent 用同一张命令表把镜头推到吸收最强的格、画括号、贴一张解读卡（动作：加告警 / 画线 / 看成交）。对外 `window.KFootprint.run(cmd)` 即 Agent 的调用面。剩余待补：可视化 3 种（Trades Profile · Bid/Ask Ladder · ±Delta Profile）、配色 5 种、Additional Footprint、Filters、Magnifier。**已合流到自研引擎**：同一 flow 层跑在 PriceChart 卡预览的 `@katana/chart` 里（engineering §2.2，聚合 / 失衡 / POC / VA 由引擎算、图只画）；本卡预览是首版实装，后续以 PriceChart 为准。规格与验收：tools.md §3（失衡默认 300%，MVP / P1 / P2 表、FootprintArtifact、FIXTURE VERIFIED 所需的固定 fixture 与状态注入）。

订单流足迹图。每根 K 线一个 Bid × Ask 格矩阵，按价格档聚合。自研 Canvas 2D，列式数据，rAF 合并绘制。

## 颜色

- **买卖与涨跌脱钩**：Bid `bid` 蓝、Ask `ask` 橙，这是订单流专用的一对，永远不和 `pnl-up/down` 混用。
- 每侧三档强度（按本根 K 线内的分位）：暗 / 中 / 亮；亮档用 `bid` / `ask` 本色 + `ink-100` 文字，暗档 `ink-200` 文字。
- 失衡（对角 ≥ 3×）：格内 1px `ink-100` 描边 + 500 字重。
- POC：两格 1px `signal-orange` 内描边。
- 当前（LIVE）K 线整根 1px `signal-orange-dim` 外框，Delta 行标 LIVE。

## 结构

- 左侧价格轴 `num-sm` `chart-axis`，右对齐。
- 格 38×16，格间 1px `bg-100` 缝；缩放时格宽 24–56 之间，低于 24 时隐藏数字只留色块。
- 底部每根一个 Delta LCD（`pnl-up/down` 着色，这里允许，因为 Delta 是正负量）。
- 显示模式（局部工具条）：Bid×Ask / Delta / Volume / 失衡。

## 交互

- 逐格 tooltip：价位、Bid、Ask、Delta、累计。
- 悬停一个价位 → 整行高亮跨所有 K 线。
- 滚轮时间缩放、Shift+滚轮价格缩放、拖动平移，均有橡皮筋。
- 回放模式下接回放时钟。

## 规则

- 缺少逐笔方向数据时显示"估算"角标并降为 Volume 模式，不伪造 Bid/Ask。
- 聚合档位、失衡阈值、强度分位是面板设置，不是全局设置。

## 谁提供什么

- 组件：bars[{t,levels[{price,bid,ask}]}]、tick、aggregation、imbalanceRatio、mode、live。
- 数据路径：只经 MarketAPI 订阅，列式 batch。

## ATAS 对照补齐（2026-10-03，atas.md §2.1）

- **归属改变**：Footprint 不再是独立面板，而是 PriceChart 的 flow 层 Primitive（engineering.md §2.2，先 spike）；本卡保留为 `1x1` 快捷入口，渲染器复用。与绘图、指标、ChartTrader、Cluster Statistics 共坐标系；柱宽 ≥ 阈值自动从 K 线切成足迹（Auto Transform）。
- 内容模式补齐到 10：Volume · Trades · Volume and Trades · Volume and Delta · Delta · Centered Delta · Bid × Ask · Centered Bid × Ask · Bid/Ask · None（现有 4）。
- 可视化模式补齐到 7：Full Row · Bid/Ask Profile · Volume Profile · Trades Profile · Delta Profile · Bid/Ask Ladder · ±Delta Profile（现有 1）。
- 配色补齐到 9（Delta · Solid · Volume/Trades/Bid-Ask Proportion · Heatmap by Volume/Trades/Delta · None），全部服从单色序列规则，不做彩虹。
- 新增：Additional Footprint（第二套设置并排）、Imbalance 参数化（Rate % 默认 150、Volume Filter、Min Difference、Ignore Zero）、Stacked Imbalance 区间描边、Filters 6 类、Maximum Level Highlighting 6 类可选、Value Area 底色（与 VolumeProfile 共用聚合器）、Proportion 4 模式、Scale / Scale by Lower Level / Auto、Cluster Statistics 16 行可配 + Session reset、Order Flow 可视化模式（每笔成交圆 / 矩形）、Magnifier（P2）、Footprint 模式热键 `chart.footprintMode`。
- 优先级：P0 flow 层 spike；P1 全模式矩阵与参数。

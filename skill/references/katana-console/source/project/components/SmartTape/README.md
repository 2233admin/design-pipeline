# SmartTape

逐笔成交带（ATAS Smart Tape 的对应）。每秒可能上千行，TanStack Virtual 只画可见行，TanStack Pacer 把新行按帧批量追加。

## 结构

- 顶栏：过滤 chip（`≥ 阈值`、聚合、仅大单）+ 速度条（点阵条，`signal-orange`，每秒笔数）。
- 列：时间（毫秒）、价格、数量、方向·聚合；方向用 `bid` 蓝 ▲ / `ask` 橙 ▼，不用涨跌色。
- 大单（≥ 阈值）整行 `bid-100` / `ask-100` 底色，数量 500 字重 `ink-100`。
- 聚合：连续同向同价在冷却窗口（默认 300ms）内合并为一行，右侧 `×n` `ink-400` 9px；原始逐笔不丢，展开可见。

## 交互

- **自动滚动**，新行从顶部进入（`snappy` 位移 22px，高频时直接插入）。
- 鼠标进入 / 滚动 → **暂停**，底部出现"已暂停 · 新 n 笔 · 点击恢复"条（amber）；离开 3s 或点击恢复。
- 点击一行 → 在图表上定位该成交；悬停 → tooltip（成交额、累计 delta）。
- 阈值用 ⌘ + 滚轮调整，chip 实时显示。
- 大单到达播 `radar-ping`（市场类，冷却 500ms，可在音效设置关）；视觉上用整行亮度从 0 到满（周边可见），不是颜色变化。
- 跑马开着时，面板内不再有其他运动元素（运动预算 ≤ 1，§4）。

## 状态

- 无逐笔方向：方向列显示 `—`，顶栏 chip `估算` amber；不伪造买卖。
- 断线：顶栏 LED red，列表保留，恢复后新行前插一条"— 断线 14:32:10–14:32:18 —"分隔。

## 规则

- 聚合是显示层行为，不改变数据层的逐笔账。
- 列表保留最近 N 行（默认 2,000），更早的进历史查询，不无限增长。

## 谁提供什么

- 组件：trades（append-only）、threshold、aggregateMs、paused、onSelect。
- 数据：MarketAPI 逐笔流，列式 batch。

## ATAS 对照补齐（2026-10-03，atas.md §2.5）

- 列补齐到 9：Time（毫秒）· Price · Tick direction · Trade Volume · Bids · Asks · Sizes · Avg.Vol. · Buy/Sell Strength。
- 过滤：Cumulative Trades / Separated Prints / Level 1 三类过滤 + Tape Speed；Between Color（价差内成交）、Above Ask / Below Bid 高亮；Freeze、Clone、Historical mode（回放）、Reset。
- 告警：6 种 Filtration Mode（Cumulative Trade / Bid / Ask / Best Bid / Best Ask / Best Bid-Ask）+ Min/Max Volume + 声音，存为 AlertCenter 规则。
- 新模式 **Bid/Ask Tape**（ATAS X 8.0.14 独立模块）作为本卡的一个视图，不另建卡；**All Prices** 待核实内容后决定归属。
- 速度条五模式（Volume / Ticks / Buys / Sells / Delta）在 IndicatorPanel 的副图版同源。
- 优先级：P0 列与过滤；P1 Bid/Ask Tape 模式。

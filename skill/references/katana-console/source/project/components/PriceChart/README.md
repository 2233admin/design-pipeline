# PriceChart

> **本卡预览是可运行的实装（2026-10-03）：`@katana/chart` 自研引擎第 1–3 段。** 数据流：Worker（代替本机引擎）生成逐笔 → 建柱（time / range / tick / vol）→ 聚合 / 失衡 / POC / VA → 指标（SMA / EMA / VWAP / CVD / 对照品种 / 锚定 VWAP）→ 回放时钟 → 前端只画。能试：K / 足迹 / 线 三组 chips；滚轮缩小到阈值自动变回 K 线；左移到头自动分页、视口不跳；左侧工具条或 T/H/V/R/F/X/M/W 放绘图，拖柄 / 整体拖动 / 磁吸 OHLC / ⌘Z 撤销 / Delete；十字线 LCD 读数显示历史 bar 的历史指标；右键下单草稿 → ↵ 提交；`/` 命令：`style line` · `ind vwap` · `pane cvd` · `pane cmp` · `bars range 6` · `tool fib` · `h 246.8 alert` · `state gap`（九态可注入）· `replay 30 4`（同一条流）· `order buy 246.4` · `agent` · `artifact`（ChartArtifact）。预览带 **FIXTURE** 标。成熟度：**IMPLEMENTED**，未到 FIXTURE VERIFIED（tools.md §15–16）。对外 `window.KChart = {run, settings, surface, drawings, artifact, state, data}`。

K 线主图：Desk 的中心面板，ChartTrader、DrawingToolbar、IndicatorPanel、Footprint flow 层都挂在它上面。引擎选型与四段范围在 engineering.md §2.2（自研；TradingView / Vela 只参考，不引代码，无署名）；规格与验收在 tools.md §1。这一页定主题、K 线与量柱画法、副图规则、图例、十字线读数。

## 主题（`themeFromTokens()`）

引擎不自己 `getComputedStyle` 业务色；接收由 tokens 生成的 theme 对象（样机里用 `tok()` 解析 `{alias}`）：

| 引擎主题字段 | token |
|---|---|
| `background` | `bg-100`（图底；LCD 读数窗 `bg-000`；统计行 / 轴区 `bg-300`） |
| `axis / grid / border` | `chart-axis` · `chart-grid` · `line-100` |
| `up / down` | `pnl-up / pnl-down`（由 Market Profile 决定哪边是哪色） |
| `bid / ask` | 订单流专用 `bid` 蓝 / `ask` 橙，永不与涨跌混用 |
| `series` | `series-1..4` 给指标（SMA / EMA / VWAP / AVWAP），对照品种用 `series-1/2` |
| 十字线、最新价线 | `ink-400` 虚线；最新价标签 `signal-orange` |
| `fontFamily` | `mono`（Maple Mono CN） |

## K 线与量

- **涨空心、跌实心**：up `borderColor = wickColor = pnl-up`，`color` 透明；down 三色都 `pnl-down`。空心让涨柱少一半面积墨水，红绿两色的面积压力减半（§14）。哪一边是哪个颜色由 Market Profile 决定，组件不知道。色觉友好开关切 `pnl-*-safe`。
- 柱宽 ≥ 5px 时画实体，再窄退化为 OHLC 条；最小 K 线间距 2px。
- 量柱统一 `ink-400`，十字线所在柱 `ink-300`——**量不按涨跌上色**（量是大小，不是方向，§19 §20）；放在主图底部 20% 高度，叠加于价格之下，不单独开副图。
- 均线等覆盖指标用 `series-1..7` 顺序分配，1.5px；≤ 4 条直接在图例标名。

## 副图

- 每个副图（CVD、OI、IC、成交量轮廓侧栏以外的所有指标）是独立 pane，中间 4px `bg-100` 分隔；**不叠双 Y 轴**。
- 副图高度比例由面板记在 Pane.state；拖分隔改高（Splitter 规则）。
- 正负类副图（CVD、Delta、IC）用 `div-pos-200 / div-neg-200`，零轴 `line-200`；单向类（OI、ATR）用 `series-1`。
- 一张图 ≤ 3 个副图；更多提示拆面板。

## 图例与读数

- 图例一行在左上：品种 · 周期 · 各覆盖指标名 + 当前值（`ink-100`）· 「+ 指标」入口（`ink-400`）。只一行，溢出省略。
- 十字线读数是一个 LCD 窗（Overlays §Tooltip，无延迟）：时间、开高低收、量、各副图值；键值对两列右对齐。
- 十字线跨 LinkGroup 同步；左上角 3px LinkGroup 色标。
- 右轴：最新价 `poc` 标签；自己的单与持仓标签由 ChartTrader 画。

## 交互

- 滚轮 = 时间缩放，Shift + 滚轮 = 价格缩放，拖动平移，双击复位；边界橡皮筋（motion.md）。
- 周期切换：`bars time n` 让引擎重建，数据直接换，不做 K 线过渡动画；视口锚右缘；新 K 线由引擎 `tick` 推，每帧一次。
- 回放：引擎虚拟时钟发与 live 相同的消息，图不知道自己在回放；ReplayBar 接管时钟，顶栏 `REPLAY` 点阵标（tools.md §7）。

## 规则与许可

- 引擎自研，**无第三方署名**；不用 TradingView Charting Library / Advanced Charts（非开源，与 GPL 不兼容），不用 lightweight-charts / Vela（不双轨）。
- 不做饼图、3D、双 Y 轴、彩虹色阶；不做"AI 形态识别"的花色标注。
- 一切颜色来自 theme 对象；Storybook 覆盖：空数据、1 根、10 万根、断口、周期切换、色觉友好、回放。

## 谁提供什么

- 组件：symbol、timeframe、theme、overlays[]、panes[]、linkGroup、replay、onCrosshair、children（layers：Footprint、ChartTrader、Agent 标注、Drawings）。
- 调用方：历史 + 分页 + 实时更新经 `history / more / tick` 协议（Quote Hub → Worker / 后端）；指标、聚合、建柱、回放时钟在后端 / 本机引擎，前端不算。

## ATAS 对照补齐（2026-10-03，atas.md §2.1 / engineering.md §2.2）

- 显示模式补齐：Transparent Candles · Hidden（只留指标）· **Footprint（引擎 flow 层，已通）** · Auto Transform 阈值 · Magnifier（P2）· Overlay Mode（多品种百分比叠加）。
- 周期类型：Minutes / Seconds / Daily / Weekly（已有）+ Tick / Volume / Delta / Range / Renko / Reversal 非时间柱（引擎 `bars/builder` 已通：序号轴，时间只是标签）；RangeX/XV/Z/US 不做（算法未公开）。Favorite timeframes 收藏条 + `chart.timeframe` 热键。
- 图表级：Candle countdown / Bar Timer、Candle Statistics 副图、Session Begin/End 覆盖、Price Offset、滚轮三模式（按工作区记忆）、Go to Date、Full Screen。
- 挂载点：IndicatorPanel（叠加 / 副图，经后端指标端口）、DrawingToolbar（引擎绘图的工具条，样机内置左侧条）、ChartTrader、MBOTrackers，全部经 `ChartSurface` 接口。
- LinkContext 新槽位 `priceRange`（Link Price Axis）。

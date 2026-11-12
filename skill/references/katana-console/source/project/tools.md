# 工具规格：12 个 MVP 工具的功能、验收与 Agent Artifact

这一页是 2026-10-03 收到的《KATANAview Professional Tool Specs》经六处对齐后的版本（对齐清单见 spec.md §0）。它回答"每个工具必须做到什么、怎么验收"，优先级高于组件 README 里与之冲突的措辞；它不回答"长什么样"（组件卡）和"怎么建"（engineering.md）。

**读法**：施工一个工具时读 spec.md + 本页该工具一节 + 对应组件卡 README + 仓库代码。`[MVP]` 是本轮必须实现的范围；`[P1]/[P2]` 本轮不做时保留类型与 adapter port，UI 不显示假功能。每节末尾的"ATAS 长尾"把 atas.md 矩阵里属于该工具、但未进 MVP 表的行挂回来——**范围不缩水（不做为零），只排顺序**。

公共数据契约（`InstrumentRef · DataQuality · QuoteL1 · BookSnapshot · BookDelta · TradePrint`）、公共状态表、性能预算、市场能力基线在 spec.md §2–§5，每个工具都隐含引用，不重复。

## 0. MVP 第一批

| 工具 | 为什么必须进 MVP | 主卡 |
|---|---|---|
| Professional Chart | 所有行情、研究、执行证据的基本视觉入口 | PriceChart |
| DOM / Price Ladder | L2 当前状态、流动性与交易入口 | DOMLadder |
| Footprint / Cluster | 成交主动性、Delta、价位成交结构 | Footprint（PriceChart flow 层） |
| Smart Tape | 原始成交与大单 / 成交节奏 | SmartTape |
| L2 Heatmap | L2 历史，不只是"当前盘口" | DOMHeatmap |
| Volume / Market Profile | 价格分布、POC、Value Area | VolumeProfile |
| Replay / Market Simulator | 研究、复盘、Paper、Agent 评估共同基础 | ReplayBar + 后端回放服务 |
| Watchlist / Market Monitor | 7×24 多市场态势入口 | Watchlist |
| Screener / Scanner | 从"观察市场"进入"发现机会" | Screener |
| Order Ticket | 人 / Agent 的交易意图输入 | OrderTicket + ConsensusBlock |
| Order Blotter | 执行状态与异常监控 | OrderBlotter + FillLog |
| Positions / Account Book | 系统实际资金与仓位事实锚点 | PositionBook + AccountRail + CashLedger |

第一批完成后紧接着补：Factor Workbench、Backtest Workbench、Portfolio / Risk、Agent Task、Agent Evidence、Agent Approval、Data Quality（§13）。

每个工具规格的固定结构：Purpose · 参考与 Source IDs · Required Data · Features + Acceptance · 设置 · 状态 · 市场能力 · Human Representation（我们的卡）· Agent Artifact · 性能 · ATAS 长尾。

---

## 1. Professional Chart — `PriceChart`

**Purpose**：专业图表不是"画 K 线组件"，而是市场时间序列、研究指标、执行事实、Agent Evidence 与 Replay 的共同时间 / 价格视觉坐标系。

**参考与 Source IDs**：ATAS Classic `ATC-001, 007–013, 018, 021`（图表、非时间柱、Delta / CVD、Profile、交易）· ATAS X `ATX-004, 005, 007`（工作区、联动、模板）· TradingView `TV-001–014, 019, 020` · TapeDelta `TD-001–008, 016–019` · OpenTerminalUI `OTU-008–011, OTL-013–022` · TSP `TSP-008–014`。

**Required Data**

```ts
type ChartData = {
  instrument: InstrumentRef; bars: BarSeries; quote?: QuoteL1; trades?: TradePrint[];
  indicators?: IndicatorSeries[]; orders?: OrderRef[]; fills?: FillRef[]; position?: PositionRef;
  annotations?: Annotation[]; quality: DataQuality;
};
```

**Features + Acceptance**

| P | 功能 | UI / Interaction | Acceptance | 引擎（@katana/chart） |
|---|---|---|---|---|
| MVP | Candles / OHLC / Line / Area | 不改变当前时间窗即可切换 | 加载 500 bars，Candles→Line 后 viewport 不变 | 段 1 ✅ |
| MVP | Volume | 独立 Pane，可隐藏 | 关闭后主图高度自动回收 | 段 1 ✅（主图底 20% 量柱；独立 pane 待） |
| MVP | Symbol | Search + recent | AAPL→BTCUSDT 后旧 symbol 的订单不得残留 | 壳（SymbolMap）+ 引擎 `setMarket`（待） |
| MVP | Timeframe | 快捷 + 自定义 | 5m→15m 只取 15m 数据 | 壳 + provider（`bars time n` 已通） |
| MVP | Zoom / Pan | Wheel / drag / touch | 左移触发历史分页但不跳回最新 | 段 1 ✅（`more` 协议，视口与拖拽锚点同步平移） |
| MVP | Crosshair | time / OHLC / indicator values | 历史 bar 显示历史指标，不显示最新值 | 段 1 ✅（LCD 读数窗） |
| MVP | Indicator Manager | Add / edit / delete / source / pane | RSI 14→21 只重算 RSI | IndicatorPanel；计算在后端（待） |
| MVP | SMA / EMA / VWAP / Bollinger / RSI / MACD | 内置 MVP 指标 | 每项均有 deterministic fixture | 段 3：SMA / EMA / VWAP 已由引擎算、图只画；Bollinger / RSI / MACD 待；fixture 待 |
| MVP | Core drawings | Trend / H / V / Rect / Fib / Text | 保存后刷新可恢复 | 段 2 ✅ 8 种（Trend / H / V / Rect / Fib / Text / Ruler / AVWAP），序列化 JSON；Pane.state 接入待 |
| MVP | Multi-pane | 可调高度 | 用户调整高度后恢复布局一致 | 段 1 ✅（比例可拖；持久化待） |
| MVP | Compare | raw / % / normalized | SPY 比较改 % 后起点 = 0% | 段 3 ✅（对照 % 子窗格） |
| MVP | Order / Fill overlay | 明确 Paper / Shadow / Live | Paper fill 显示真实模拟时间和价位 | 订单层 ✅ 草稿 / 提交中 / 已挂；fill 标记待 |
| MVP | Position / Avg entry | 图上线 / 标记 | 切 account 后必须切换 | ChartTrader layer（待） |
| MVP | Template | 指标 + 布局 + 绘图设置 | 不能把旧账户订单保存进模板 | Pane.state → Workspaces（待） |
| MVP | Link group | symbol / interval / crosshair / time 独立开关 | 只开 symbol 时 interval 不联动 | 四层 context（layout.md） |
| MVP | Data status | provider / delay / stale / replay | 断流后显示 stale | 段 3 ✅ 九态可注入（`state …`） |
| P1 | Range / Renko / Tick / Volume / Delta bars | Bar builder | Range bar 不能标成 1m | 段 3 ✅ `bars range / tick / vol`（序号轴，时间只是标签） |
| P1 | Chart Trading | drag limit / stop | Drag 只生成 replace intent | ChartTrader |
| P1 | 2 / 4 / 6 / 8 chart layouts | linked groups | 保存恢复完全一致 | 壳 split 树 |
| P2 | Script / custom indicator | sandbox / typed input | 异常插件不能阻塞主图 | **后端 PineTS / Python 指标 SDK**，不在浏览器执行 |

**交互链**：Chart selection → TimePriceSelection → Profile / Replay / Agent Evidence；Order / Fill update → Chart overlay；Agent Evidence → Annotation → click → Evidence Viewer。

**设置**：`chartType: candles · initialBars: 2000 · priceScale: auto · crosshair: true · linkGroup: null · compareMode: percent · historyPagination: true · maxVisiblePointsBeforeDecimation: 100000`。

**状态**：`loading / live / stale / replay / degraded / unsupported / error / disconnected`；Chart 本身不产生 L2 `gap`，但其 L2 派生 overlay 必须继承 `gap / resyncing`。

**市场能力**：所有市场支持基础时间序列；非时间柱依赖数据粒度；订单 overlay 依赖账户 / 执行 Adapter；Funding / Mark / OI overlays 只在 Crypto Perp capability 存在时出现。

**Human Representation（规格名 → 我们的卡）**：`PriceChart` → PriceChart；`ChartToolbar` → PanelFrame 局部工具条 + PriceChart chips；`IndicatorManager` → IndicatorPanel；`DrawingObjectManager` → DrawingToolbar；`ChartLegend` → PriceChart 图例一行；`DataStatusBadge` → states.md 角标（`STALE` / `估算` / `REPLAY` / `FIXTURE`）+ StatusBar 段。

**Agent Artifact**

```ts
interface ChartArtifact {
  tool: "chart"; instrument: InstrumentRef; timeframe: string;
  viewport: { from: string; to: string }; chartType: string;
  indicators: Array<{ id: string; params: Record<string, unknown>; dataRef?: string }>;
  drawings: Array<{ id: string; type: string; anchors: unknown[]; evidenceRef?: string }>;
  selection?: { from: string; to: string; low?: number; high?: number };
  quality: DataQuality;
}
```

**性能**：Canvas 2D 渲染价格和高密度 series（WebGL2 P2）；React 只管 Toolbar、Settings、状态和低频语义 UI。十字线、缩放和平移目标 60 FPS；样机帧 p95 ≈ 2ms @ 25 根 × 20 档。

**Acceptance Checklist**：4 种基础图型 · Volume pane · Symbol / timeframe · Historical pagination · Crosshair · 6 个 MVP indicators · Core drawings · Multi-pane · Compare · Order / Fill / Position overlays · Template · Link group · stale / replay / disconnected · Agent ChartArtifact。

**ATAS 长尾（atas.md §2.1 / §2.3）**：Transparent / Hidden candles、Magnifier、Overlay Mode、Reversal / RangeX 变体、Favorite timeframes + 周期热键、Candle Statistics / Bar Timer、Visual settings 13 组、ETH / RTH / Custom session、Crosshair 4 型、滚轮 3 模式、Go to Date、Anchored VWAP / TPO 对象 / Dynamic POC（数据型绘图对象，走聚合器 + layer）、全局绘图对象。

---

## 2. DOM / Price Ladder — `DOMLadder`

**Purpose**：以价格梯子实时表示 L2、BBO、累计深度、近期成交、自己订单和持仓，同时成为安全 Order Draft 入口。

**参考与 Source IDs**：ATAS `ATC-014, ATC-021` · TradingView `TV-020` · TapeDelta `TD-013–015` · TSP `TSP-091` · Nautilus UI `NTA-018, NTW-013, NTW-016` · Bookmap、Binance L2：未定位（未纳入 904 表）。

**Required Data**：`BookSnapshot + BookDelta + QuoteL1 + TradePrint + OwnOrders + Position`。默认 `depth: 50 · priceAggregationTicks: 1 · autoCenter: true`。

**Features + Acceptance**

| P | 功能 | 行为 | Acceptance |
|---|---|---|---|
| MVP | 50×2 levels | Price / BidQty / AskQty | Snapshot 50 档后显示准确 |
| MVP | Incremental reducer | Delta 只改变化价位 | 改 1 档不能重建 100 档 |
| MVP | Sequence gap | gap → resync | 手造跳号必须进入 gap |
| MVP | Qty=0 delete | 删除价位 | delta qty 0 后价位消失 |
| MVP | BBO | best bid / ask | 与本地簿顶端一致 |
| MVP | Spread / Mid | 动态计算 | BBO 改变立即更新 |
| MVP | Cum depth | 可开关 | Cum = 当前到该档总量 |
| MVP | Depth histogram | 按可见深度 | 最大档改变比例重算 |
| MVP | Last trade | 价位标记 | Trade 落在哪档就更新 |
| MVP | Tick aggregation | 1 / 2 / 5 / 10 | 5 ticks 后量正确求和 |
| MVP | Auto-center | 可暂停 | 手动滚动后不抢回中心 |
| MVP | Own orders | price-level marker | order accepted 后出现 |
| MVP | Position / avg / PnL | 明确 account / mode | account 切换同时切换 |
| MVP | Click → Order Draft | 不默认 live one-click | 点 Ask 只预填 Sell Limit |
| MVP | Unsupported L2 | 显示原因 | L1-only 不能生成假深度 |
| P1 | Traded Bid / Ask | 价位成交统计 | Aggressor 正确累计 |
| P1 | Delta | AskTrade − BidTrade | Unknown 不强分 |
| P1 | Pulling / Stacking | depth change | 10→30 显 +20 |
| P1 | Hotkeys | 权限化 | Live 锁定时不能绕过 |
| P2 | MBO / queue | capability gated | MBP 不推断伪 queue position |

**L2 状态机**：`loading → live（snapshot）`；`live → stale（timeout）`；`live → gap（sequence break）→ resyncing → live（snapshot）`；`live → disconnected → resyncing`。本地簿 reducer 在后端 / Worker，前端收的是已经 reduce 过的档位 + 序列状态。

**Human Representation**：`DOMLadder` → DOMLadder；`DepthBars` → DOMLadder 深度柱；`DOMTradingStrip` → DOMLadder 底部下单条（ATAS 对照补齐）；`OrderBookStatus` → DOMLadder 顶部状态行（StatusLED：live / gap / resyncing / stale + seq + 最后事件时间）。

**Agent Artifact**

```ts
interface DOMArtifact {
  tool: "dom"; instrument: InstrumentRef; asOf: string; seq?: string | number;
  bestBid?: number; bestAsk?: number; spread?: number;
  levels: Array<{ price: number; bidQty: number; askQty: number; cumBid?: number; cumAsk?: number }>;
  imbalance?: number; ownOrderIds?: string[]; positionRef?: string; quality: DataQuality;
}
```

**性能**：本地 Book Reducer 与 React 解耦；高频数据保存在 Map / Typed Array / External Store，价位行 virtualized / imperative rendering（engineering.md §2.1 "结构化矩阵"策略）。> 200 levels 强制 virtualize。

**ATAS 长尾（atas.md §2.4）**：Smart DOM 全部列（Footprint 列、流动性变化、成交列）、Link Price Axis（LinkContext `priceRange`）、全局绘图对象进 DOM、Cancel Bids / Cancel Asks、热键专区。

---

## 3. Footprint / Cluster — `Footprint`（PriceChart flow 层）

**Purpose**：将逐笔成交按 `bar × price level` 聚合，表示主动买卖、Bid×Ask、Volume、Delta、POC、不平衡和成交结构。它是 PriceChart 的一种显示模式，与绘图、指标、ChartTrader、统计行共用坐标系。

**Source IDs**：`ATC-001–006, ATC-009–013, TD-009–011`；Bookmap 成交气泡：未定位。

**Required Data**：`TradePrint[] · InstrumentRules.priceTick · BarDefinition · SessionCalendar · Optional L2/BBO`。聚合、失衡、POC、VA 在后端 / 本机引擎算，前端只收 `{levels, poc, imbA/B, stackA/B, va}`（样机已验证：PriceChart 卡）。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Bid×Ask cell | sell3 + buy7 → `3 × 7` |
| MVP | Volume mode | 同 cell = 10 |
| MVP | Delta | 7 − 3 = +4 |
| MVP | Bar total | cells 求和 = bar total |
| MVP | POC | 最大成交价位 |
| MVP | Bar Delta | 所有 cells Delta 求和 |
| MVP | Max / Min Delta | 正确提取极值 |
| MVP | Diagonal imbalance | 默认 ratio 300%，参数可调 |
| MVP | Minimum-volume filter | 小 cell 可隐藏但统计策略明确 |
| MVP | Number mode | 数值 |
| MVP | Histogram mode | 直方 |
| MVP | Combined | 数值 + heat |
| MVP | CVD | session-aware |
| MVP | Selected range stats | 选区独立统计 |
| MVP | Replay safe | 绝不出现未来成交 |
| P1 | Stacked imbalance | N 个连续 level |
| P1 | Zero print | 规则显式 |
| P1 | Unfinished auction | 规则显式 |
| P1 | Absorption hint | 必须标 inferred |
| P1 | Exhaustion hint | 必须标 inferred |
| P2 | Cluster Search DSL | 规则可保存和回放 |

**默认设置**：`mode: bid_x_ask · priceAggregationTicks: 1 · imbalanceRatio: 3.0 · minImbalanceVolume: 10 · sessionReset: venue_session · cellStyle: number_heat`。（失衡默认从 ATAS 的 150% 改为规格的 300%。）

**Human Representation**：Footprint 卡（flow 层规格 + 首版实装）；PriceChart 卡（`@katana/chart` 引擎上的同一 flow 层）；ClusterSearch 卡（P2 DSL）；统计行 = Cluster Statistics（正式版做成 native indicator 子 pane）。

**Agent Artifact**

```ts
interface FootprintArtifact {
  tool: "footprint"; instrument: InstrumentRef; barDefinition: Record<string, unknown>;
  range: { from: string; to: string }; barsRef: string;
  summary: { volume: number; buy?: number; sell?: number; delta?: number; poc?: number };
  imbalances?: Array<{ ts: string; price: number; side: "buy" | "sell"; ratio: number }>;
  quality: DataQuality;
}
```

**性能**：所有 price cells Canvas / WebGL 绘制，不允许一格一个 React component。验收：500 根可见 × 20 档含文字，p95 帧时 ≤ 8ms（engineering §2.2）。

**ATAS 长尾（atas.md §2.1）**：10 内容模式 × 7 可视化 × 9 配色、Additional Footprint、Filters 6 类、Maximum Level Highlighting 6 类、Proportion 4 模式、Scale / Auto、Footprint 热键、Cluster Statistics 16 行 + 14 项告警、Order Flow chart 模式、Magnifier。样机已有：10 × 4 × 4、失衡 / 堆叠 / POC / VA / 统计行 / Auto Transform。

---

## 4. Smart Tape / Time & Sales — `SmartTape`

**Purpose**：把 raw trades 做成人能处理的逐笔成交带，同时保留"原始事实"和"显示聚合"的边界。不能退化成普通 DataGrid。

**Source IDs**：`ATC-011, ATC-015, OTU-014, OTL-043, TD-012`；Bookmap sweep / large trades：未定位。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Time / Price / Size / Side | 1000 trades 顺序不乱 |
| MVP | Event vs receive time | 两者分开 |
| MVP | Buy / Sell / Unknown | unknown 不假设 |
| MVP | Size filter | 10 阈值：9 隐藏、10 显示 |
| MVP | Side filter | Buy-only 正确 |
| MVP | Price range | 区间筛选 |
| MVP | Time / price / side aggregation | 可展开 raw prints |
| MVP | Large trade | threshold 明确 |
| MVP | trades / sec | 固定窗口 |
| MVP | volume / sec | 固定窗口 |
| MVP | Pause | 后台仍缓存 |
| MVP | Resume latest | 不丢事件 |
| MVP | Select → Chart | 定位 ts / price |
| MVP | Replay | virtual clock 顺序 |
| P1 | Sweep | 短窗吃多档 |
| P1 | Burst | 短窗高成交速率 |
| P1 | Venue | Provider 有才显示 |
| P1 | Latency | 无 recv timestamp 则 unavailable |
| P1 | Liquidation | Crypto 独立 event type |
| P2 | Hidden liquidity | inferred + model version |

**设置**：`retentionTrades: 50000 · visibleRows: 1000 · aggregationWindowMs: 50 · sound: false · sortBy: event_time · largeTradeThreshold: "auto-p95"`。`auto-p95` 必须在 UI 说明它是统计阈值，不得让人误认为交易所定义的大宗成交。

**Human Representation**：SmartTape（append-only 策略，engineering §2.1）；速度条 = FlowGauges；选择 → PriceChart 定位走 LinkContext Selection 层。

**Agent Artifact**

```ts
interface TapeArtifact {
  tool: "smart-tape"; instrument: InstrumentRef; range: { from: string; to: string };
  filters: Record<string, unknown>; rawTradesRef: string; aggregateRef: string;
  pulse?: { tradesPerSec: number; volumePerSec: number; buyRatio?: number };
  anomalies?: Array<{ type: string; method: string; confidence?: number; ts: string }>;
  quality: DataQuality;
}
```

**ATAS 长尾（atas.md §2.5）**：Smart Tape 聚合分散成交、颜色 / 声音规则、买卖主导、Bid/Ask Tape（RT & Historical）、Cumulative Trades、Linked Windows。

---

## 5. L2 Order Book Heatmap — `DOMHeatmap`

**Purpose**：展示 `Time × Price × Displayed Liquidity` 并叠加真实成交。

**Source IDs**：`TD-012–015, TD-020, ATC-003, ATC-014, ATC-019`；Bookmap：未定位。

**Required Data**：`BookSnapshot · BookDelta · TradePrint · QuoteL1 · Heatmap tile/history storage`（tile 在后端 / 本机引擎生成，前端收纹理 / 列数据）。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | liquidity heatmap | qty 10→100→0 强度增 → 消失 |
| MVP | price / time axes | 与 Chart 对齐 |
| MVP | BBO overlay | 不能拿 last 替代 |
| MVP | trade bubbles | size 与成交量关系稳定 |
| MVP | aggressor bubble | unknown 单独表达 |
| MVP | add liquidity | +ΔQty |
| MVP | remove liquidity | −ΔQty |
| MVP | current depth edge | 等于当前虚拟 / 实时簿 |
| MVP | Zoom / Pan | tooltip 返回历史值 |
| MVP | Tick aggregation | 1 / 2 / 5 / 10 |
| MVP | Gap band | gap 不能插值填平 |
| MVP | Replay | 同一个 reducer |
| P1 | Liquidity age | 价位 persistence |
| P1 | Pulling / Stacking overlay | 明确窗口 |
| P1 | Region selection | 输出统计 artifact |
| P2 | 3D | display option（DOMHeatmap 3D 视图模式） |
| P2 | MBO age | Provider 有 MBO 才启用 |
| P2 | Iceberg inference | model / confidence 必须显示 |

**设置**：`depth: 50 · timeBucketMs: 100 · priceBucketTicks: 1 · intensityScale: log1p · gapInterpolation: false · tradeBubbleMaxPx: 20`。

**Human Representation**：DOMHeatmap（自研 Canvas 2D，WebGPU / WebGL2 栅格后端 P2）；MBOTrackers（P2）；"与 Chart 对齐"= 与 PriceChart 共用 `ChartSurface`（同一个 priceToY，tick 级 x）。

**Agent Artifact**

```ts
interface L2HeatmapArtifact {
  tool: "l2-heatmap"; instrument: InstrumentRef;
  range: { from: string; to: string; low: number; high: number }; depth: number;
  aggregation: { timeMs: number; priceTicks: number };
  heatmapRef: string; tradesRef?: string; regionStats?: Record<string, number>;
  gapRanges: Array<{ from: string; to: string }>; quality: DataQuality;
}
```

**性能**：必须使用 Canvas / WebGL / tile texture，不准使用 price×time DOM cells。

**ATAS 长尾（atas.md §2.9）**：Heatmap 热键专区、MBO Bundle、撤单余晖、气泡层（regl-scatterplot 候选）。

---

## 6. Volume / Market Profile — `VolumeProfile`

**Purpose**：将成交按价格聚合，并明确分析范围：Session / Visible Range / Fixed Range / Selected Range。

**Source IDs**：`ATC-003, ATC-006, ATC-010, ATC-013, TD-005, TD-006, TD-013, OTL-017`。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Session Profile | session 边界后新 profile |
| MVP | Visible Range | viewport 变则重算 |
| MVP | Fixed Range | 视口变也不变 |
| MVP | Selected Range | 只算选区 |
| MVP | Volume by Price | 聚合正确 |
| MVP | POC | max-volume price |
| MVP | Value Area | 默认 70% |
| MVP | VAH / VAL | 可复现 |
| MVP | Buy / Sell Profile | 有 aggressor 才开 |
| MVP | Delta Profile | Buy − Sell |
| MVP | Tick aggregation | 重算 POC |
| MVP | Source / range metadata | POC 可追溯 |
| P1 | TPO | 默认 30 min |
| P1 | Initial Balance | 默认 session 前 60m |
| P1 | Developing POC | 不看未来 |
| P1 | Developing VA | 不看未来 |
| P1 | HVN / LVN | 参数可见 |
| P1 | Merge / Split | volume conservation |
| P2 | Composite Profile | 多 session |
| P2 | Naked POC | 触达规则明示 |

**默认**：`valueAreaPct: 0.70 · priceAggregationTicks: 1 · tpoPeriodMinutes: 30 · initialBalanceMinutes: 60`。Crypto 的 Session 未指定，默认 UTC 00:00–24:00，必须允许 Workspace / User 自定义（markets.md）。

**Human Representation**：VolumeProfile（共享聚合器；四种范围都是引擎算、图画）；DrawingToolbar 的 TPO / Anchored VWAP / Dynamic POC 对象共用同一聚合器。

**Agent Artifact**

```ts
interface ProfileArtifact {
  tool: "volume-profile"; instrument: InstrumentRef;
  profileType: "session" | "visible" | "fixed" | "tpo"; range: { from: string; to: string };
  priceAggregationTicks: number; valueAreaPct: number;
  poc?: number; vah?: number; val?: number; totalVolume?: number;
  levelsRef: string; developingRef?: string; quality: DataQuality;
}
```

---

## 7. Replay / Market Simulator — `ReplayBar` + 后端回放服务

**Purpose**：真正的 Replay 不是逐 K 线播放，而是：Recorded Market Events → Replay Clock → L1 / L2 / Trades / Bars → 同一套 Chart / DOM / Tape / Heatmap → Paper Execution Simulator → Orders / Fills / Positions / PnL。

**架构决定（对齐 4）**：虚拟时钟与事件回放在 Katana / 本机引擎；回放流发出与 live **完全相同**的消息类型，前端工具不知道自己在回放（只从 `DataQuality.mode = "replay"` 得知并永久标 REPLAY）。样机 `replay 30 4` 已按此做。

**Source IDs**：`ATC-019, TV-014, TD-018, OTU-010, OTL-018, TSP-068`；Bookmap / Nautilus 官方架构：未定位。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Unified virtual clock | 所有工具同一 timestamp |
| MVP | Play / Pause | Pause 时虚拟时间停 |
| MVP | 0.25×–10× | 状态事件顺序不丢 |
| MVP | Step event | 下一 market event |
| MVP | Step trade | 下一 TradePrint |
| MVP | Step bar | 下一 bar boundary |
| MVP | Jump timestamp | checkpoint 恢复 |
| MVP | Reset | 恢复账户 + 市场初始状态 |
| MVP | Bars | 与 Live Chart 同 schema |
| MVP | Trades | 与 Live Tape 同 schema |
| MVP | L1 | 与 Live 同 schema |
| MVP | L2 | DOM / Heatmap 无 Replay 特制版 |
| MVP | Paper orders | simulator |
| MVP | Market / Limit / Stop | 基础 fill model |
| MVP | Fees | 参数写入 artifact |
| MVP | Slippage | 参数写入 artifact |
| MVP | Bookmarks | timestamp + note + refs |
| MVP | Gap visualization | 缺数据必须显式 |
| MVP | Session save | 配置 / 订单 / 成交可复现 |
| P1 | Branch replay | A/B 决策分支 |
| P1 | Multi-symbol | 单一 Clock |
| P1 | Agent hook | observation → decision → intent |
| P2 | Batch / headless simulation | 不依赖 UI |

**默认 Simulator**：`speed: 1 · checkpointSeconds: 60 · fillModel: touch · slippageTicks: 0 · fees: venue_if_available / fallback unspecified · randomSeed: fixed`。真实 queue model 未实现时明确写 `Fill model: Simplified / Queue-agnostic`。

**Human Representation**：ReplayBar（接管时钟、速度、步进、书签、`REPLAY` 点阵标）；OrderTicket Paper 模式；FillLog 来源标 `replay`。

**Agent Artifact**

```ts
interface ReplayArtifact {
  tool: "replay"; replayId: string; manifestRef: string; clock: string; speed: number;
  status: "paused" | "playing" | "finished"; simulatorConfig: Record<string, unknown>;
  orderIds: string[]; fillIds: string[]; positionSnapshotRef?: string;
  bookmarks: Array<{ ts: string; note?: string; refs?: string[] }>;
  gapRanges: Array<{ stream: string; from: string; to: string }>;
}
```

**ATAS 长尾（atas.md §2.8）**：Market Replay 与 Statistics / Trading Journal 的联动（TradeStats、DecisionJournal）。

---

## 8. Watchlist / Market Monitor — `Watchlist`

**Purpose**：7×24 系统的人类 Market Monitor，不是 `Symbol + Last Price` 收藏夹。

**Source IDs**：`ATC-016, ATC-017, TV-012, FIN-009, TSP-130–132, TSP-139, OTL-008, TRI-001`。

**MVP 列**：Symbol · Venue · Last · Change · Change % · Bid · Ask · Spread · Volume · Turnover [when supported] · Session · Position [when account bound] · Unrealized PnL [when account bound] · Alert · Data Quality · Last Update。Crypto Perp capability 时增加：Mark · Index · Funding · Next Funding · Open Interest · Basis · Liquidation activity [when provided]。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Multiple lists | 保存 / 恢复 |
| MVP | Add / remove / reorder | 顺序持久化 |
| MVP | Core quotes | 逐行增量 |
| MVP | Sort | 更新时不丢 selection |
| MVP | Filter | symbol / venue / asset |
| MVP | Column manager | save column set |
| MVP | Account columns | 切账户重新绑定 |
| MVP | Data freshness | 单标的 stale 不污染全表 |
| MVP | Alert state | triggered / unread / history |
| MVP | Bulk actions | Chart / Alert / Scanner / Research |
| MVP | Preview | Mini chart / quote |
| MVP | Capability columns | Spot 不显示 Funding=0 |
| P1 | Relative volume | 参数 / 基线清楚 |
| P1 | Volatility | timeframe 明示 |
| P1 | Factor / Signal | version / asOf |
| P1 | Result diff | new / removed |
| P2 | Shared / team list | 权限化 |

**Human Representation**：Watchlist（DataGrid "频繁变化的快照"策略）；Preview = SparkTile / PriceChart 缩略；Alert = AlertCenter。

**Agent Artifact**

```ts
interface WatchlistArtifact {
  tool: "watchlist"; watchlistId: string; asOf: string;
  rows: Array<{ instrument: InstrumentRef; metrics: Record<string, number | string | null>;
    positionRef?: string; signalRefs?: string[]; alertRefs?: string[]; quality: DataQuality }>;
  sort: Array<{ field: string; direction: "asc" | "desc" }>; filters: Record<string, unknown>;
}
```

**性能**：1,000 行为 MVP 目标；行情 cell incremental update；排序节流默认 250ms（engineering §2.1 为 300ms，以本页为准），不允许每个 tick 把表格重排到无法操作。

---

## 9. Screener / Scanner — `Screener`

**Purpose**：Universe + Fields + Rules + Rank + Run + Snapshot + Actions 做成一个完整专业工具。

**Source IDs**：`TSP-001–012, TSP-060, TSP-064–077, TSP-100, TSP-103–106, TV-015, FIN-010, OTU-031–033, OTL-003`。

**Required Data**：`UniverseRef · FieldCatalog · FieldValues · FactorVersionRefs · SignalRefs · Optional L2 derived metrics · PointInTime metadata`。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Universe | asOf 成分必须固定 |
| MVP | Nested AND / OR | 保存 AST 不变 |
| MVP | Numeric / string / enum typing | 非法 operator 不出现 |
| MVP | Price / volume | 完整基础字段 |
| MVP | Technical indicators | timeframe 显式 |
| MVP | Factor field | factor version 固定 |
| MVP | Fundamental | Provider 支持时 |
| MVP | Account / position fields | 可做已有持仓筛选 |
| MVP | Rank | deterministic |
| MVP | Top N | 可调 |
| MVP | Preview count | timeout ≠ 0 matches |
| MVP | Save / version | AST + Universe + Versions |
| MVP | Result reason | 每行告诉人为何命中 |
| MVP | Snapshot | 历史结果不漂移 |
| MVP | Export | CSV / JSON |
| MVP | → Watchlist | 固定结果集 |
| MVP | → Chart | InstrumentSelection |
| MVP | → Alert | rule ref |
| MVP | → Backtest | candidateSetRef |
| MVP | Crypto funding / OI / basis | capability gated |
| MVP | L2 imbalance | 无 L2 显 unsupported |
| P1 | Live scanner | incremental |
| P1 | Result diff | new / removed / changed |
| P1 | Scheduled runs | persistent runId |
| P1 | Formula / DSL | fail-closed |
| P2 | Agent-generated rule | Agent 只能生成 Draft AST |

**关键 Acceptance**：今天运行 Scan → 保存 runId=A → 明天再打开 A → 看到的仍然是当时的 Universe + 字段版本 + Results → 点击 Re-run → 生成 B。绝对不能用"打开旧 Scan 时自动用当前数据重新计算"冒充历史结果。

**Human Representation**：Screener（"条件即命令"同源，engineering §7；本地筛选 DuckDB-WASM）；因子字段来自 FactorLibrary 版本；结果动作走命令表。

**Agent Artifact**

```ts
interface ScreenerArtifact {
  tool: "screener"; screenerId?: string; runId?: string;
  universe: { ref: string; asOf: string }; ruleAst: unknown; fieldVersions: Record<string, string>;
  ranking?: unknown; asOf: string; resultsRef: string; matchCount?: number; warnings: string[];
  quality: DataQuality;
}
```

---

## 10. Order Ticket / Execution — `OrderTicket` + `ConsensusBlock`

**Purpose**：Order Ticket 的对象不是"一个表单"，而是 Order Intent → Validation → Risk / Policy → Submit → Real Execution State。

**Source IDs**：`ATC-021, TV-020, FIN-012–014, FIN-036, FIN-155–158, TSP-084–088, TSP-115, NTA-018, NTW-016, NTW-018, OA-014–016`。

**Required Data**：`AccountCapabilities · InstrumentRules · VenueCapabilities · QuoteL1 · Position · RiskCheck · ApprovalPolicy · ExecutionAdapter`。市场规则不写死在组件里（spec.md §5）。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | PAPER / SHADOW / LIVE banner | 不只用颜色 |
| MVP | Account | 切账户旧 risk result 失效 |
| MVP | Instrument | 规则重新加载 |
| MVP | Buy / Sell | 明确 |
| MVP | Quantity | qtyStep 校验 |
| MVP | Notional mode | 无报价时阻止换算 |
| MVP | Market | capability gated |
| MVP | Limit | priceTick snapping |
| MVP | Stop | capability gated |
| MVP | TIF | Venue 驱动 |
| MVP | Buying power | unavailable ≠ 0 |
| MVP | Position availability | 防止非法减仓 |
| MVP | Fee estimate | 缺数据写 unavailable |
| MVP | Margin estimate | Provider / account |
| MVP | Slippage estimate | 方法明示 |
| MVP | Pre-trade risk | pass / warn / block |
| MVP | Paper Submit | 进入模拟执行 |
| MVP | Shadow Submit | 不碰真实 Broker |
| MVP | Live policy | 不能绕过 Gateway |
| MVP | Idempotency | 双击只创建一次 |
| MVP | Unknown state | timeout 不显示成功 |
| MVP | Reduce-only | Perp capability |
| MVP | Post-only | Venue capability |
| MVP | Leverage | Perp / derivative only |
| MVP | Margin mode | capability only |
| MVP | Venue rules | A股 / 期货等 Adapter 注入 |
| P1 | Bracket | parent-child |
| P1 | SL / TP | 与 parent lifecycle 联动 |
| P1 | Trailing | Adapter support |
| P1 | DOM / Chart draft | 外部只能预填 |
| P2 | TWAP / VWAP / Iceberg | Algo execution contract |

**状态机**（XState，engineering §4）：`draft → validating → (invalid → draft | pass → ready) → submitting → accepted | rejected | unknown`；`unknown → accepted | rejected（reconciliation）`；`accepted → partiallyFilled → filled | cancelled`。最重要的一条：**button click success ≠ order accepted ≠ fill**。

**Paper / Shadow / Live**：Paper、Shadow 下 Agent 可以自治、无 Broker side effect；Live 受 Policy / Risk 约束、有 side effect。Live 是否要求每笔人工批准属于部署 Policy，前端不假定；Agent 的动作必须成为显式 `OrderIntent` 并经过后端执行边界。

**Human Representation**：OrderTicket；ConsensusBlock（pre-trade risk 三方必要条件，不是投票）；ExitStrategy（Bracket / SL / TP / Trailing，P1）；ChartTrader 与 DOMLadder 只预填草稿；DecisionQueue 承接需要人批准的 Live 意图。

**Agent Artifact**

```ts
interface OrderIntentArtifact {
  tool: "order-ticket"; intentId: string; mode: MarketMode; accountId: string; instrument: InstrumentRef;
  side: "buy" | "sell"; orderType: string; qty: number; price?: number; stopPrice?: number; tif?: string;
  flags: { reduceOnly?: boolean; postOnly?: boolean }; clientOrderId: string;
  estimates?: { fee?: number | null; margin?: number | null; slippage?: number | null };
  validation: { status: "pass" | "warn" | "block"; reasons: string[] };
  riskCheckRef?: string; approvalRef?: string; state: string;
}
```

**ATAS 长尾（atas.md §2.7）**：Chart Trader 右键 Stop / OCO / Cancel Bids / Asks / Route / Auto Detection、Automatic Protective Orders、Risk Manager、交易面板热键。

---

## 11. Order Blotter / Execution Monitor — `OrderBlotter` + `FillLog`

**Purpose**：回答：谁下的、为什么下、什么账户、什么标的、什么订单、什么时候提交、Gateway 收到了吗、Broker 接受了吗、成交了吗、成交多少、还剩多少、为什么拒绝、有没有 cancel / replace、有没有结果未知。

**Source IDs**：`FIN-035, FIN-036, TSP-087, TSP-088, NTA-018, NTA-019, NTW-002, NTW-016, OA-014–016, TRI-045, TRI-046`。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Streaming order table | 相同 order 更新原行 |
| MVP | Pending | 明确 |
| MVP | Accepted | 明确 |
| MVP | Partially Filled | filled / leaves |
| MVP | Filled | avg fill |
| MVP | Cancel Pending | 不提前显示 cancelled |
| MVP | Cancelled | ack 后 |
| MVP | Rejected | reason code |
| MVP | Unknown | 可 reconcile |
| MVP | Order detail | 完整 timeline |
| MVP | Fills table | fillId / time / px / qty / fee |
| MVP | Cancel | command，不直接改 state |
| MVP | Replace | replace chain |
| MVP | Parent / child ref | 类型先准备 |
| MVP | Creator | Human / Agent / Strategy |
| MVP | Mode | Paper / Shadow / Live |
| MVP | Rationale | Agent intent ref |
| MVP | Approval | 可下钻 |
| MVP | Bulk cancel | 只对可撤单执行 |
| MVP | Export | ISO timestamp |
| P1 | Submit → Ack latency | timestamps 完整才算 |
| P1 | Arrival slippage | benchmark |
| P1 | Basic TCA | fee / impact |
| P1 | Algo child tree | group |
| P2 | Venue quality | 样本和 benchmark 足够才启用 |

**Partial fill Acceptance**：Order Qty 100；Fill A 40 @ 10；Fill B 60 @ 11 → Filled 100、Leaves 0、Avg Fill 10.6。

**Unknown Acceptance**：Submit → connection timeout → UNKNOWN → 不得自动 retry non-idempotently → reconciliation query → Broker says Accepted → UNKNOWN → ACCEPTED；Timeline 保留 timeout event。

**Human Representation**：OrderBlotter（"状态机对象"策略）；FillLog（append-only）；TCA（P1）；详情 timeline = EventTimeline。

**Agent Artifact**

```ts
interface OrderBlotterArtifact {
  tool: "order-blotter"; asOf: string; accountIds: string[]; orderRefs: string[];
  workingCount: number; unknownCount: number; rejectedCount: number;
  selectedOrder?: { orderId: string; intentRef?: string; eventTimelineRef: string; fillsRef: string };
  quality: DataQuality;
}
```

---

## 12. Positions / Account Book — `PositionBook` + `AccountRail` + `CashLedger`

**Purpose**：整套 Agent 系统的现实资本锚点。Actual ≠ Target ≠ Agent Proposed ≠ Shadow ≠ Paper（product.md §3 五层对象、"持仓的五个数"）。

**Source IDs**：`FIN-030–038, TSP-084–088, TRI-033–046, OTL-006, OTL-027–029, NTA-016–021, NTW-003, NTW-017, OA-014`。

**Required Data**：`AccountSnapshot · Position[] · CashLedger[] · OrderRef[] · FillRef[] · FXRate[] · FundingEvent[] · FeeEvent[] · DividendEvent[] · ReconciliationStatus`。

**Features + Acceptance**

| P | 功能 | Acceptance |
|---|---|---|
| MVP | Multi-account | 切账户值完全切换 |
| MVP | Aggregate view | base currency 明确 |
| MVP | Cash | 原币保留 |
| MVP | Equity | asOf / source |
| MVP | Buying power | Provider |
| MVP | Margin used | Provider |
| MVP | Position qty | 账户事实 |
| MVP | Available qty | 与 qty 分开 |
| MVP | Avg cost | 方法可追溯 |
| MVP | Mark | source |
| MVP | Notional | multiplier-aware |
| MVP | Realized PnL | 与 unrealized 分离 |
| MVP | Unrealized PnL | stale mark 时 stale |
| MVP | Cash ledger | 类型化事件 |
| MVP | Fee | 独立 |
| MVP | Dividend | 独立 |
| MVP | Funding | Perp |
| MVP | Orders drilldown | account + instrument |
| MVP | Fills drilldown | 同上 |
| MVP | FX conversion | rate / asOf / source |
| MVP | Paper / Shadow / Live separation | 默认绝不合并 |
| MVP | Reconciliation status | broker vs internal |
| MVP | Target overlay | 不写 actual |
| P1 | Cost lots | FIFO / AVG 等 |
| P1 | TWR | 外部现金流隔离 |
| P1 | XIRR | 现金流可检查 |
| P1 | Greeks | Options |
| P1 | Factor exposure | Portfolio |
| P1 | Sector exposure | Portfolio |
| P1 | Attribution | security / sector / currency / fees |
| P2 | Formal break workflow | assign / resolve / audit |

**关键 Acceptance**：价格流 stale 时显示 `Qty: 10`（账户事实）· `Mark: 123.4 ⚠ stale` · `PnL: 234 ⚠ stale`，不能把整个 Position 变成 unavailable——账户事实过期与市场价格过期是不同质量维度。多币种：USD 持仓 + CNY 基准必须保留 `Original notional · FX · FX asOf · FX source · Base value`，不能只剩换算结果。

**Human Representation**：PositionBook（五视角 + 五个数）；AccountRail（账户集合过滤、PAPER 蓝条）；CashLedger；PnLLedger；TaxLots（P1 cost lots）；BreakWorkbench（reconciliation，P2 正式 break workflow）；GreeksBoard / FactorExposure / BrinsonAttribution（P1）。

**Agent Artifact**

```ts
interface AccountBookArtifact {
  tool: "positions-account-book"; asOf: string; baseCurrency: string;
  accounts: Array<{ accountId: string; mode: MarketMode; equity?: number; cashByCurrency: Record<string, number>;
    buyingPower?: number; marginUsed?: number; quality: DataQuality }>;
  positionsRef: string; cashLedgerRef?: string; fxRatesRef?: string; reconciliationRef?: string;
  totals: Record<string, number | null>;
}
```

---

## 13. 后续工具与优先级（规格名 → 我们的卡）

| 规格文件 | P | 核心功能 | Source IDs | 我们的卡 | 备注 |
|---|---|---|---|---|---|
| factor-workbench | MVP | Formula / DSL、字段 / 算子、Validate、Quick Test、IC / RankIC / IR、NW t、FDR q、Quantile、Long-short、Decay、Turnover、Neutralization、Correlation、Version、Lifecycle、Candidate | `TSP-015–036, FIN-070, FIN-079` | FactorLibrary · FactorIC · QuantileLayers · FactorDecay · RobustnessGate · RunLauncher | **冲突待定**：规格要求应用内公式编辑器（高亮 / 补全 / 错误定位），research.md 定的是"没有脚本编辑器，代码在仓库"。见 spec.md §0 冲突 1 |
| backtest-workbench | MVP | Universe、Strategy、Frequency、Capital、Fees、Slippage、Leverage、Sizing、SL / TP、Constraints、Benchmark、Metrics、Trades、Equity、Drawdown、MC、Optimization、Walk-forward、Purged CV、Compare | `TSP-037–058, FIN-039–057` | RunLauncher · RunInspector · RobustnessGate · EquityCurve · TradeStats · WalkForward · ParamScatter · StrategyCompare | — |
| portfolio-risk | MVP | Exposure、Concentration、VaR / CVaR、Drawdown、Beta、Factor、Liquidity、Correlation、PCA、Stress、Scenario、Risk Contribution、Limits / Breaches | `FIN-118–125, OTU-076–081` | RiskBoard · FactorExposure · StressTest · ExposureTimeline · LossLimits | — |
| agent-task | MVP | Agent、Task、status、current step、tools、progress、blocked、artifact、retry / stop、session、schedule | `OA-003–013, DSH-004–009, DSH-022` | AliceSessions · RunQueue · AgentsStatus | 最低功能线见 §14 |
| agent-evidence | MVP | Finding、Evidence、Citation、Document page、Run、Chart Range、Order / Fill、Data provenance、confidence、contradiction | `OTU-015–022, OA-011–012` | RunInspector 证据节 · HypothesisLedger · Notes · EventTimeline | — |
| agent-approval | MVP | Proposal、rationale、risk delta、scope、expiry、approve / reject / modify、audit | `OA-014–016, DSH-009` | DecisionQueue · ConsensusBlock · DecisionJournal | — |
| data-quality | MVP | Missing、Stale、Duplicate、Outlier、Sequence Gap、Schema Drift、Provider Difference、Coverage、Latency、PIT、Repair | `OTL-050, TRI-050, TSP-089–107` | DataQuality · DataSources · DatasetCatalog | — |
| alert-monitor | MVP | AND / OR、cooldown、dedupe、severity、trigger reason、unread、history、webhook / email、market / account / risk / data alerts | `TSP-069–083, ATC-017, TV-012` | AlertCenter | — |
| research-run-inspector | MVP | Inputs、Versions、Status、Progress、Metrics、Artifacts、Logs、Errors、Evidence、Compare、Re-run | `FIN-055–057, TSP-048–058, OA-006` | RunInspector | — |
| strategy-workbench | P1 | Signal、Entry、Exit、Sizing、Cost、Dependencies、Version、Candidate、Publish、Shadow | `TSP-001–007, TSP-026–029, FIN-040–047` | DeploymentBoard · StrategyCompare · ModelCard | 编辑在仓库（研究层规则） |
| portfolio-construction | P1 | Expected Return、Covariance、Risk Budget、Constraints、Turnover、Cost、Liquidity、Optimizer、Target Weights、What-if | `FIN-070, FIN-079` | RebalanceDesk · FactorExposure | — |
| rebalance | P1 | Actual vs Target、Trades、Cash、Round lot、Fees、Margin、What-if、Approval | — | RebalanceDesk · OrderBasket | — |
| tca | P1 | Arrival、VWAP / TWAP、Implementation Shortfall、Spread、Impact、Delay、Opportunity、Markout、Fees | `OTU-072` | TCA | — |
| reconciliation | P1 | Internal vs Broker Position / Cash / Orders / Fills / Fees / Funding、Break Workflow | `TRI-042–046` | BreakWorkbench | — |
| options-chain | P1 | Chain、Bid / Ask / OI / Volume、Greeks、IV、Expiry / Strike、Strategy | `OTU-042–044` | OptionsChain · GreeksBoard · OptionsFlow | — |
| volatility-surface | P1/P2 | IV / skew / term structure、Greeks surface、scenario | Fincept derivatives | VolSurface | — |
| security-research | P1 | Company、Financials、Estimates、Peers、KPI、Guidance、Filings、Value Chain、Citation | `OTU-012–030` | Fundamentals · NewsFeed · Notes · EventTimeline · CorporateActions | — |
| data-explorer | P1 | Table / Schema / Query / History / PIT / Export / Register-field | `TSP-089–107, OBB-001–009` | SeriesBrowser · DatasetCatalog（DuckDB-WASM） | — |
| provider-manager | P1 | Capabilities、Coverage、Credentials ref、Test、Routing、Fallback、Live / Delayed / Synthetic | `FIN-131–133, TSP-089–091` | DataSources · Entitlements · SymbolMap · Extensions（待卡） | — |
| macro | P2 | Macro series、Events、Regime、Central bank、Inflation | Fincept / Neuberg | RegimeStrip · Calendar（无专卡） | — |
| fixed-income | P2 | Curve、Spread、Duration、Credit、OIS / Forward | Fincept / Neuberg | YieldCurve · BondCalc | — |
| derivatives-surfaces | P2 | Vol / Delta / Gamma / Vega / Theta / Skew / Local Vol / Credit / FX | Fincept surface suite | VolSurface · GreeksBoard | — |
| workflow-editor | P2 | Node graph、Params、Edges、Undo / Redo、Templates、Execution | Fincept workflow | — | **冲突待定**：research.md "不造画布"。见 spec.md §0 冲突 2 |
| plugin-tool-sdk | P2 | Manifest、Ports、Capabilities、Fixtures、Tests、Permissions、Resource Budget | KATANAview 原生 | blueprint §6 SDK · Extensions（待卡） | — |

## 14. 两条最低功能线

**Factor Workbench** 不允许交付"Factor Name + Formula textarea + Run button"。最低：Definition（Name · Description · Universe · Frequency · Version · Formula）· Editor（高亮 · 字段 · 算子 · 函数签名 · 补全 · 模板 · 错误下划线 · 点错误到光标）· Validation（Coverage · IC · Rank IC · IC mean/std · IR · Newey-West t · p-value · BH-FDR q）· Portfolio tests（Quantiles · Long-short · Turnover · Cost · Decay · Sector/Size neutralization · Stability）· Relations（Factor correlation · Redundancy · Existing strategy usage · Portfolio exposure）· Lifecycle（Draft · Validating · Active · Watch · Retired）· Actions（Validate · Compare · Clone · New Version · Combine · Generate Strategy · Backtest · Ask Agent）。Editor 一段是冲突 1 的内容，其余与 FactorLibrary 现有定义一致。

**Agent Task** 不允许做成"头像 + 名字 + 绿灯 + 聊天框"。最低：Agent · Task · Goal · Scope · Bound assets/accounts · Current step · Started at · Elapsed · Tools being used · Progress / indeterminate · Latest evidence · Artifact output · Warnings · Blocked reason · Human action needed · Retries · Stop · Resume · Source session；并支持 Task → Hypothesis → Experiment → Evidence → Candidate → Paper / Shadow → Evaluation 链。这正是 7×24 大屏（基地）真正需要呈现的东西，而不是一排 Agent 在线状态——基地的 agent 房间与任务牌按此补内容（pixel.md）。

## 15. 每个工具最后必须交的表

| Requirement | Result | Evidence |
|---|---|---|
| `[MVP] L2 delta` | PASS | fixture test / screen |
| `[MVP] gap` | PASS | seq 100→102 → gap |
| `[MVP] resync` | PASS | snapshot restores live |
| `[MVP] stale` | PASS | timeout fixture |
| `[MVP] Agent artifact` | PASS | JSON output |
| `[MVP] Paper mode` | PASS | simulated order |
| `[MVP] Unsupported L2` | PASS | L1-only fixture |
| `[P1] Pulling/Stacking` | BLOCKED | not in MVP |
| Production market adapter | BLOCKED | Katana port not connected |

成熟度只用四个标签：**IMPLEMENTED**（组件和交互完成）· **FIXTURE VERIFIED**（确定性样例通过验收）· **BACKEND CONNECTED**（已连接 Katana / provider）· **PRODUCTION VERIFIED**（真实数据 / 账户 / 执行场景独立验证）。只有最后一个才可以宣传成生产功能。按此标准，本库目前所有卡 ≤ IMPLEMENTED；Footprint / PriceChart 样机离 FIXTURE VERIFIED 差：固定 fixture（现为随机 mock）、状态注入（stale / gap / replay / unsupported）、Artifact 输出、验收表。

## 16. 组件库补全进度（2026-10-03）

"补全"按两条线推：**实装**（卡预览是可运行的组件，不是静态图）和**规格对齐**（卡 README 带本页的 MVP 表、状态、Artifact）。成熟度口径 §15。

| 工具 | 卡 | 现状 | 下一步 |
|---|---|---|---|
| Chart | PriceChart | **实装**：`@katana/chart` 段 1–3（见 engineering §2.2），IMPLEMENTED | 固定 fixture + 状态注入测试 + 验收表 → FIXTURE VERIFIED；绘图第二批 |
| Footprint | Footprint | **实装**（首版，自带 ChartSurface），IMPLEMENTED | 与 PriceChart 合流（同一引擎）；Filters / Additional / 可视化 3 种 / 配色 5 种 |
| DOM | DOMLadder | **实装**（2026-10-04）：ATAS Smart DOM 21 列 + DOM Trader 四模式，引擎侧 L2 reducer（gap / resync / stale / offline 真实侦测），默认锁定 → 草稿 → PAPER 撮合（FIFO / LIFO · DAY / GTC），DOMArtifact；**一切可定制**：设置 schema → 面板（常规 / 列 / 交易 / DOM Trader / 颜色 / 模板）= `set` 命令 = Agent 入口，列宽 / 排序 / 显隐、Liquidity map 参数组、颜色回 token、模板九动作 + 三预设、右键菜单、设计模式，localStorage 持久化且不带锁定；IMPLEMENTED | 固定 fixture + 验收表（dom-ladder.md §验收标准 14 条）→ FIXTURE VERIFIED；与 PriceChart 共用价格轴（LinkContext `priceRange`） |
| Smart Tape | SmartTape | 静态预览 + 规格 | 实装：append-only 虚拟列表、聚合 / 展开、速度窗、暂停缓存、Select → Chart |
| Heatmap | DOMHeatmap | 静态预览 + 规格 | 实装：tile 列缓冲、气泡、缺口带、与引擎共坐标 |
| Profile | VolumeProfile | 静态预览 + 规格 | 实装：四种范围、VA / VAH / VAL、TPO（P1） |
| Replay | ReplayBar | 静态预览 + 规格 | 实装：接引擎 `replay / stop / pause`，步进、书签、速度 |
| Watchlist | Watchlist | 静态预览 + 规格 | 实装：DataGrid 快照策略 + capability 列 |
| Screener | Screener | 静态预览 + 规格 | 实装：AST 编辑 + runId 快照 |
| Order Ticket | OrderTicket · ConsensusBlock | 静态预览 + 规格 | 实装：XState 状态机、Paper / Shadow / Live banner、unknown 态 |
| Blotter | OrderBlotter · FillLog | 静态预览 + 规格 | 实装：状态机对象策略、partial fill / unknown 验收 |
| Account | PositionBook · AccountRail · CashLedger | 静态预览 + 规格 | 实装：五个数、stale mark 分维度、多币种来源 |
| 缺卡 | Extensions | 无 | 建卡（provider-manager / plugin-tool-sdk） |

规则：每张实装卡对外暴露 `window.K<Name>.run(cmd)` 与 `artifact()`，与 `/` 命令表同源；带 FIXTURE 标；状态可注入；README 顶部写成熟度。

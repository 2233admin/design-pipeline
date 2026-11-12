# 功能覆盖矩阵：ATAS X · FinceptTerminal · TradingView → KATANA 组件

> **原则（2026-10-03）：能力与 ATAS 1:1，操作用我们的方式**（atas.md §0 有操作翻译表）。ATAS 有的全部要有，包括 3D 热力、聊天、门控——各以我们的形态实现（DOMHeatmap 3D 视图、Talk、Entitlements）。
>
> **2026-10-03 修正**：对 ATAS X 做了逐项核对（atas.md，218 项）。此前本页把 `IndicatorPanel`、`DrawingToolbar`、`ClusterSearch` 标为 ✅ 但它们并没有卡，导致指标与绘图两大块的覆盖是虚的；现已建卡。按 ATAS 全集口径的真实状态是：已覆盖 20% · 部分覆盖 32% · 缺失 43%（其中 48 项落在刚建的四张卡上）· 不做 5%。本页下面的 ATAS 行只标"有没有组件承接"，模式与参数级的差距以 atas.md §二 为准。另：Footprint 由独立面板改为 PriceChart 的 flow 层（engineering.md §2.2）。

三家各自的核心：ATAS = 订单流与盘口，TradingView = 图表、警报、筛选与多图联动，Fincept = 研究、组合、数据连接与 AI 代理。KATANA 不复制任何一家的产品结构，而是把每个功能落到**一个**组件上；一个功能只能有一个归属。

状态：✅ 已有组件规格 · 🟧 第 2 批（组合）· 🟨 第 3 批（发现与交易）· 🟩 第 4 批（资产管理层，asset-management.md）· ⬜ 已定位、下一批 · ✖ 不做（原因）

## 1. 图表与分析（TradingView 主场）

| 功能 | 来源 | KATANA 组件 | 状态 |
|---|---|---|---|
| K 线 / 线 / 面积 / 基线 / Heikin Ashi / Renko / 砖形 | TV, ATAS | `PriceChart`（lightweight-charts，自定义 Series） | 🟨 |
| 成交量 K 线 / Volume candles | TV | `PriceChart` Custom Series | 🟨 |
| 多图联动（symbol / timeframe / 十字线 / 绘图同步） | TV, ATAS Windows Linking | Workspace split 树 + LinkGroup（layout.md） | ✅ |
| 16 图布局 | TV | 布局模板（layout.md，面板先于 tab） | ✅ |
| 绘图工具（趋势线、斐波那契、区间、文本…） | TV 110+, ATAS 33 | `DrawingToolbar`（第 5 批已建卡；33 对象逐项见 atas.md §2.3） | ✅ 卡 · ⬜ 对象 |
| 指标库（400+）/ 社区脚本 | TV, ATAS 290 | `IndicatorPanel`（第 5 批已建卡；46 order-flow 逐项见 atas.md §2.2） | ✅ 卡 · ⬜ 指标 |
| Pine 脚本 / 云 IDE | TV | ✖ 不做自有语言：策略与指标用 Python，走 OpenAlice | ✖ |
| K 线回放（9 速） | TV, ATAS Historical | `ReplayBar` | ✅ |
| 季节性 | TV | `Heatmap`（月 × 年发散） | ✅ |
| 收益日历 | TV | `Calendar`（月历热力，dataviz.md 已定位） | ✅ |
| 市场热力图（板块 × 市值） | TV | `Heatmap` + treemap 变体 | ✅ |
| 期权链 / 策略构建 / Greeks 曲面 | TV, ATAS 14 期权指标 | `OptionsChain` + `GreeksSurface` | ✅ |
| 收益率曲线 | TV | `PriceChart` 多线变体 | 🟨 |
| 宏观 / 80 国经济指标 | TV, Fincept FRED/IMF/WB | 数据源问题，不是组件；`PriceChart` + `DataGrid` | ✅ |

## 2. 订单流与盘口（ATAS 主场）

| 功能 | 来源 | KATANA 组件 | 状态 |
|---|---|---|---|
| Footprint / Cluster 图（10 内容 × 7 可视化 × 9 配色、Additional、Filters、VA） | ATAS, TV Volume footprint | `Footprint` = PriceChart flow 层（engineering §2.2 spike） | 🟨 4 / 10 模式 |
| Smart DOM（价格居中、累计量、自己的单） | ATAS | `DOMLadder` | ✅ |
| Market Depth 热力 / 挂单历史 | ATAS, Bookmap | `DOMHeatmap` | ✅ |
| Smart Tape / Time & Sales / Bid-Ask Tape（大单、聚合、速度） | ATAS | `SmartTape` | ✅ |
| Volume Profile / TPO / Session Profile / POC / VA | ATAS, TV | `VolumeProfile`（TPO 为变体） | ✅ |
| Cluster Search / Big Trades zones / Absorption / Tape Patterns / Exhaustion | ATAS | `ClusterSearch`（第 5 批已建卡） | ✅ 卡 · ⬜ 检测器 |
| Cumulative Delta / Open Interest / Market Statistics | ATAS | `PriceChart` 副图 Series | 🟨 |
| Big Trades / Speed of Tape / Big Orders 指示 | ATAS | `SmartTape` 内置 + `IndicatorPanel` 副图 | 🟨 |
| Widgets：Market Pressure · Price Change · DOM Pressure · Delta Divergence | ATAS 8.0.12 | `FlowGauges`（新卡） | ✅ 卡 |
| Heatmap 3D mode | ATAS Heatmap | `DOMHeatmap` 3D 视图模式（WebGL 高度场） | 🟨 |
| Traders Talk（社区聊天） | ATAS | `Talk`（新卡：频道聚合 + Agent 会话） | ✅ 卡 |
| Tier gating（功能门控 / 配额） | ATAS | `Entitlements`（新卡：计划 / 角色 / 数据源门控，默认全开） | ✅ 卡 |
| MBO Bundle：Icebergs · Stops · Sweeps | ATAS Ultra | `MBOTrackers`（新卡；需 MBO/L3 适配器） | ✅ 卡 · ⬜ 适配器 |
| Options X-Ray：Flow · Big Trades · Strike Profile · Market State；GEX/Charm 热力 | ATAS Pro/Ultra | `OptionsFlow`（新卡）+ `Heatmap` 预设 | ✅ 卡 · ⬜ 适配器 |
| Chart Trader（图上下单、拖单改价、括号单） | ATAS, TV | `ChartTrader`（Primitives 画单 + 命令表） | 🟨 |
| 多连接（10+ 交易所/柜台） | ATAS 20+, TV 100+, Fincept 16 | Quote Hub / 执行网关适配器——不是前端组件 | ✅（架构） |

## 3. 交易与账户（三家都弱，KATANA 补）

| 功能 | 来源 | KATANA 组件 | 状态 |
|---|---|---|---|
| **多账户同时在线、账户集合过滤** | ATAS Account Info（单账户视角）, TV 单券商 | `AccountRail` | 🟧 |
| **持仓：按品种 / 账户 / 策略 / 资产类别 / 品种×账户** | ATAS Positions, Fincept Portfolio, TV Portfolio | `PositionBook` | 🟧 |
| 挂单 / 部分成交 / 待确认 | ATAS Orders, TV | `OrderBlotter` | 🟧 |
| 成交记录 | ATAS Trades | `FillLog` | 🟧 |
| 风险管理（限额、保证金、集中度、VaR） | ATAS Risk Manager, Fincept VaR/Sharpe | `RiskBoard` · `LossLimits`（限额类型待补；`limit.set` 待决） | 🟧 |
| SL/TP 自动出场（Simple / Multi-Level / Breakeven / Trailing） | ATAS SL/TP | `ExitStrategy`（新卡；三个下单入口共用） | ✅ 卡 |
| 跟单 / Following Manager | ATAS | `AccountMirror`（新卡；镜像在网关） | ✅ 卡 |
| 盈亏归因（按品种 / 账户 / 策略） | Fincept Portfolio, TV 报表 | `PnLAttribution` | 🟧 |
| 下单票（手数、价格、条件、算法） | ATAS Trading panel, TV | `OrderTicket`（核心界面，不可皮肤化） | 🟨 |
| 模拟 / 纸交易账户 | TV Paper, Fincept paper engine | Account.kind = paper，AccountRail 标识 | 🟧 |
| 交易统计（胜率、盈亏比、MAE/MFE、持仓时长分布） | ATAS Statistics, TV 策略报表 | `TradeStats` | 🟩 |
| 组合优化（均值方差、风险平价、Black-Litterman） | Fincept Portfolio, OpenBB | Lab 跑，结果进 `RebalanceDesk` 目标权重 | 🟩 |
| 再平衡 / 篓子单 | 机构标准 | `RebalanceDesk` → `OrderBasket` | 🟩 |
| 绩效报告（区间 / 滚动 / 回撤 / 月度） | Fincept Portfolio Monitor, OpenBB | `PerformanceReport` | 🟩 |
| 因子暴露 / Brinson 归因 | Fincept Analysis, OpenBB | `FactorExposure` 🟩 / `BrinsonAttribution` ✅ | 🟩 |
| 压力测试 / 情景 | Fincept Risk | `StressTest` | 🟩 |
| 现金流账 / 公司行动 / 批次成本 | 券商对账单 | `CashLedger` 🟩 / `CorporateActions` ✅ / `TaxLots` ✅ | 🟩 |
| 基本面三表 / 估值 | Fincept Equity Research, TV | `Fundamentals` | 🟩 |
| 成交成本分析 | 机构标准 | `TCA` | ✅ |

## 4. 发现与监控

| 功能 | 来源 | KATANA 组件 | 状态 |
|---|---|---|---|
| 自选（多列表、同步） | TV, ATAS Watchlist | `Watchlist`（DataGrid 预设列 + LinkGroup 写入） | 🟨 |
| 筛选器（股票 / ETF / 可转债 / 期货；400+ 字段） | TV 6 个 Screener | `Screener`（TanStack Form 条件 + DataGrid 结果，条件可存为命令） | 🟨 |
| 警报（价格 / 指标 / 绘图 / 多条件 / Webhook） | TV 13 类, ATAS Tape alerts | `AlertCenter` + 告警阶梯（states.md） | 🟨 |
| 经济 / 财报 / 分红 / IPO 日历 | TV | `Calendar` 事件变体 + `EventTimeline` | ✅ |
| 新闻流 | TV, Fincept News | `NewsFeed`（Virtual 列表，情绪不上色） | ✅ |
| 异动 / 事件时间线 | TV, 自研 | `EventTimeline`（dataviz.md 已定位） | ✅ |
| 基本面 / 财报三表 / 估值 | TV, Fincept Equity Research, DCF | `DataGrid` + `PriceChart`；DCF 是 Lab 产物 | ✅ |

## 5. 研究与自动化（Fincept 主场）

| 功能 | 来源 | KATANA 组件 | 状态 |
|---|---|---|---|
| 回测 / 深度测试 / 报表导出 | TV Strategy Tester, Fincept | `EquityCurve` + `FactorIC` + `QuantileLayers` + DataGrid 导出 | ✅ |
| 参数敏感性 / Optuna | 自研 | `ParamScatter`（dataviz.md 已定位） | ✅ |
| Walk-forward | 自研 | `WalkForward`（dataviz.md 已定位） | ✅ |
| AI 代理 / BYO-LLM / MCP | Fincept 37 agents | OpenAlice，走同源命令；KATANA 只显示 run 与证据 | ✅（边界） |
| 可视节点编辑器 | Fincept Node Editor | ✖ 不做：研究流程是 OpenAlice 的 session/task，不在前端拖节点 | ✖ |
| 数据连接器管理（100+） | Fincept | `DataSources`（运行中心面板：连接状态 LED + 覆盖范围 Meter） | ✅ |
| 系统运行 / 连接监视 | ATAS Connection Monitor | 运行中心 + `StatusLED` + rendering.md 面板 | ✅ |

## 5a. FinceptTerminal 38 模块逐项映射

Fincept 的功能全要，前端不要：它一个模块一个页面、互不联动，41 个模块就是 41 个 tab。KATANA 把每个模块落成一个面板、一个命令或一个数据源，进同一个 split 树与 LinkContext。取 = 功能照拿；改 = 功能拿、形态换；并 = 并入已有组件；不取。

| Fincept desk | 模块 | KATANA 落点 | 取舍 |
|---|---|---|---|
| Agentic Research | AI Chat | OpenAlice 会话，GO Bar `ask` 命令；不做独立聊天页 | 改 |
| | Agent Config / MCP Servers | 运行中心 `DataSources` 旁的 `AgentsStatus`（只显示，配置在 OpenAlice） | 改 |
| | Node Editor | ✖ 研究流程是 OpenAlice session / task | 不取 |
| | Report Builder | `report.build` 命令 + 运行中心排程；面板快照 + Alice 文字 | 改 |
| | Code Editor | ✖ 用户自己的编辑器 + Claude Code | 不取 |
| Quant Lab | AI Quant Lab | Lab 工作区 + OpenAlice | 改 |
| | Backtesting | EquityCurve / FactorIC / QuantileLayers / TradeStats | 取 |
| | Alpha Arena | `StrategyCompare`（去排行榜化：对照表，不是竞技场） | 改 |
| | Surface Analytics | `VolSurface`（热力为默认，3D 高度场为视图模式，同 DOMHeatmap） | 改 |
| Deep Fundamental | Equity Research | `Fundamentals`（三表 / 比率 / 估值瓦片 / 同业） | 取 |
| | Portfolio | PositionBook + RebalanceDesk + PnLAttribution | 取 |
| | Portfolio Monitor | 组合「监控」台面（AccountRail + SparkTile 行 + AlertCenter） | 并 |
| | Derivatives / F&O | OptionsChain / GreeksBoard / VolSurface | 取 |
| | Alt Investments | SeriesBrowser + PositionBook assetClass `fund / alt` | 并 |
| | M&A Analytics | ✖ 第一版不做 | 不取 |
| | Relationship Map | `RelationGraph`（v3） | 取（晚） |
| Markets & Execution | Markets | Watchlist / Screener / PriceChart / Heatmap（市场热力） | 取 |
| | Equity / Crypto Trading | OrderTicket / ChartTrader / DOMLadder / OrderBlotter；市场差异在 Profile | 并 |
| | Algo Trading | OrderBlotter 算法行 + OrderBasket 分批；算法本身在执行网关 | 并 |
| | Watchlist | Watchlist | 取 |
| | Trade Viz | PriceChart 成交标记 + MAE/MFE（TradeStats 联动） | 并 |
| | Polymarket | ✖ | 不取 |
| Macro & Global | Global Data | `SeriesBrowser` | 取 |
| | Data Sources / Data Mapping | 运行中心 `DataSources` / `SymbolMap` | 取 |
| | News / RSS Feeds | `NewsFeed`（情绪不上色；RSS 是源之一） | 取 |
| | Geopolitics / Maritime | ✖ 不在量化工作台范围 | 不取 |
| Workspace | Dashboard | 总览 Workspace（`T` 模板） | 并 |
| | Excel | DataGrid 导出 CSV / XLSX + 剪贴板表格；不嵌表格编辑器 | 改 |
| | Notes | `Notes`（Markdown，链接到品种 / run / 订单） | 取 |
| | File Manager | ✖ 操作系统的事 | 不取 |
| | Action Center | 运行中心任务队列（OpenAlice tasks 的投影） | 并 |
| | Docs / Settings / Profile / About | 设置 = rendering.md 面板 + 账户配置；文档外链 | 并 |
| QuantLib 18 模块 | Portfolio / Risk / Analysis / Curves / Pricing / Instruments / Volatility / Models / ML / Regulatory… | 全部是 **Lab 的计算后端能力**（OpenAlice 调用 Python 库），前端只需要结果的图与表：优化结果 → RebalanceDesk 目标；VaR / 压力 → RiskBoard / StressTest；估值 → Fundamentals 瓦片；曲线 → YieldCurve；曲面 → VolSurface；因子 → FactorExposure | 取（后端） |

结论：38 个模块里 **取 14、改 8、并 10、不取 6**。不取的六个（Node Editor、Code Editor、M&A、Polymarket、地缘 / 海事、File Manager）都不是量化工作台该做的事。

## 5b. 中国市场支持

三家都把"市场"当成连接器问题；KATANA 把它当成 **Market Profile**（markets.md）：涨跌约定、日历、价格限制、结算、整手、tick、flags、数据级别，按品种解析。中国市场逐项清单在 markets.md §3，每项有落点组件。状态：Profile 模型 ✅，具体市场配置是人工提供物（blueprint §7）。

## 6. 不做清单（与三家刻意不同）

- 面板级 tab、壳内浮动窗（ATAS Topmost / TV popout 式的窗内悬浮）。**弹出到独立浏览器窗口是做的**（多显示器，上下文经 BroadcastChannel 同步，atas.md §0）。
- 想法流 / 排行榜 / 创作者市场（TV）。聊天本身做（Talk 卡：频道聚合 + Agent 会话，不自建社区）。
- 海事追踪、地缘关系图（Fincept）：不在量化工作台范围。
- 自有脚本语言（Pine）：Python 已经够。
- 饼图、健康分、仪表盘式"综合评分"。

## 7. 下一批顺序

第 3、4 批已完成。**第 5 批（2026-10-03，ATAS 对照）**：建卡 IndicatorPanel · DrawingToolbar · ClusterSearch · Workspaces · ExitStrategy · FlowGauges · MBOTrackers · OptionsFlow · AccountMirror；并给 Footprint / DOMLadder / SmartTape / VolumeProfile / DOMHeatmap / ChartTrader / OrderTicket / ReplayBar / TradeStats / AlertCenter / LossLimits / PriceChart / Preferences 各加「ATAS 对照补齐」节。下一步按 atas.md §4.2：P0 = ChartSurface + flow 层 spike、bars/builder、IndicatorPanel 首批 12 指标、DrawingToolbar 几何 + 斐波那契 + AVWAP、DOM / Tape 交易语义、ExitStrategy Simple、LinkContext `priceRange`。

# KATANAview 总蓝图：需要什么，一次列全

这一页是总账。工作区 → 台面 → 面板 → 数据模型 → 命令 → 后端服务 → 前端基础设施 → 人工提供物 → 阶段。其它 *.md 是各部分的细则，这里只列清单与归属，不重复规则。工程上每一项都有成熟答案，这里把答案选定。

## 0. 一句话

**KATANAview = Capital + Alpha + Agents**（product.md）：面向单人量化公司的资本与 Alpha 操作系统，四个闭环（Alpha / Capital / Execution / Learning）、五层对象（事实 / 假设 / 预期 / 计划 / 结果）、Alpha 保全账。落到工作台上是一台开源量化工作机：**盯盘（Desk）· 研究（Lab）· 管组合（组合）· 看机器（运行中心）· 一屏总览**，五个 Workspace；面板先于 tab；行情走独立路径；GUI / 快捷键 / CLI / MCP / OpenAlice 调同一张命令表；市场是配置；一切数字可追到 run 或账户事实。

## 1. 工作区 × 台面 × 面板

| Workspace | 台面（布局模板） | 面板 |
|---|---|---|
| **总览 = Profit & Capital Cockpit** | `T` 变体 | 上：Capital（AccountRail 摘要 + SparkTile）· PnL（IntradayPnL 缩略）· Trust 带（DataSources / SystemHealth / BreakWorkbench 灯）；下左：**DecisionQueue**；下右四格：Strategy（DeploymentBoard 缩略 + 占用 vs 贡献条）· Risk（RiskBoard / LossLimits 缩略）· Execution（OrderBlotter 合计 + TCA 当日）· Research（HypothesisLedger 待办 + RunQueue）。product.md §4 |
| **Desk** | 盯盘 `2x2` | Watchlist · PriceChart(+ChartTrader) · DOMLadder · PositionBook |
| | 订单流 `1+2` | PriceChart(flow 层 Footprint + FlowGauges 行) · DOMHeatmap · SmartTape · VolumeProfile；ClusterSearch / MBOTrackers 可替入 |
| | 回放 `2x1` | PriceChart · DOMLadder + ReplayBar |
| | 下单 `1+2` | PriceChart · OrderTicket(+ExitStrategy) · OrderBlotter |
| | 基本面 `1+2` | PriceChart · Fundamentals · NewsFeed |
| **Lab** | 数据 `1+2` | DatasetCatalog · DataQuality · SeriesBrowser |
| | 因子 `1+3` | FactorLibrary · FactorIC · QuantileLayers · FactorDecay |
| | 模型 `1+2` | ModelCard · FeatureImportance · ParamScatter |
| | 回测 `1+3` | EquityCurve · TradeStats · PnLAttribution · RunInspector |
| | 验证 `2x2` | WalkForward · StrategyCompare · RegimeStrip · EventStudy |
| | 上线 `T` | DeploymentBoard · RunQueue · SignalMonitor |
| | 偏离 `1+2` | LiveDivergence · FillLog · TCA |
| **组合** | 监控 `T` | AccountRail · SparkTile 行 · PositionBook · AlertCenter |
| | 构建 `1+2` | RebalanceDesk · FactorExposure · OrderBasket |
| | 执行 `2x2` | OrderBlotter · FillLog · TCA · PriceChart |
| | 绩效 `1+3` | PerformanceReport · PnLAttribution · BrinsonAttribution · Calendar |
| | 风险 `2x2` | RiskBoard · StressTest · FactorExposure · Heatmap(相关) |
| | 账务 `1+2` | CashLedger · CorporateActions · TaxLots |
| | **盈亏** `1+3` | IntradayPnL（主）· PnLLedger · LossLimits · ExposureTimeline；任一持仓双击 → PositionHistory |
| **运行中心** | `3x2` | RunQueue · AliceSessions · DataSources · SymbolMap · AgentsStatus · SystemHealth · RENDER 设置 · ReportBuilder 排程 |

发现类面板（Watchlist / Screener / AlertCenter / Calendar / NewsFeed / EventTimeline）可放进任何 Workspace。用户可自建 Workspace 与模板。

## 2. 组件总清单（104，全部有卡；2026-10-03 按 ATAS X 对照 +11，见 atas.md）

| 组 | 组件 |
|---|---|
| **决策 3** | DecisionQueue · AlphaLedger · DecisionJournal |
| **对账 1** | BreakWorkbench |
| 签名 1 | ConsensusBlock（DotMatrix 为标本页）|
| 工作台 10 | PanelFrame · WorkspaceTabs · Splitter · Toggle · LCDReadout · Meter · StatusLED · CommandLine · StatusBar · Preferences |
| 基元 2 · 点阵 1 · 数据 1 | Controls · Overlays · DotMatrix · DataGrid |
| 图表 9 | PriceChart · EquityCurve · FactorIC · QuantileLayers · Heatmap · Footprint（= PriceChart flow 层）· SparkTile · **IndicatorPanel** · **DrawingToolbar** |
| 订单流 8 | DOMLadder · DOMHeatmap · SmartTape · VolumeProfile · ReplayBar · **ClusterSearch** · **FlowGauges** · **MBOTrackers** |
| 发现 7 | Watchlist · Screener · AlertCenter · Calendar · NewsFeed · EventTimeline · **Talk** |
| 交易 3 | OrderTicket · ChartTrader · **ExitStrategy** |
| 组合 7 | AccountRail · PositionBook · OrderBlotter · FillLog · RiskBoard · PnLAttribution · **AccountMirror** |
| **盈亏 6** | PnLLedger · IntradayPnL · PositionHistory · TaxLots · LossLimits · ExposureTimeline |
| 资产管理 11 | RebalanceDesk · OrderBasket · PerformanceReport · FactorExposure · StressTest · CashLedger · TradeStats · Fundamentals · BrinsonAttribution · TCA · CorporateActions |
| 衍生品 4 · 固收 2 | OptionsChain · GreeksBoard · VolSurface · **OptionsFlow** · YieldCurve · BondCalc |
| 研究 18 | HypothesisLedger · RobustnessGate · FactorLibrary · RunInspector · RunLauncher · WalkForward · ParamScatter · StrategyCompare · DeploymentBoard · LiveDivergence · DatasetCatalog · DataQuality · SeriesBrowser · FactorDecay · ModelCard（含特征重要性）· RegimeStrip · EventStudy · SignalMonitor |
| 运行中心 8 (+1) | RunQueue · AliceSessions · DataSources · SymbolMap · AgentsStatus · SystemHealth（RENDER 面板在 rendering.md）· **Workspaces**（工作区 + PanelSpec 模板）· **Entitlements**（许可与权限 / 配额 / RBAC）· 待卡：Extensions（适配器与面板包版本 / 启停 · **连接向导**：从 UI 接券商 / 行情，凭证直送后端 vault · 指标包 / 面板包目录）|
| 工具 2 (+1) | Notes · ReportBuilder · 待卡：DiffView（两个 run 的参数 / commit / 数据版本并排） |

RelationGraph（关系图）留到 v3，不计入。五种视觉形态（DataGrid 预设 / 零轴条与双条 / 热力 / 折线与甘特 / 看板与键值）覆盖全部展示——这是**视觉复用原则，不代表工程复杂度**：四个层级四套 DoD、六项面板契约、共同口径见 engineering.md。

## 3. 数据模型（前端持有的全部类型）

| 域 | 类型 | 定义在 |
|---|---|---|
| 外壳 | Workspace · LayoutNode · Pane · LayoutTemplate · LinkGroupId · LinkContext（symbol / timeframe / range / factor / scenario）· AccountSet | Dev Spec §4、layout.md |
| 面板 | PanelSpec · PanelProps · CommandSpec · ConfirmSpec | Dev Spec §4 |
| 行情 | TickBatch · QuoteSnapshot · L2Book · Trade · MarketAPI | Dev Spec §5 |
| 市场 | MarketProfile · Session · PriceLimit · Flags | markets.md |
| 账本 | Book · Account · Position（Actual / In-flight / Projected / Target / Delta）· PositionView · TradeIntent · Order · Fill · Basket · Limit · LossLimit · CashEntry · Lot · PnLEntry · CorporateAction · Break | portfolio.md、asset-management.md、product.md §3 |
| 研究 | Hypothesis · Dataset · Factor · Model · Strategy · Trial · Run · Signal · Gate · Scenario · CompareSet | research.md、product.md |
| 决策 | Decision（kind、proposal、verdict）· JournalEntry · Capability | product.md §5 §9 §11 |
| 规则 | AlertRule · Hit | AlertCenter |
| 系统 | RenderSettings · DataSource · AgentStatus · Health | rendering.md、运行中心 |

## 4. 命令表（命名空间）

| 命名空间 | 命令 | sideEffect |
|---|---|---|
| `symbol` | set · pin · unpin | view |
| `workspace` | switch · create · save · template.apply · pane.swap · pane.maximize | view |
| `panel` | open · close · settings · link.set | view |
| `account` | select · default | view |
| `screen` | run · save · live | none |
| `alert` | create · toggle · delete | **write**（Webhook / Alice 动作时） |
| `order` | place · replace · cancel · pause | **write** |
| `basket` | create · submitBatch · remove | **write** |
| `position` | close · reverse | **write** |
| `strategy` | promote · demote · pause · setCapacity · retire | **write** |
| `run` | start · rerun · compare · cancel | none |
| `report` | build · schedule | none |
| `replay` | seek · play · speed | view |
| `render` | backend · aa · dpr · fps · quiet · night | view |
| `ask` | （OpenAlice 会话） | none |

write 命令必有 `confirm`，参数 hash 绑定确认框；Headless 调 write 返回 `pending-confirm`。

## 5. 后端：全部用现成方案，KATANA 只接

量化的每一环——数据、因子、训练、回测、优化、组合、执行、账务——都有成熟开源实现。KATANA 不造引擎，只做它们的统一前端；每类对手方一个**薄适配器**，把现成系统的输出整成第 3 节的类型与第 6 节的接口形态（流 / 问 / 命令）。选哪一个由人定，前端不依赖具体实现。

| 域 | 现成方案（候选，均可随 GPL 分发或作为外部服务） | 前端要的接口 | 事实归属 |
|---|---|---|---|
| **行情** | Nautilus Trader（Rust 核心，含数据与回放）· vn.py 网关（CTP / XTP / QMT）· QMT xtquant · ccxt（加密）· AkShare / Tushare（日频与基本面）· 存储 ArcticDB / DuckDB+Parquet / QuestDB（tick） | WS 流 → Worker（TickBatch / L2Book / Trade）+ 回放流 | 行情 |
| **执行** | Nautilus Trader 执行引擎 · vn.py 交易网关 · QMT · ccxt | 命令（order.* / basket.*）+ 订单 / 成交状态流 + 预检 Query | 订单 |
| **账户 / 账务** | vn.py / Nautilus 的 portfolio 模块（持仓、现金）· Beancount（复式现金流账、对账）· Postgres 持久化 | Query 快照 + 增量（Account / Position / CashEntry / Limit / Basket） | 账户 |
| **市场规则** | exchange_calendars / pandas_market_calendars（日历）· vn.py 合约表（tick / lot / 乘数）· 自维护费率与限制 YAML | Query（MarketProfile） | 规则 |
| **研究 / 训练** | **Qlib**（因子、模型训练、工作流）· Alphalens-reloaded（因子检验）· vectorbt / Nautilus / Zipline-reloaded（回测）· Optuna（优化）· **MLflow**（run / 参数 / 产物 / 谱系 —— 第 3 节的 Run 直接映射 MLflow run）· DVC / lakeFS（数据版本）· quantstats / empyrical（绩效）· Riskfolio-Lib / skfolio / PyPortfolioOpt（优化与风险）· OpenAlice 编排全部 | 命令（run.*）+ run 存储 Query（MLflow API）+ 任务流 | 研究 |
| **数据平台** | Qlib 数据层 / DuckDB 目录 · DVC 版本 · Great Expectations（质量） | Query（Dataset / coverage / quality） | 数据 |
| **订单流数据（ATAS 对照新增）** | tick / L2 历史与回放：Nautilus 数据引擎 · QuestDB / ArcticDB；**L2 历史录制**（DOMHeatmap 历史天数）；**MBO / L3**（Rithmic 类订单 ID 流，MBOTrackers）；**期权链 + 成交流 + 定价**（OptionsFlow、Options 指标；CBOE 类分钟级）；外部比率（Coinglass 类 OI / LS） | 回放流（声明保真度：L2 真实 / L2 生成 / 全生成）+ Query（历史深度、可用窗口）+ 事件流 | 行情 |
| **执行扩展（ATAS 对照新增）** | 出场策略（SL/TP Simple / Multi-Level / Breakeven / Trailing）与账户镜像在**执行网关**跑；限额写入（`limit.set`，待决） | 命令（position.setStop / trail · mirror.set · limit.set）+ 状态流 | 订单 |
| **规则 / 告警** | 小评估器跑在 Worker（价格 / 指标类）+ OpenAlice task（账户 / 研究类）· Webhook 出站 | 规则 Query + 命中流 | — |
| **报告** | quantstats HTML / nbconvert / Markdown → PDF；文字由 OpenAlice 写 | 命令（report.*）+ 产物文件 | — |

### 适配器契约

每个适配器只做三件事：
1. **归一**：把现成系统的对象转成第 3 节类型（MLflow run → Run；vn.py PositionData → Position；Beancount posting → CashEntry）。
2. **定形态**：流的走 WS 到 Worker，问的走 Query，改的走命令并返回 pending / accepted / rejected。
3. **标权威**：返回值带 `source`（系统名 + 版本）与 `asOf`；前端据此显示 `估算` / `对账中` / run 蓝标。

前端不知道背后是 Qlib 还是 vectorbt、是 vn.py 还是 Nautilus；换引擎 = 换适配器，不动面板。

## 6. 前端基础设施

| 层 | 选定 | 细则 |
|---|---|---|
| 框架 | React 19 + TS + Vite；Zustand 或 TanStack Store（外壳状态）；XState 写所有业务状态机 | Dev Spec §2、wheels.md |
| 数据引擎 | Apache Arrow（列式传表）+ DuckDB-WASM（浏览器内 SQL：Screener / SeriesBrowser / TradeStats / Trial 查询）+ uPlot（序列图） | wheels.md §1 |
| 基元 | Base UI（无样式）+ shadcn 式源码组织 | stack.md |
| 数据 | TanStack Table / Virtual / Pacer / Query / Form / Router | stack.md 边界：流 vs 问、投影 vs 事实 |
| 图 | lightweight-charts（主题对象、Custom Series、Primitives）+ 自研 Canvas 2D（Footprint / DOM / 热力 / 零轴条）；WebGPU 可选后端 | dataviz.md、rendering.md |
| 动效 | Motion 四弹簧预设 + 橡皮筋 + 速度投影；由人调 | motion.md |
| 音效 | Howler，清单 16 条；安静 / 夜间降级 | sound.md |
| 字体 | 七角色全 OFL 自托管；CJK unicode-range 分片；点阵整数倍 | typography.md、pixel.md |
| Token | tokens.json → tokens.css；stylelint 禁裸值；`data-theme="console|paper"` / `data-pnl` / 强调色 | tokens.json、themes.md、markets.md |
| 可读性 | 30 条规则 → token 与组件规格 | readability.md |
| 状态 | 五态 + 告警四级阶梯 | states.md |
| 行情路径 | Worker → ring buffer → rAF → MarketAPI → DataGrid 自建 `transactions.ts` / `series.update` / canvas；七条硬规则 | Dev Spec §5、engineering.md §2.1 |
| 聚合器 | `book/aggregator`（五视角、币种、Δ-eq）· `book/performance` · `book/roundtrips`，全在 Worker | asset-management.md |
| Headless | CLI / MCP 暴露命令表；OpenAlice 是第一个消费者 | Dev Spec |
| **指标 / 策略 SDK**（ATAS 对照新增） | 自定义指标：TS 插件（Worker 注册表，输入 逐笔 / L2 / K 线，输出 series / marks / cells）或 Python 插件（后端计算，同一 schema）；带模板与本地热加载，不编译；自定义策略：Python 在引擎跑、OpenAlice 编排，图上启停与信号（SignalMonitor）；面板包 / 指标包经 Extensions 目录分发 | atas.md §0、IndicatorPanel |
| 工程 | Claude Code：CLAUDE.md · rules（shell / market / panels / handfeel / ui / book / markets）· skills（new-panel / new-component / sync-design / perf-check / audit）· agents（spec / ds / perf reviewer）· hooks（stylelint、禁 pnpm add） | Dev Spec §9 |

## 7. 人工提供物（agent 做不了的）

- **选引擎**：每个域从第 5 节候选里定一个，写进适配器配置；这是架构决定，不交给 agent。

- 字体文件：方舟像素 10/12/16、缝合像素 8/10/12、Maple Mono CN、得意黑、DSEG7（Google Fonts 六个自托管子集可脚本化）。
- 音效 16 条 wav / ogg 与音量曲线。
- 手感最终值：四弹簧、橡皮筋系数、速度投影、Splitter / Toggle / 交换 / 最大化。
- 限额策略与门阈值（RiskBoard 六条、因子五门、策略五门）。
- MarketProfile 配置：CN-A / CN-STAR / CN-BSE / CN-CB / CN-FUT / CN-OPT / HK / HK-CONNECT / US / CRYPTO 的日历、限制、费率。
- 券商 / 柜台 / 数据源凭证与适配器选择。
- 验收：手感、密度、可读性在真实面板上的人眼判断。

## 8. 阶段

阶段按 product.md §11 的 MVP 能力 P0-A…I 验收，不按组件数；下面的组件数只是工作量提示。

| 阶段 | 内容 | 组件数 |
|---|---|---|
| **一（4 周）** | 外壳 + 设计系统地基 + 行情路径 + Watchlist / PriceChart / DOMLadder + AccountRail / PositionBook / OrderBlotter（只读）+ 命令与 Headless（到确认框） | 18 |
| **二** | 执行网关对接 → OrderTicket / ChartTrader / FillLog / RiskBoard / PnLAttribution / AlertCenter / Screener / 订单流四件 / Lab 四图 / ReplayBar / 总览与运行中心 | +22 |
| **三** | 资产管理层 11 + 盈亏 6 + 研究层 16 + 运行中心 6 | +39 |
| **四** | 发现三件（Calendar / NewsFeed / EventTimeline）+ 衍生品 3 + 固收 2 + 工具 2 | +10 → 84 |

每一个组件 = 一张卡（preview + README）+ 一个 `src/ui/components/X` + DoD 八条；每一个面板 = 一个 PanelSpec。加组件不加基元，加面板不加布局机制——这是整套东西能一直长下去的原因。

## 9. 不做（全局）

壳内浮窗 / 面板 tab / docking 库（弹出到独立浏览器窗口是做的，layout.md）· 自有脚本语言 · 节点编辑器 · 代码编辑器 · 想法流与排行榜（聊天本身做：Talk）· 饼图 / 环图 / 双 Y 轴 / 雷达图 / 瀑布图（3D 只作为 DOMHeatmap / VolSurface 的视图模式，数据图不做 3D）· 任何"评分 / 健康分 / 评级" · 用颜色区分账户 · 把任何市场的习惯写进组件。亮色主题已做（Paper，themes.md）。

**对 ATAS 的总原则**（atas.md §0）：它有的能力全部要有，包括 3D 热力、聊天、门控；只换操作方式，不删能力。

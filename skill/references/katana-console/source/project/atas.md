# ATAS X 功能清单与覆盖对照

> 2026-10-03 调研结论，作为组件库的功能上限对照表。**原则：能力与 ATAS 1:1，操作用我们的方式。ATAS 有的能力全部要有，不做为零**（§0）。本页新卡 11 张（9 + Talk + Entitlements）。本页的 9 张新卡已建（IndicatorPanel · DrawingToolbar · ClusterSearch · Workspaces · ExitStrategy · FlowGauges · MBOTrackers · OptionsFlow · AccountMirror），engineering.md §2.2 已按 §四 修订。

> **2026-10-03 读法更新**：施工顺序以 tools.md 的 MVP / P1 / P2 为准，本页矩阵是**长尾范围**（不做为零），tools.md 每节末尾把本页对应行挂回。图表底盘定为自研 `@katana/chart`（engineering §2.2），§四「lightweight-charts 冲突」保留为历史。

## 结论先行

ATAS X 不是一套独立功能集：自 8.0.12（2026-02）起它与 Classic 共用 8.0.x 内核与 changelog，差别只在 UI 壳（tab 架构、统一对话框、macOS 原生）与少数尚未迁移的模块（策略/回测仍在 Classic，Options 在 X 处于"最后阶段"）([atas.net/atas-x](https://atas.net/atas-x/); [completetradersedge](https://completetradersedge.com/atas-vs-atas-x/))。因此"ATAS X 的功能"= 8.0.15 的全部共享功能：15 个模块、约 290 个指标（46 order-flow + 231 technical + 14 options + MBO 3 + Heatmap 6 + Widgets 4 + Options X-Ray/Chain 14）、33 个绘图对象、Smart DOM 21 列、Footprint 10 内容模式 × 7 可视化 × 9 配色、SL/TP 出场策略、Risk Manager、Replay 三种数据保真度、Trading Journal、Workspace→Layout→Template 三层。拿它对照 KATANAview 的 94 张卡（46 个 order-flow 指标逐个计）：**218 个功能项中，已覆盖 44（20%）、部分覆盖 70（32%）、缺失 94（43%）、明确不做 10（5%）**（详表见第二节）。最大的两个结构性缺口不是某个小功能，而是：（1）coverage.md 标为 ✅ 的 `IndicatorPanel`、`DrawingToolbar`、`ClusterSearch` **根本没有卡**——它们是 46 个 order-flow 指标、33 个绘图对象和"扫描器"三大块的唯一落点；（2）ATAS 的 Footprint 是**图表的一种显示模式**，与绘图、指标、Chart Trader 同一坐标系，而我们把 Footprint 做成了独立 Canvas 面板，与 `PriceChart = lightweight-charts` 的决策正面冲突。补齐方案是：**建 9 张卡**（3 张已命名未建 + 1 张待卡 + 5 张新卡：ExitStrategy、FlowGauges、MBOTrackers、OptionsFlow、AccountMirror），把 Footprint 改为挂在 PriceChart 上的 Primitive 层（先 spike，不行再上自研 Canvas 图表层），Heatmap/MBO 维持自研 Canvas 2D + WebGPU 后端；不做为零：原先的 10 项按 §0 原则全部是等价能力，含 3D 热力视图、Talk、Entitlements。

## 0. 原则：能力 1:1，操作我们的

对照表里每一行都问两个问题：**能力有没有**（用户能不能达到同样的结果）和**怎么操作**（入口、手势、设置放哪）。前者必须 1:1；后者按我们的壳层来，不照搬 ATAS 的窗口、菜单与工具条。下面是操作层的翻译表——任何 ATAS 功能落到 KATANA 时按这张表换操作方式，不换能力：

| ATAS 的操作方式 | 我们的操作方式 |
|---|---|
| 颜色组联动（每个窗口左上角选色） | 四层 context（Ambient / Scope / Focus / Selection）；默认一个联动组，第二组出现时颜色才出现；账户不随点击流动 |
| 功能散在窗口菜单与设置对话框里 | 一张命令表：GO Bar 命令、右键 Action Panel、热键都是同一命令的绑定；Agent 调同一张表 |
| Indicator Manager 窗口 + 每图上限 | IndicatorPanel（收藏为默认页）+ `cvd session=none` 这类命令直接加；无上限 |
| 630 种 footprint 组合摆在工具条 | 面板声明 + PanelSpec 模板 + 命令；工具条只放当前模式与 3 个最近用过的 |
| Workspace → Layout → Template 三层 + working layers | Workspace → split → Pane 两级 + PanelSpec 模板；"跨所有布局可见"用**钉住面板**（pinned pane，跟随所有工作区） |
| 浮窗 / Topmost / Clone 到独立窗口 | 任何面板可**弹出到新浏览器窗口**（多显示器），仍属原工作区与联动组，上下文经 BroadcastChannel 同步；壳内不做浮窗 |
| 策略 = C# `ChartStrategy` DLL；自定义指标 = C# 编译 | 策略 = Python 在引擎跑、OpenAlice 编排，图上有启停与信号（SignalMonitor / RunLauncher / DeploymentBoard）；自定义指标 = TS（Worker）或 Python（后端）插件，经 IndicatorPanel 注册表加载，有 SDK 与模板，不用编译 DLL |
| 告警分散在 Tape / 指标 / 绘图 / 风控各处 | AlertCenter 一处：五类规则源（价格 / 指标 / 绘图 / 订单流 / 风控），一条告警阶梯；渠道含 Webhook（Email 作为 Webhook 的一个出站适配器） |
| 应用内填券商凭证（Connection Settings） | Extensions 卡的**连接向导**：选适配器 → 凭证进后端 vault（前端只见到期与状态）→ DataSources 显示；能力相同，凭证不落前端 |
| RangeX / XV / Z / US 专有柱 | Range / Reversal / Renko / Delta / Tick / Volume 全有；专有算法未公开，提供我们自己的 Range 变体（命名不同，能力等价） |
| 资费门控（指标数 / 连接数 / 历史天数） | 无门控；限制只来自数据源 |

据此，原先标"不做"的 10 项**全部**重分类为等价能力——ATAS 有的能力一项不删，只换操作方式：3D heatmap → DOMHeatmap / VolSurface 的 3D 高度场视图模式（默认 2D，同一价格轴）；Traders Talk → **Talk** 卡（频道聚合：Telegram / Discord / Matrix 适配器 + 团队频道 + Agent 会话，对象链接可点，不自建社区）；tier gating → **Entitlements** 卡（计划 / 角色 / 数据源三类门控与配额，GPL 自部署默认全开、部署者可配，同时是机构级 RBAC 的落点）。下文表格已按此更新；"不做"一栏为空。

## 一、ATAS X 功能总表：共用 8.0.x 内核的 15 个模块

ATAS 官方定位 X 为"rebuilt from the ground up"的跨平台壳，功能"transferred over time"，高需求模块优先迁移；截至 2026-10 已确认迁入 X 的有 Statistics、Smart Tape、All Prices、Bid/Ask Tape（2026-05）、Heatmap Stage 2（X 先于 Classic 发布）、Drawing objects 与 Indicators 窗口、Replay（2026-10）、Risk Management Module、Overlay Mode ([ATAS X Beta 8.0.14.602](https://feedback.atas.net/changelog/atas-x-beta-8014602-and-newer); [Beta 8.0.15](https://feedback.atas.net/changelog/beta-8015))。X 中仍缺的是 Strategy backtesting/自动化（第三方评测："remains in classic client"）与 Options Analysis（官方："in the final stages of development"）([completetradersedge review](https://completetradersedge.com/atas-review/); [MBO/Options 公告](https://feedback.atas.net/changelog/new-mbo-bundle-and-options-analysis-are-now-in-atas))。ATAS Crypto 不是独立产品，而是 2025-08 后统一进 Start/Plus/Pro/Ultra 四级资费的加密方向，差异在连接器与加密交易面板（Reduce Only / Post Only / 保证金模式），不在模块 ([New ATAS Tariff Plans](https://atas.net/blog/new-atas-tariff-plans/); [atas.net/atas-crypto](https://atas.net/atas-crypto/))。

| 模块 | 功能清单（ATAS 原名） | 来源 |
|---|---|---|
| **Chart 显示模式** | Bars · Candles · Transparent Candles · Line · Area (Mountain) · Hidden · Footprint (Clusters)；Auto Transform Candles to Clusters（按缩放自动切换，阈值 Candle Size to Transform）；Magnifier Mode；Overlay Mode（8.0.15 多品种叠加） | [Chart Display Modes](https://help.atas.net/en/support/solutions/articles/72000602349-chart-display-modes); [Changelog](https://feedback.atas.net/changelog) |
| **Chart 周期类型** | 时间：Minutes · Seconds · Daily · Weekly；非时间：Ticks · Volume · Delta · Range · Renko（带影线）· Reversal (Probe/Value)；专有：RangeX · RangeXV · RangeZ · RangeUS（算法未公开）；订单流型：Order Flow chart · Cumulative Trades chart；Favorite timeframes + 周期热键组 | [Chart Periods and Types](https://help.atas.net/en/support/solutions/articles/72000602350-chart-periods-and-types); [docs.atas.net 枚举](https://docs.atas.net/en/namespaceATAS_1_1Indicators.html) |
| **Footprint 模式** | 内容 10：Volume · Trades · Volume and Trades · Volume and Delta · Delta · Centered Delta · Bid × Ask · Centered Bid × Ask · Bid/Ask · None；可视化 7：Full Row · Bid/Ask Profile · Volume Profile · Trades Profile · Delta Profile · Bid/Ask Ladder · Positive/Negative Delta Profile；配色 9：Delta · Solid · Volume Proportion · Trades Proportion · Bid/Ask Volume Proportion · Heatmap by Volume/Trades/Delta · None；Additional Footprint（双足迹）；Bid/Ask Imbalance（Rate % 默认 150、Volume Filter、Min Difference、Ignore Zero）；Filters 6 类；Maximum Level Highlighting 6 类；Value Area；Proportion 4 模式；Scale / Scale by Lower Level / Auto；Footprint 模式热键（8.0.15） | [Footprint settings](https://help.atas.net/en/support/solutions/articles/72000606631-footprint-settings); [Scale function](https://help.atas.net/en/support/solutions/articles/72000602462-scale-function) |
| **Chart 统计与设置** | Cluster Statistics 指标 16 行（Ask · Bid · Delta · Delta/Volume · Session Delta · Session Delta/Volume · Max/Min Delta · Delta Change · Volume · Volume/sec · Session Volume · Trades · Height · Time · Duration）+ 14 项告警；Candle Statistics；Bar Timer / Candle countdown；Visual settings 13 组（Main/Current Price/Crosshair/Grid/Axis/Candles/Bars/Line/Session Time/Volume Visualization/Drawing Objects/Other/Update Intervals）；ETH/RTH/Custom session | [Cluster Statistics](https://help.atas.net/en/support/solutions/articles/72000602624-cluster-statistics); [Visual settings](https://help.atas.net/en/support/solutions/articles/72000602496-visual-settings-of-the-chart) |
| **Indicators** | KB 分类：Order flow and volume analysis **46** · Classic and technical **231** · Options **14**；另 MBO Bundle 3、Heatmap 指标 6、Widgets 4、Options X-Ray Suite 10 + Options Chain Suite 4；Indicator Manager 三栏（Categories/Favorites · Search+List · Preview/Settings）、8.0.14 Data settings panel、8.0.15 同指标多实例与面板透明度；按资费限每图 3/6/12/∞ 个 | [help.atas.net 目录](https://help.atas.net/en/support/solutions); [GitHub AtasPlatform/Indicators](https://github.com/AtasPlatform/Indicators); [Pricing](https://atas.net/pricing/) |
| **Drawing objects (33)** | Trend Line · Trend angle · Vertical/Horizontal Line · Horizontal Ray · Cross Line · Fibonacci Retracements/Extensions · Fibo Fan · Ruler · Measure · Channel · Triangle · Rectangle · Ellipse · Brush · Text · Position markers · Elliott Wave · **Anchored VWAP · Market profile and TPO · Dynamic POC · CVD correlation · ZigZag TPO and Profile**；管理：Global / Locked / Hidden · Drawing Object Timeframes · Keep Drawing Mode · 对象列表 · Copy/Paste/Undo · Save As Default · Magnet；8.0.15 四类全局对象可转到 Smart DOM | [Drawing objects 文件夹](https://help.atas.net/en/support/solutions/folders/72000569861); [Drawing objects management](https://help.atas.net/en/support/solutions/articles/72000602378-drawing-objects-management); [8.0.12](https://atas.net/blog/latest-8-0-12/) |
| **Smart DOM** | Common 11 列：Price · Bids · Asks（Volume / Number of applications / Average volume 三模式）· Bid/Ask Ladder · My orders · My buy orders · My sell orders · Queue · PNL & Orders · Latest trade quantity · DOM trader；Analytical 10 列：Histogram profile · Trades · Buy Current Trades · Sell Current Sales · Depth changes（Pulling And Stacking / Stacking / Pulling）· Notes · Liquidity map · Order Flow · Footprint · Rolling Footprint；工具栏 13 控件（Scale · Clone · Layout · Window grouping · Trading panel · Topmost · Fast volume · Flatten · Lock trading · Center…）；交易：Simple/Manual Order Entry · MKT · Drag&Drop 改单 · Cancel All · Flatten · Reverse · SL/TP 放置模式 · One-Click Mode · Exit Strategies · TIF；Design mode；Templates；热键 11 条 | [Smart DOM Window Columns](https://help.atas.net/en/support/solutions/articles/72000602469-smart-dom-window-columns); [Trading functions Smart DOM](https://help.atas.net/en/support/solutions/articles/72000602576-trading-functions-smart-dom); [Smart DOM overview](https://help.atas.net/en/support/solutions/articles/72000602621-smart-dom-window-overview) |
| **Smart Tape / Bid-Ask Tape / All Prices** | Smart Tape 9 列（Time ms · Price · Tick direction · Trade Volume · Bids · Asks · Sizes · Avg.Vol. · Buy/Sell Strength）；Cumulative Trades Filter · Separated Prints Filter · Level 1 Filters · Tape Speed；Between Color（价差内成交）· Above Ask/Below Bid 高亮；Templates · Freeze · Clone · Historical mode · Reset (Ctrl+R)；Bid/Ask Tape 独立模块（X 8.0.14.602）；All Prices 模块（已迁 X，正文未抓） | [Smart tape](https://help.atas.net/en/support/solutions/articles/72000602608-description-setting-templates-smart-tape-); [8.0.14.602](https://feedback.atas.net/changelog/atas-x-beta-8014602-and-newer) |
| **Alerts** | 无统一 condition builder；入口：Smart Tape 告警（6 种 Filtration Mode + Min/Max Volume + 声音）· 指标内置（Cluster Search · Big Trades · Order Flow Indicator · Dynamic Level · Cluster Statistics 14 项 · MBO Icebergs · Order Book Alerts）· Horizontal Line Approximation alert · Risk Management 通知；渠道：声音 · Alerts 窗口 · Telegram · **Webhooks（多条件合并）**；Email 已停；关机不触发 | [Alerts](https://help.atas.net/en/support/solutions/articles/72000602238-alerts); [Alerts in Smart Tape](https://help.atas.net/en/support/solutions/articles/72000636828-alerts-in-smart-tape); [ATAS Webhooks](https://help.atas.net/en/support/solutions/articles/72000648977-atas-webhooks) |
| **Strategies / SL-TP / Risk** | Chart Strategies = 用户 C# `ChartStrategy` 容器，**无出厂策略**；SL/TP (automatic exit strategy)：Simple（SL/TP ticks/%/price）· Multi-Level（Absolute/Percentage 多层）· Breakeven（阈值+Offset）· Trailing Stop（distance+step）· Set Stop-Loss/Take-Profit/Breakeven 手动命令；订单：Market · Limit · Stop · Stop as StopLimit · Conditional · OCO；TIF Day/GTC/FOK/IOC；Reduce Only · Post Only · Close on Trigger；Trading panel 按钮 Buy/Sell Market · Buy/Sell Ask · Buy/Sell Bid · Cancel Bids/Asks/All · Reverse · Close；Risk Management Module（8.0.15：日亏/日盈限额、最大笔数、连亏阈值、Reduce Only、通知）；Cross-Trading（19 组固定配对）；Following Manager（Positions/Orders 模式、Ratio、Reverse、Manual Confirmation） | [Chart strategies](https://help.atas.net/en/support/solutions/articles/72000602352-chart-strategies); [SL/TP](https://help.atas.net/en/support/solutions/articles/72000636862-sl-tp-automatic-exit-strategy-); [Trading panel](https://help.atas.net/en/support/solutions/articles/72000625592-trading-panel-for-classical-markets); [Cross Trading](https://help.atas.net/en/support/solutions/articles/72000657084-cross-trading); [Following Manager](https://help.atas.net/en/support/solutions/articles/72000610247-following-manager) |
| **Market Replay** | 数据模式 3：Ticks + DOM（真实 L2 快照）· Ticks + Generated DOM · Generated Ticks and DOM；x1–x1000；最多 20 品种同步；步进 bar / period / date（8.0.15）；独立 Replay Account 进统计；支持 Chart/Footprint/DOM/Smart Tape/Heatmap；Cross-trading 与 OI 流；8.0.15 Classic 重做界面、X 加入 Replay | [ATAS Market Replay](https://atas.net/atas-possibilities/atas-market-replay/); [Market Replay 模块页](https://atas.net/modules/market-replay/); [Beta 8.0.15](https://feedback.atas.net/changelog/beta-8015) |
| **Statistics / Trading Journal** | RealTime / History 模式；17 项指标（Total trades · Total/Average PnL · Max/Max relative drawdown · Recovery factor · Profit factor · 盈亏笔数/金额/均值 · Total/Profit/Loss days · Commission）；Journal · Equity · Orders · Execution 四子页；按账户/品种/时间过滤；Export Excel · New execution（手工补录）· Recalculate；8.0.12 重建为 Trading Journal（交易日历、按品种表现、playbook 笔记） | [Trading statistics](https://help.atas.net/en/support/solutions/articles/72000602476-statistics-tab); [8.0.12](https://atas.net/blog/latest-8-0-12/) |
| **Workspace / Layout / Templates / Linking / Hotkeys** | Workspace（Add/Load/Rename/Delete/Copy/Edit/Import/Export）→ Layouts（working layers + Universal 层）→ 模块 Templates（Save/Edit/Set as Default/Export/Favorites/Recommended Gallery）；Windows Linking 颜色组（Chart · Smart DOM · Smart Tape · Bid/Ask Tape · All Prices · Heatmap · Forward Curve · Options Board 同步品种）；Link Price Axis；Global Crosshair / Sync Crosshair；Global drawing objects；热键 5 类（Global · Trading · Smart DOM · Charting · Screenshot）+ Heatmap 专区 + Footprint 模式热键 + 周期热键组；Settings：Hot Keys · Sound · Time Zones · Commission · Custom Modules · Common；X 独有：tab 架构 · Workspace Editor · 记住上次 workspace · 模块设置即时同步 · 统一对话框 · Instruments Manager 重设计（按 ID 搜索、加载未列合约）· Privacy mode · Market News 页（RSS+新闻+经济日历）· 三种滚轮模式工作区记忆 | [Workspace Setting](https://help.atas.net/en/support/solutions/articles/72000602516-workspace-setting); [Layout Settings](https://help.atas.net/en/support/solutions/articles/72000602557-layout-settings); [Windows Linking](https://help.atas.net/en/support/solutions/articles/72000637162-windows-linking); [Link Price Axis](https://help.atas.net/en/support/solutions/articles/72000660390-link-price-axis); [Hot Keys](https://help.atas.net/en/support/solutions/articles/72000602396-hot-keys-configuration); [Settings Menu](https://help.atas.net/en/support/solutions/articles/72000602252-settings-menu) |
| **Heatmap (Beta)** | GPU 渲染 "600+ FPS"；Heatmap by Volume / Trades / Delta；3D mode；Bubbles（市价单气泡）；20+ 配色；Perfect Sync（与 Footprint/DOM 价格轴联动缩放）；Stage 2：自动历史记录、股票/dxFeed、专业绘图、独立 Indicators 窗口；Heatmap 指标：CVD · Market Pressure · Price Change · OHLC Plus（O/H/L/C/Equilibrium/POC/VWAP/VAH/VAL）· Value Area · VWAP；8.0.15 全屏模式 + 专属热键 + MBO Bundle 进 Heatmap；历史天数按资费 1/2/7/30 天 | [atas.net/heatmap](https://atas.net/heatmap/); [Heatmap KB](https://help.atas.net/en/support/solutions/articles/72000660059-heatmap); [Heatmap SDK](https://docs.atas.net/en/md_Indicators_2Heatmap_2README.html) |
| **MBO Bundle (Ultra)** | Icebergs Tracker（Min Hidden/Total Volume · Min Duration · 置信度 Absolute/Medium · Activity Panel）· Stops Tracker（Min Volume · Max Window ms · Min Range ticks · Min/Max Stops Count · 5 种高亮样式）· Sweeps Tracker（Min/Max Aggressors Count · Include Stops）；需 Rithmic MBO/Order IDs，dxFeed 开发中；可能转付费 | [MBO Indicators](https://help.atas.net/en/support/solutions/articles/72000660331-mbo-indicators-icebergs-stops-sweeps); [MBO 公告](https://feedback.atas.net/changelog/new-mbo-bundle-and-options-analysis-are-now-in-atas) |
| **Options suites** | Options Board (Beta) · Options Strategy Analyzer (Beta)（需 IB）；Options Chain Suite 4（Pro）：Expected Move · OI Profile · Key Levels · GEX Profile；Options X-Ray Suite 10（Ultra，0DTE，CBOE 每分钟）：Expected Move · Big Trades · Flow · Flow Delta · Surface Profile · Strike Profile · Strike Heatmap · GEX Heatmap · Charm Heatmap · Market State；另 Coinglass Long/Short Ratio 与 Open Interest（加密） | [Changelog](https://feedback.atas.net/changelog); [Pricing](https://atas.net/pricing/) |
| **Widgets (8.0.12)** | Market Pressure · Price Change（−100…+100）· DOM Pressure · Delta Divergence（5s–20min 多周期，N/A 状态） | [8.0.12](https://atas.net/blog/latest-8-0-12/) |
| **其他模块（22 篇）** | Watchlist（Last · Bid/Ask qty · Vol. Last Trade · Volume · Change · Change% + Quote Filter）· News module · Economic Calendar · Forward Curve · Traders Talk · Account Info Display · Trades On Chart · Instruments Manager · Connection Status Monitor · Screenshot service | [Other ATAS modules](https://help.atas.net/en/support/solutions/folders/72000569869); [Watchlist](https://help.atas.net/en/support/solutions/articles/72000602504-watchlist) |
| **Connectors (53 篇)** | Rithmic · CQG/Continuum · dxFeed · Interactive Brokers · Binance Futures · Bybit · Bitget · MetaTrader 5 · Bitfinex · NinjaTrader · Trading Technologies · Phemex · WhiteBit · OKX · Kraken · Exante · CTS (T4) · IQFeed · Tai-Pan · Transaq · ATAS SIM / Crypto SIM / Crypto Data；活跃连接按资费 1/1/3/∞ | [Connectors 文件夹](https://help.atas.net/en/support/solutions/folders/72000569858); [Market Data in ATAS](https://atas.net/blog/market-data-in-atas-how-to-connect/) |

**Classic vs X 差异与 tier gating**：X 独有 = macOS 原生、tab 架构、Workspace Editor、统一对话框、Bid/Ask Tape 独立模块、Heatmap Stage 2 首发；Classic 独有 = Strategies/回测、WPF 自定义指标编辑器（X 需改 Avalonia）、Following Manager / Copy trading 在 X 的状态无官方说明 ([docs.atas.net ATAS X Indicator](https://docs.atas.net/en/md_DataFeedsCore_2Docs_2en_20200__ATASX__Indicator.html))。资费门控集中在数据（期货 15 分钟延迟、Big Trades/Heatmap 历史天数）、数量（指标/图 3/6/12/∞、连接 1/1/3/∞、资产 2/6/20/∞）与数据产品（MBO、Options、Risk Manager 资产数、Cross-Trading 仅 Pro/Ultra），**模块本身（DOM、Tape、Replay、Journal、Watchlist）从免费 Start 层即可用** ([Pricing](https://atas.net/pricing/))。对 KATANA 的含义：tier 不是功能，Ultra 功能（MBO、X-Ray）的真正门槛是数据源，不是许可。

## 二、覆盖矩阵：94 张卡对 218 项，三张"✅"卡其实不存在

状态口径：**已覆盖** = 某张卡的 README 明确规定了该能力；**部分覆盖** = 卡存在但缺 ATAS 的模式/参数/入口；**缺失** = 没有任何卡承接（含 coverage.md 标 ✅ 但目录里没有的三张）；**不做** = 第三节给出硬理由。补齐动作一栏写"扩展 X"或"新卡 Y"（新卡定义见第三节）。

### 2.1 Chart 图表类型、Footprint 模式与图表级设置

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| 显示模式 Bars / Candles / Line / Area | PriceChart | 已覆盖 | — |
| Transparent Candles / Hidden（只留指标） | PriceChart | 缺失 | 两个开关进面板设置 |
| Footprint (Clusters) 作为图表显示模式 | Footprint（独立面板） | 部分覆盖 | **Footprint 改为 PriceChart 的 flow 层（Primitive）**，与绘图/ChartTrader/指标同坐标系；独立面板保留为 `1x1` 快捷入口（§4） |
| Auto Transform Candles ↔ Clusters（按柱宽阈值） | — | 缺失 | flow 层按柱宽阈值自动显隐，低于阈值退回 K 线（Footprint 现只隐数字留色块） |
| Magnifier Mode | — | 缺失 | flow 层悬停局部放大（P2） |
| Overlay Mode（多品种叠加） | PriceChart 多线变体 | 部分覆盖 | 百分比刻度叠加品种，颜色 `series-n` |
| Minutes / Seconds / Daily / Weekly | PriceChart | 已覆盖 | — |
| Ticks / Volume / Delta / Range / Renko bars | PriceChart Custom Series（仅列 Renko） | 部分覆盖 | Worker `bars/builder` 从逐笔流构建五类非时间柱；历史靠后端 tick 历史；LWC 用序号横轴（§4 spike） |
| Reversal (ReversalX, Probe/Value) | — | 缺失 | bars/builder 加 Reversal |
| RangeX / RangeXV / RangeZ / RangeUS | PriceChart bars/builder | 等价能力 | 专有算法未公开；提供自己的 Range 变体（命名不同，能力等价，§0） |
| Order Flow chart（每笔成交圆/矩形） | Footprint | 部分覆盖 | flow 层加 Order Flow 可视化模式（= Order Flow Indicator） |
| Cumulative Trades chart | SmartTape 聚合行 | 已覆盖 | — |
| Favorite timeframes + 周期热键组 | PriceChart 图例 | 缺失 | 周期收藏条 + `chart.timeframe` 命令热键 |
| Footprint 内容模式 10 | Footprint（Bid×Ask / Delta / Volume / 失衡 = 4） | 部分覆盖 | 补 Trades · Volume and Trades · Volume and Delta · Centered Delta · Centered Bid × Ask · Bid/Ask · None |
| Footprint 可视化模式 7 | Footprint（Full Row = 1） | 部分覆盖 | 补 Bid/Ask Profile · Volume Profile · Trades Profile · Delta Profile · Bid/Ask Ladder · ±Delta Profile |
| Footprint 配色 9 | Footprint（三档强度 + Delta 色） | 部分覆盖 | 补 Solid · Trades Proportion · Bid/Ask Proportion · Heatmap by Volume/Trades/Delta；保持单色序列规则（不做彩虹） |
| Additional Footprint（双足迹） | — | 缺失 | flow 层支持第二套设置并排渲染 |
| Bid/Ask Imbalance 参数（Rate %、Volume Filter、Min Difference、Ignore Zero） | Footprint（固定对角 ≥3×） | 部分覆盖 | 参数化；默认沿用 ATAS 150%/建议 300% |
| Stacked Imbalance（连续失衡合并为区间） | Footprint | 缺失 | Worker 检测 + 区间描边 |
| Filters 6 类（Bid/Ask/Volume/Trades/Relative Volume/Relative Trades） | — | 缺失 | flow 层过滤器（背景/文字色） |
| Maximum Level Highlighting 6 类 | Footprint（POC 描边） | 部分覆盖 | 类型可选 Volume/Trades/Bid/Ask/±Delta |
| Value Area in footprint | — | 缺失 | 与 VolumeProfile 共用聚合器画 `va` 底色 |
| Proportion 模式（Bars/Visible/Whole/Custom） | Footprint（本根分位） | 部分覆盖 | 补 Visible / Whole / Custom |
| Scale / Scale by Lower Level / Auto | Footprint · DOMLadder（聚合档位） | 部分覆盖 | Auto 按品种 tick 自选；Chart 与 DOM 共用 |
| Footprint 模式热键 | — | 缺失 | `chart.footprintMode` 命令进 Charting 热键组 |
| Cluster Statistics 16 行 + 14 项告警 | Footprint（仅 Delta LCD 行） | 部分覆盖 | 统计行可配 16 项 + Session reset；AlertCenter 订单流源接 14 项 |
| Candle Statistics / Bar Timer / Candle countdown | — | 缺失 | PriceChart 右轴倒计时 + 统计副图 |
| Visual settings 13 组 | PriceChart theme + Preferences | 部分覆盖 | 面板级暴露 Session Begin/End、Price Offset、Smoothing、Mouse Wheel Behavior；FPS 已在 RENDER |
| ETH / RTH / Custom session | MarketProfile.calendar | 已覆盖 | 加面板级 Custom Session 覆盖 |
| Crosshair 4 型（Pointer/Crosshair/Global/Sync） | PriceChart + LinkGroup | 已覆盖 | — |
| 滚轮 3 模式（Zoom/Scroll/ZoomXY，工作区记忆） | PriceChart（固定语义） | 部分覆盖 | Preferences 加滚轮模式三选一，按工作区存 |
| Templates（Save/Edit/Default/Export/Favorites/Gallery） | Pane.state | 缺失 | **新卡 Workspaces** 承接面板模板 |
| Go to Date / Full Screen | PriceChart / PanelFrame 最大化 | 部分覆盖 | `chart.goto` 命令 |
| Chart Trader：Limit 拖拽、括号单 | ChartTrader | 已覆盖 | — |
| Chart Trader：右键 Stop 单、OCO、Cancel Bids / Cancel Asks、Route、Auto Detection 模式 | ChartTrader | 部分覆盖 | 右轴右键 = Stop；OCO 组；侧向撤单命令 |
| Automatic Protective Orders（开仓前设 ticks/%） | ChartTrader 括号 | 部分覆盖 | 并入 **新卡 ExitStrategy** |
| Linked Windows → Smart Tape / Bid-Ask Tape（RT & Historical） | LinkGroup + ReplayBar | 已覆盖 | — |
| Trades On Chart / Account Info Display | ChartTrader 成交标记 / AccountRail · StatusBar | 已覆盖 | — |

### 2.2 Indicators：46 个 order-flow 逐个，其余按类聚合

ATAS 官方 KB 的 order-flow 文件夹计 46 篇，研究员确认了 26 个标题，另 19 个经官方开源仓 `HelpLink` 反查，剩余 1 个归属待核（6 个候选均为开源）([order flow 文件夹](https://help.atas.net/en/support/solutions/folders/72000569863); [GitHub AtasPlatform/Indicators](https://github.com/AtasPlatform/Indicators))。开源的指标可直接移植算法到 Worker；闭源的（Big Trades、Adaptive Big Trades、Absorption、Breakout and Retest Signals、Volume profile & TPO、DOM levels）按文档参数自研。所有"IndicatorPanel"落点都依赖**新卡 IndicatorPanel**（现无卡）。

| # | ATAS 指标 | 我们对应组件 | 状态 | 补齐动作（引擎能力） |
|---|---|---|---|---|
| 1 | Absorption | ClusterSearch | 缺失 | Worker 吸收检测，命中格高亮（逐笔+L2） |
| 2 | Adaptive Big Trades | SmartTape 大单 + ClusterSearch zones | 部分覆盖 | 分位自适应阈值；图上区域 |
| 3 | Ask/Bid Volume Difference Bars | PriceChart 副图 | 缺失 | Worker |
| 4 | Balance of Power | PriceChart 副图 | 缺失 | Worker |
| 5 | Bar's volume filter | PriceChart 标记 | 缺失 | Worker |
| 6 | Bars Pattern | PriceChart 标记 | 缺失 | Worker |
| 7 | Bid Ask | PriceChart 副图 | 缺失 | Worker（bid/ask 双柱） |
| 8 | Big Trades（Cumulative/Separate、Auto Filter、Price Location、Zones、Alerts） | SmartTape 大单行 + ClusterSearch + AlertCenter | 部分覆盖 | 图上气泡/区域、Price Location 7 档、时间过滤；历史深度靠后端 tick 历史 |
| 9 | Breakout and Retest Signals | PriceChart 标记 | 缺失 | 闭源，自研规则（P2） |
| 10 | Cluster Search | ClusterSearch | **缺失（卡未建）** | 新卡（§3） |
| 11 | Cluster Statistics | Footprint 统计行 | 部分覆盖 | 16 行（§2.1） |
| 12 | Cumulative Daily Volume | PriceChart 副图 | 缺失 | Worker |
| 13 | CVD – Cumulative Volume Delta（Candles/Bars/Line、Session reset） | PriceChart 副图 | 部分覆盖（🟨 已定位） | 三可视化 + None/Default/Custom Session |
| 14 | CVD pro / Market Power | PriceChart 副图 | 缺失 | Worker（按成交规模分层 CVD） |
| 15 | CVD pro (multi) / Multi Market Powers | PriceChart 副图 | 缺失 | Worker 多阈值 |
| 16 | Delta（Candles/HighLow/Histogram/Bars、方向过滤） | PriceChart 副图 | 部分覆盖 | 四可视化 + Bar Direction / Delta Type 过滤 |
| 17 | Delta Strength | PriceChart 副图 | 缺失 | Worker |
| 18 | Delta Turnaround | PriceChart 标记 | 缺失 | Worker |
| 19 | Depth Of Market（Levels/Cumulative/Both；Net/Stacked/Pulled 变化） | DOMLadder · DOMHeatmap | 部分覆盖 | PriceChart 右侧叠 L2 条形侧栏（图上 DOM） |
| 20 | DOM levels（大挂单水平线/热带） | DOMHeatmap | 部分覆盖 | PriceChart 叠大挂单水平线 |
| 21 | Dynamic Levels（动态 POC/VA，Bid/Ask/Delta/Volume/Ticks/Time/TPO） | VolumeProfile | 部分覆盖 | 图上随时间延伸的 POC/VAH/VAL 线 |
| 22 | Dynamic Levels Channel | VolumeProfile / PriceChart | 缺失 | Worker |
| 23 | Exhaustion（Bid/Ask/Both/Volume） | Footprint 标记 | 缺失 | Worker 衰竭格 |
| 24 | Imbalance Ratio（8.0.15 重做） | Footprint | 部分覆盖 | 比率副图 |
| 25 | Initial Balance（Minutes/Bars） | VolumeProfile / PriceChart | 缺失 | Worker IB 区间 + 扩展 |
| 26 | Maximum Levels（7 类型、周期） | Footprint / PriceChart | 部分覆盖 | 类型与周期可选 |
| 27 | MBO Indicators: Icebergs / Stops / Sweeps | **MBOTrackers（新）** | 缺失 | **后端 MBO/L3 适配器**；无数据时空态 |
| 28 | OI Analyzer（Cumulative/Separated、Buys/Sells） | PriceChart 副图 | 缺失 | Worker（需 OI 流） |
| 29 | On Balance Open Interest | PriceChart 副图 | 缺失 | Worker |
| 30 | Open Interest（By Bar/Session/Cumulative） | PriceChart 副图 | 部分覆盖（🟨） | 三模式 |
| 31 | Order Block | PriceChart 区域 | 缺失 | Worker |
| 32 | Order Flow Indicator（Cumulative/Separated；Circles/Rectangles） | Footprint Order Flow 模式 | 缺失 | §2.1 Order Flow chart |
| 33 | Speed of Tape（Volume/Ticks/Buys/Sells/Delta） | SmartTape 速度条 | 部分覆盖 | 副图版 5 模式 |
| 34 | Spread Volumes Indicator | PriceChart 副图 | 缺失 | Worker |
| 35 | Stacked Imbalance | Footprint | 部分覆盖 | §2.1 |
| 36 | Tape Patterns（Any/Bid/Ask/Between/Bid or Ask/Bid and Ask） | ClusterSearch / AlertCenter | 缺失 | Worker 模式检测 → 告警源 |
| 37 | Unfinished Auction | Footprint 标记 | 缺失 | Worker |
| 38 | Volume（输入 Volume/Ticks/Ask/Bid；位置 Up/Middle/Down） | PriceChart 量柱 | 部分覆盖 | 输入类型可选；位置固定底部 20%（我们的规则） |
| 39 | Volume Bar Range Ratio | PriceChart 副图 | 缺失 | Worker |
| 40 | Volume On The Chart | PriceChart 标注 | 缺失 | Worker |
| 41 | Volume Per Trade | PriceChart 副图 | 缺失 | Worker |
| 42 | Volume profile & TPO（Profile/TPO/TPO+VP/Profile over TPO；周期 12 档；数据类型 8；POC 类型 7；VA 4 式；TPO 字母/Blocks、Sub Period split/merge、Single Prints、IB） | VolumeProfile | 部分覆盖 | TPO 变体补字母/Blocks、split/merge 热键、Single Prints、IB；数据类型加 Trades/Delta V2/Delta over Volume/Delta Volume Proportional/Delta to Volume；POC 类型 7 |
| 43 | VWAP/TWAP（周期 9 档；Total/Bid/Ask） | PriceChart 叠加 | 缺失 | Worker；Anchored VWAP 在 DrawingToolbar |
| 44 | VSA Better Volume | PriceChart 副图 | 缺失 | Worker（开源） |
| 45 | VSA – WSD Histogram | PriceChart 副图 | 缺失 | Worker（开源） |
| 46 | 第 46 项待核（候选：Average Delta · Delta Colored Candles · Bid Ask Volume Ratio · Relative Volume · Up/Down Volume Ratio · Volume-based Support & Resistance Zones） | PriceChart 副图/标记 | 缺失 | 六个全部开源，一并移植 |
| + | DOM Power · DOM Strength · Order Book Alerts（仓库 `[OrderBook]`，不在 46 内） | DOMLadder / AlertCenter | 缺失 | Worker + 告警源 |

| 指标类别（聚合） | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Classic and technical 231（MA 族 · 振荡器 · 通道 · Ichimoku · Pivots · ZigZag pro · TD Sequential · Heiken Ashi · Session Color · Round Numbers · Daily Lines · Gaps · FVG · 等） | IndicatorPanel → Worker | 缺失（卡未建） | 全部开源，按 Indicator Manager 分类批量移植；Session Color / Round Numbers / Daily Lines / Rollover Dates 需 MarketProfile |
| Options 14 + Options Chain Suite 4 + X-Ray Suite 10 | OptionsChain · GreeksBoard · VolSurface · **OptionsFlow（新）** | 部分覆盖 | §2.9 |
| Heatmap 指标 6（CVD · Market Pressure · Price Change · OHLC Plus · Value Area · VWAP） | DOMHeatmap | 缺失 | DOMHeatmap 加指标叠加层（§2.9） |
| Widgets 4 | **FlowGauges（新）** | 缺失 | §2.9 |
| Indicator Manager（三栏、Favorites、Search、Preview、Data panel、多实例、面板透明度、每图实例数） | IndicatorPanel | 缺失（卡未建） | §3、§5 |

### 2.3 Drawing objects（33）

全部落在**新卡 DrawingToolbar**（engineering.md §2.2 已指定"自写 Primitives 插件，含持久化到 Pane.state"，但无卡）。体量相关指标型对象依赖共享聚合器（与 VolumeProfile 同源）。

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Trend Line · Trend angle · Vertical/Horizontal Line · Horizontal Ray · Cross Line · Channel · Triangle · Rectangle · Ellipse · Text · Position markers | DrawingToolbar | 缺失（卡未建） | 几何基元集 |
| Fibonacci Retracements / Extensions / Fibo Fan · Elliott Wave | DrawingToolbar | 缺失 | 比例/波浪工具 |
| Ruler · Measure | DrawingToolbar | 缺失 | 两点测量（价差/时长/柱数/量） |
| Brush（自由手绘）· Keep Drawing Mode | DrawingToolbar | 缺失 | — |
| **Anchored VWAP** | DrawingToolbar + Worker | 缺失 | 锚点起 VWAP ± 带 |
| **Market profile and TPO**（任意区间轮廓对象）· **Dynamic POC** | DrawingToolbar ← VolumeProfile 聚合器 | 缺失 | 拖区间即出轮廓（VolumeProfile 的"固定区间"已有把手，可复用） |
| **CVD correlation** | DrawingToolbar + Worker | 缺失 | 区间内价格 vs CVD 相关 |
| **ZigZag TPO and Profile**（波段自动 TPO，三种比较刻度） | DrawingToolbar + Worker | 缺失 | P2 |
| Global / Locked / Hidden；Drawing Object Timeframes | DrawingToolbar + LinkContext | 缺失 | Global 对象按 `instrument.id` 存，跨同品种面板可见；周期掩码 |
| 对象列表 · Copy/Paste/Undo · Delete Selected/All · Save As Default · Magnet Sensitivity · Auto Transform H/V Lines | DrawingToolbar | 缺失 | 对象侧栏 + `drawing.*` 命令 |
| Horizontal Line Approximation alert | DrawingToolbar → AlertCenter | 缺失 | AlertCenter 加"绘图"条件源（第 6 源） |
| 全局对象转 Smart DOM（H line · Ray · Rectangle · Highlight Y） | DOMLadder · DOMHeatmap | 缺失 | 两组件读取同品种 Global 对象并在价格轴上画 |

### 2.4 Smart DOM 列与交易动作

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Price · Bids · Asks · My buy/sell orders · 价差行 | DOMLadder | 已覆盖 | — |
| Bids/Asks 三模式（Volume / Number of applications / Average volume） | DOMLadder | 缺失 | 列显示模式（需 L2 带笔数的源，否则灰） |
| Bid/Ask Ladder（单列双向） | DOMLadder | 缺失 | 紧凑单列模式 |
| My orders（合并列）· PNL & Orders · Latest trade quantity | DOMLadder | 部分覆盖 | 合并列、PnL 列（读 book/aggregator）、最新量列 |
| Queue（排队量估算） | DOMLadder | 缺失 | 以挂单时刻的档位量估算，标 `估算` |
| DOM trader 列 / Trading panel（账户、Qty、TIF、Order Type Market/Limit/Conditional、Close All、Reverse） | DOMLadder 页脚 + OrderTicket | 部分覆盖 | DOMLadder 页脚内嵌迷你下单条（共用 OrderTicket 校验与确认） |
| Histogram profile（当日轮廓，X 清空 / R 恢复） | DOMLadder 成交列（= VolumeProfile 简化版） | 已覆盖 | 加清空/恢复命令 |
| Trades 列（周期可配、含 OI） | DOMLadder | 部分覆盖 | 周期 chip + OI |
| Buy Current Trades / Sell Current Sales（自清洗） | DOMLadder | 缺失 | 两列 + 2.5s 清洗规则 |
| Depth changes 三模式（Pulling And Stacking / Stacking / Pulling） | DOMLadder 变化列（净变化） | 部分覆盖 | 模式三选一；窗口已有 |
| Notes 列 | DOMLadder ← Notes | 缺失 | 价位笔记（Notes 引用 `price@symbol`） |
| Liquidity map（DOM 内热力） | DOMLadder ← DOMHeatmap | 缺失 | 以 DOMHeatmap 渲染器作列（§4 共用 canvas 层） |
| Order Flow 列（8.0.14 可交互缩放）· Footprint 列 · Rolling Footprint（N 秒） | DOMLadder ← Footprint 渲染器 | 缺失 | 复用 flow 层渲染器按价位行绘制；Rolling N 秒窗口 |
| Simple Order Entry（点下方 Buy Limit、上方 Buy Stop、best Ask 市价） | DOMLadder（点击 = 限价） | 部分覆盖 | 位置语义：越过现价即 Stop；点最优价 = 市价 |
| Manual Order Entry（左键限价、右键止损） | DOMLadder | 缺失 | 右键 = Stop |
| MKT 按钮 · Cancel All · Flatten · Reverse | DOMLadder / 命令表 | 部分覆盖（position.close/reverse 有） | 新命令 `order.cancelAll(side?)`、`position.flatten` |
| Drag & Drop 改单 · 双击撤单 | DOMLadder | 已覆盖 | — |
| SL/TP 放置模式（可视标记） | DOMLadder | 缺失 | 并入 **ExitStrategy**，梯子上点击设 SL/TP |
| One-Click Mode · Lock trading | DOMLadder（快速模式 · 点击下单拨杆） | 已覆盖 | — |
| Close Outstanding Orders when position closed · Stop as StopLimit · Stop Limit Slippage | ExitStrategy / 执行网关 | 缺失 | 账户级交易设置，写进网关配置 Query |
| Auto-Center（间隔 / 速度 / 偏离 10 tick）· Center / Center All | DOMLadder（跟随 / 锁定） | 部分覆盖 | `dom.center`、`dom.centerAll` 命令 |
| Depth Count · Price Digits · Flash Settings · Volume Display 缩写 · Rows Height | DOMLadder | 部分覆盖 | 面板设置补齐；Flash 受运动预算约束 |
| Design mode（按钮尺寸/列宽/显隐） | DOMLadder（列可配可拖） | 部分覆盖 | 列宽/显隐持久化到 Pane.state |
| Clone window · Topmost | PanelFrame 复制实例 / 弹出到新窗口 | 等价能力 | 弹出到独立浏览器窗口（多显示器），上下文经 BroadcastChannel 同步；壳内 Topmost 不做（§0） |
| Smart DOM Templates · Recommended Gallery | — | 缺失 | **Workspaces** 面板模板 |
| DOM 热键 11 条（Center、Clear Current Trades、Clear Depth Changes、Reset Volume Profile、Apply Auto Scale、Scale ±） | 命令表 | 缺失 | `dom.*` 命名空间进 Smart DOM 热键组 |
| 全局绘图对象进 DOM | DOMLadder | 缺失 | §2.3 |

### 2.5 Smart Tape、Bid/Ask Tape、Watchlist 与其他模块

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Time(ms) · Price · Tick direction · Trade Volume | SmartTape | 已覆盖 | — |
| Bids · Asks · Sizes（成交时最优价与量）· Avg.Vol. · Buy/Sell Strength | SmartTape | 缺失 | 五列可选（需逐笔携带 L1 快照） |
| Cumulative Trades Filter（Min/Max）· Show Cumulative Ticks | SmartTape（阈值 + 聚合） | 部分覆盖 | 加 Max；聚合开关已有 |
| Separated Prints Filter · Level 1 Filters | SmartTape | 缺失 | 两组过滤 chip |
| Between Color（价差内成交）· Above Ask / Below Bid 高亮 | SmartTape | 缺失 | 第三方向色（用 `ink` 级别，不加新色） |
| Tape Speed · Freeze · Historical mode · Reset | SmartTape（速度条、暂停）+ ReplayBar | 已覆盖 | Reset 命令 |
| Templates · Clone · Window-on-top | Workspaces / PanelFrame | 等价能力 | on-top = 弹出到新窗口（§0） |
| **Bid/Ask Tape**（L1 报价变化带，独立模块） | SmartTape | 缺失 | SmartTape 加"报价带"模式（同一组件、不同流） |
| **All Prices**（已迁 X，正文未抓） | VolumeProfile 表格模式？ | 缺失（待核） | 先核实模块内容再定落点 |
| Watchlist 列（Last · Bid/Ask qty · Vol. Last Trade · Volume · Change · Change%）· Quote Filter · 多列表 · 拖到模块 | Watchlist · Screener | 已覆盖 | — |
| Instruments Manager（按 ID 搜索、加载未列合约、SSF） | SymbolMap · GO Bar | 部分覆盖 | SymbolMap 加"合约目录"视图（交易所→产品→到期，含 Rollover Dates） |
| Market News 页（RSS + 新闻 + 经济日历） | NewsFeed · Calendar | 已覆盖 | — |
| Forward Curve | YieldCurve | 部分覆盖 | YieldCurve 泛化为期限结构（期货远期曲线） |
| Traders Talk（社区聊天） | **Talk（新卡）** | 等价能力 | 频道聚合（Telegram / Discord / Matrix 适配器）+ 团队频道 + Agent 会话一条流；对象链接可点；不自建社区 |
| Connection Status Monitor | DataSources · StatusBar | 已覆盖 | — |
| Screenshot（Copy Image / Copy Link / Download） | ReportBuilder 快照 | 部分覆盖 | `panel.snapshot` 命令；Copy Link 依赖服务端，走 ReportBuilder |
| Privacy mode（隐藏账户数据） | layout.md 大屏模式遮蔽 | 部分覆盖 | 提升为全局拨杆（StatusBar 段 + 热键） |

### 2.6 Alerts

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| 指标内置告警（Cluster Search · Big Trades · Order Flow Indicator · Dynamic Level · Cluster Statistics 14 项 · MBO Icebergs · Order Book Alerts） | AlertCenter 订单流/指标源 | 部分覆盖 | 每个 Worker 指标暴露 `signals[]`，AlertCenter 以指标 id 订阅 |
| Smart Tape 告警（6 种 Filtration Mode、Min/Max Volume、行高亮、声音） | AlertCenter 订单流源 + SmartTape 大单 | 部分覆盖 | 6 模式进条件编辑 |
| Horizontal Line Approximation alert | — | 缺失 | AlertCenter 第 6 条件源"绘图"（§2.3） |
| 渠道：声音 · 告警窗口 · Telegram · Webhook（多条件合并） | AlertCenter（L1–L4 阶梯、Webhook、合并计数） | 已覆盖 | Telegram = Webhook 模板之一 |
| Email | AlertCenter Webhook 出站适配器 | 等价能力 | Email 作为 Webhook 的一个出站适配器（后端），ATAS 自身已停 |
| 关机不触发（ATAS 限制） | 规则引擎在 Worker / 服务端 | 已覆盖（更优） | 账户/研究类规则跑服务端即关机也触发 |
| Risk Management 通知 · 关闭时有持仓警告 | LossLimits · AlertCenter | 已覆盖 | 退出时有持仓 → 确认框 |

### 2.7 Strategies、SL/TP、Risk Manager、交易面板、热键

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Chart Strategies（用户 C# `ChartStrategy`）· Custom Indicators DLL · Marketplace | SignalMonitor · RunLauncher · DeploymentBoard · IndicatorPanel 插件注册表 · Extensions | 等价能力 | 策略 = Python 在引擎跑、OpenAlice 编排、图上启停与信号；自定义指标 = TS / Python 插件经 IndicatorPanel 注册表加载（SDK + 模板，不编译 DLL）；Marketplace = 面板包 / 指标包的 Extensions 目录（§0） |
| Strategy backtesting（Classic only） | Lab（EquityCurve · TradeStats · WalkForward…） | 已覆盖（形态不同） | — |
| SL/TP Simple（ticks/%/price） | ChartTrader 括号 | 部分覆盖 | **新卡 ExitStrategy**，三个下单入口共用 |
| SL/TP Multi-Level（Absolute/Percentage 多层） | — | 缺失 | ExitStrategy；分层执行在执行网关 |
| Breakeven（阈值 + Offset）· Trailing Stop（distance + step） | — | 缺失 | ExitStrategy 配置；**追踪逻辑由执行网关执行**（前端关闭也生效） |
| Set Stop-Loss / Take-Profit / Breakeven 手动命令与热键 | 命令表 | 缺失 | `position.setStop / setTarget / breakeven` |
| 订单类型 Market · Limit · Stop · StopLimit · Conditional · OCO；TIF Day/GTC/FOK/IOC | OrderTicket（限价/市价/对手价/算法） | 部分覆盖 | 加 Stop / StopLimit / OCO；TIF 下拉；Conditional 的 Stop/Limit 价 |
| Reduce Only · Post Only · Close on Trigger · Change margin mode（加密） | OrderTicket | 缺失 | Order Flags 由 MarketProfile(CRYPTO) 决定显隐 |
| Trading panel：Buy/Sell Ask · Buy/Sell Bid · Cancel Bids/Asks/All · Reverse · Close · Flat/Position Size · Entry | OrderTicket · DOMLadder 页脚 | 部分覆盖 | 对手价/本方价快捷钮；侧向撤单命令 |
| Volume Selector 预设 1–5 + 热键 | OrderTicket 数量档 ≤ 4 | 部分覆盖 | 5 档 + `trade.volumePreset n` |
| 交易热键 20+（Buy/Sell Market · Buy/Sell Ask/Bid · Cancel all/limits/stops · Reduce-only 切换 · Close · Reverse · SL/TP/BE · Presets） | 命令表（order.place/replace/cancel · position.close/reverse） | 部分覆盖 | 补 `order.cancelAll(kind)`、`position.flatten`、`trade.flag.*`；全部进 Preferences Trading 热键组 |
| Trading from Main Window（Orders/Positions 页管理） | OrderBlotter · PositionBook | 已覆盖 | — |
| Risk Management Module：日亏/日盈限额 · 最大笔数 · 连亏阈值 · Reduce Only · 通知 | LossLimits · RiskBoard | 部分覆盖 | LossLimits 加限额类型"日盈上限 / 最大笔数"与动作"Reduce Only"；**决策点**：ATAS 允许应用内设限额，我们限额只读——建议加 `limit.set` 写命令（确认 + 冷却期），执行仍在网关 |
| Commission 设置（PnL 含费） | Preferences / book/performance | 已覆盖（费后口径） | — |
| Cross-Trading（分析 ES 下 MES，19 组配对，PnL 按微型 tick） | — | 缺失 | OrderTicket/ChartTrader/DOMLadder 加"执行合约"下拉；配对表进 markets.md；无新卡 |
| Following Manager（Positions/Orders · Ratio · Reverse · Manual Confirmation · Notifications） | OrderBasket（一次性篓子） | 缺失 | **新卡 AccountMirror**；镜像引擎在执行网关 |
| Account Info Display | AccountRail · StatusBar ACCOUNTS 段 | 已覆盖 | — |

### 2.8 Market Replay 与 Statistics / Trading Journal

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Play/Pause/Stop · 倍速 · 日期范围 · 进度条 · 事件标记 | ReplayBar | 已覆盖 | — |
| 步进 bar / period / date | ReplayBar（← → 1 分钟/10 分钟） | 部分覆盖 | 步进模式三选一 |
| 三种数据模式（Ticks + DOM / Ticks + Generated DOM / Generated） | ReplayBar ← 回放服务 | 部分覆盖 | **后端回放适配器**声明保真度；ReplayBar 显示 `L2 真实 / L2 生成 / 全生成` 角标 |
| 最多 20 品种同步回放 | LinkGroup 回放时钟 | 已覆盖（设计上） | 并发数由回放服务决定 |
| Replay Account 独立 + 进统计 | ReplayBar（`replay` 标记成交） · TradeStats（`RUN` 标） | 部分覆盖 | TradeStats 加 `REPLAY` 来源标，与实盘/RUN 三分 |
| 回放中锁连接 · 图表头显示 Historical | ReplayBar scanline + `REPLAY` 标 | 已覆盖 | — |
| Statistics 17 项（PF · 回撤 · Recovery · 盈亏日…） | TradeStats · PerformanceReport | 已覆盖 | TradeStats 补 Recovery factor、Profit/Loss days |
| Journal 列（开平时间/价/量、PnL、Comment） | TradeStats trips 导出 | 已覆盖 | — |
| Equity 子页 | IntradayPnL · PnLLedger 曲线 | 已覆盖 | — |
| Orders / Execution 历史子页 | OrderBlotter（仅在途）· FillLog（今日） | 部分覆盖 | 历史查询走 Lab DataGrid（FillLog 规则）；加"历史订单"预设 |
| 过滤账户/品种/时间 · Export Excel | AccountRail · LinkContext.range · DataGrid 导出 | 已覆盖 | — |
| New execution（手工补录成交）· Recalculate · Clear database | FillLog / BreakWorkbench | 部分覆盖 | FillLog 允许来源 `手工补录` 的 append 行（不改史） |
| Trading Journal：交易日历 · 按品种表现 · playbook 笔记 | Calendar · TradeStats 分布 · Notes | 部分覆盖 | TradeStats 加 setup 标签维度；Notes 引用 trip |

### 2.9 Heatmap、MBO Bundle、Options suites、Widgets

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作（引擎能力） |
|---|---|---|---|
| Heatmap 核心（时间 × 价格挂单量、气泡、现价线、缩放平移） | DOMHeatmap | 已覆盖 | — |
| Heatmap by Volume / Trades / Delta 三数据模式 | DOMHeatmap（挂单量） | 部分覆盖 | 三模式切换 |
| 3D mode | DOMHeatmap 3D 视图模式 | 等价能力 | 时间 × 价格 × 挂单量高度场（WebGL / WebGPU 栅格后端），默认 2D，`heatmap.view 3d`，仰角两档，单色序列 |
| 20+ 配色 | DOMHeatmap | 等价能力 | 能力（可换色）保留：顺序色阶单色规则下提供橙 / 色觉友好蓝两套 + 用户自定义单色序列 |
| Perfect Sync（价格轴与 Footprint/DOM 锁定缩放滚动） | LinkGroup 十字线同步 | 部分覆盖 | **LinkContext 新槽位 `priceRange`**（= Link Price Axis） |
| Heatmap 指标叠加（CVD · Market Pressure · Price Change · OHLC Plus · Value Area · VWAP） | — | 缺失 | DOMHeatmap 加指标层（复用 Worker 指标输出，画在同一价格轴） |
| 自动历史记录 · 历史天数 | DOMHeatmap（"历史由数据中心按需回补"） | 部分覆盖 | **后端 L2 历史录制适配器**；前端显示可用天数 |
| 全屏模式 + 专属热键 | PanelFrame 最大化 + 命令 | 部分覆盖 | `heatmap.*` 热键组 |
| Bubbles（市价单气泡） | DOMHeatmap 成交气泡 | 已覆盖 | — |
| Icebergs Tracker / Stops Tracker / Sweeps Tracker（参数见 §1）+ Activity Panel + 告警 | **MBOTrackers（新）** | 缺失 | **后端 MBO/L3 适配器**（Rithmic 类 Order-ID 流）；叠加到 flow 层、DOMLadder、DOMHeatmap |
| Options Board (Beta) | OptionsChain | 已覆盖 | — |
| Options Strategy Analyzer (Beta) | GreeksBoard 构建模式 | 已覆盖 | — |
| Options Chain Suite：Expected Move · OI Profile · Key Levels · GEX Profile（图上水位） | PriceChart 叠加 | 缺失 | IndicatorPanel 期权类指标；**后端期权链 + 定价适配器** |
| X-Ray：Big Trades · Flow · Flow Delta · Strike Profile · Market State | **OptionsFlow（新）** | 缺失 | 期权成交流适配器（CBOE 类，分钟级） |
| X-Ray：Surface Profile | VolSurface | 已覆盖 | — |
| X-Ray：Strike Heatmap · GEX Heatmap · Charm Heatmap | Heatmap（顺序/发散变体） | 部分覆盖 | Heatmap 预设：行权价 × 时间；数据来自 OptionsFlow 适配器 |
| Coinglass Long/Short Ratio · Open Interest（加密） | PriceChart 副图 | 缺失 | 外部数据适配器 |
| Widgets：Market Pressure · Price Change（−100…+100）· DOM Pressure · Delta Divergence（多周期） | SparkTile · Meter · StatusLED | 缺失（无面板） | **新卡 FlowGauges**：Meter + SparkTile + LED 矩阵组成的订单流仪表行；计算在 Worker |

### 2.10 Workspace / Layout / Templates / Linking / Hotkeys / Connectors

| ATAS 项 | 我们对应组件 | 状态 | 补齐动作 |
|---|---|---|---|
| Workspace Add/Load/Rename/Delete/Copy/Edit | WorkspaceTabs（右键重命名/复制/关闭/设为启动） | 已覆盖 | — |
| Workspace Import/Export · 记住上次 workspace · Workspace Editor | Preferences 导入/导出 · blueprint 待卡 Workspaces | 部分覆盖 | **建卡 Workspaces**（模板 / 恢复 / 缺失面板占位 / 导入 diff） |
| Layouts · working layers · Universal 层 | WorkspaceTabs + 钉住面板 | 等价能力 | 多布局 = 多工作区标签；Universal 层 = 钉住面板（跟随所有工作区，layout.md）；不复制 Classic 的三层 |
| 模块 Templates（Chart / Smart DOM / Smart Tape；Favorites；Gallery） | Pane.state | 缺失 | Workspaces 卡：PanelSpec 级模板 |
| tab 架构（任意数量图表与 widget） | WorkspaceTabs + split 树 | 已覆盖 | — |
| 浮窗 · Topmost · Clone 到独立窗口 · Windows arranging | PanelFrame「弹出到新窗口」 | 等价能力 | 弹出到独立浏览器窗口（多显示器），仍属原工作区与联动组，BroadcastChannel 同步；壳内无浮窗 / docking（layout.md） |
| Windows Linking 颜色组（8 模块同步品种） | PanelFrame LinkGroup 色标（link-a…d） | 已覆盖 | 采纳上一份调研结论扩到 8 通道 + Channel audit |
| Link Price Axis | — | 缺失 | LinkContext `priceRange` 槽（§2.9） |
| Global Crosshair / Sync Crosshair / 同品种多图光标同步 | LinkGroup | 已覆盖 | — |
| Global drawing objects | DrawingToolbar | 缺失 | §2.3 |
| 热键 5 组 + Heatmap 专区 + Footprint/周期热键 | Preferences 键位表（搜索/冲突/重置/导出） | 部分覆盖 | 键位表按命令命名空间分组展示（Global/Trading/DOM/Chart/Heatmap/Replay/Screenshot） |
| Settings：Sound · Time Zones · Commission · Custom Modules · Common（VA % · Rendering · Data delay · Notification） | Preferences · RENDER 面板 | 已覆盖 | Custom Modules = 待卡 Extensions |
| 模块设置即时保存同步 · 统一交易面板设置 | Preferences（账户配置 Query 同步） | 已覆盖 | 交易设置（快速模式 / 点击下单 / ExitStrategy）单一来源 |
| 统一对话框 · 单实例启动 · 全局异常处理 | Overlays · 外壳 | 已覆盖 | — |
| 20+ 连接器 · Sim 连接 · Connection Status Monitor | DataSources（只显示）+ 后端适配器 | 已覆盖（架构） | 连接器 = 适配器清单；启停在待卡 Extensions |
| Connection Settings Window（应用内填凭证） | Extensions 连接向导 + DataSources | 等价能力 | 从 UI 连接券商 / 行情：向导选适配器、凭证直送后端 vault，前端只见状态与到期（§0） |
| tier gating（指标数/连接数/资产数/历史天数） | **Entitlements（新卡）** | 等价能力 | 计划 / 角色 / 数据源三类门控与配额，默认全开、部署者可配；被门控功能灰显并说明来源 |

**统计**：218 行中 已覆盖 44（20%）· 部分覆盖 70（32%）· 缺失 94（43%）· 原标不做 10（5%）——按 §0 原则，10 项全部重分类为等价能力（操作不同、能力相同），不做为 0。分段看：Chart 38 行（8 / 17 / 12 / 1）· Indicators 52 行（0 / 16 / 36 / 0）· Drawing 12 行（0 / 0 / 12 / 0）· Smart DOM 27 行（4 / 10 / 13 / 0）· Tape 与其他模块 17 行（5 / 6 / 5 / 1）· Alerts 7 行（3 / 2 / 1 / 1）· 交易与风控 17 行（4 / 6 / 6 / 1）· Replay 与 Journal 13 行（7 / 6 / 0 / 0）· Heatmap/MBO/Options/Widgets 18 行（5 / 5 / 6 / 2）· Workspace/Linking/Connectors 17 行（8 / 2 / 3 / 4）。缺失高度集中：94 个里 **48 个来自指标表与绘图表，只能落在 IndicatorPanel（直接承接约 30 个）、DrawingToolbar（12 个）、ClusterSearch（3 个）与 MBOTrackers（1 个）这几张未建卡上**；Chart 的 12 个缺失几乎全是 Footprint flow 层的模式与参数；DOM 的 13 个是列与交易动作扩展；其余 21 个分属 ExitStrategy、OptionsFlow、FlowGauges、AccountMirror、Workspaces。Indicators 与 Drawing 两段"已覆盖"为零不是算法难度，是卡不存在。

## 三、新增组件：三张"幽灵卡"必须先补，再加五张

coverage.md 把 `IndicatorPanel`、`DrawingToolbar`、`ClusterSearch` 标为 ✅ 并写进"第 4 批"，engineering.md §2.2 也把绘图与指标明确指派给前两者，但 `components/` 94 个目录里没有它们；它们是 ATAS 指标与绘图两大块的唯一落点，不补卡就无从对照。下面 9 张卡沿用"KATANA 不造引擎"的分层：**订单流与技术指标在前端 Worker 算（逐笔 + L2 输入）**；**历史 tick/L2、回放、MBO、期权链与定价由后端适配器提供**，前端只声明接口形态与空态。

| 组件 | 分组 | 一句话职责 | 依赖的引擎能力 | 来源 |
|---|---|---|---|---|
| **IndicatorPanel** | 图表 7→8 | ATAS Indicator Manager 的对应：三栏（分类/收藏 · 搜索+列表 · 预览+参数），把 Worker 指标注册表（46 order-flow + 231 technical + 期权/热力类）挂到 PriceChart 叠加/副图或 DOMHeatmap 指标层；支持同指标多实例、模板、每图实例数、面板透明度、Data 设置页（输入源 Volume/Ticks/Bid/Ask、Session reset） | 前端 Worker 指标计算（逐笔 + L2 + K 线）；OI/期权/外部数据走适配器 Query | 已命名未建 |
| **DrawingToolbar** | 图表 | 33 类绘图对象的 Primitives 插件，含体量型对象（Anchored VWAP · Market profile and TPO · Dynamic POC · CVD correlation · ZigZag TPO）；Global/Locked/Hidden、周期掩码、Keep Drawing、对象列表、Copy/Paste/Undo、Magnet；Global 对象按 `instrument.id` 存并供 DOMLadder/DOMHeatmap 读取；Horizontal Line 告警作为 AlertCenter 绘图源 | 前端：Pane.state 持久化 + 共享轮廓聚合器；无后端 | 已命名未建 |
| **ClusterSearch** | 订单流 5→8 | ATAS 的"扫描器"：Cluster Search 全参数（Calculation Mode 6 · Auto Filter · 量/均量/占比区间 · Imbalance/Delta 过滤 · Candle Direction · Price Location 8 · 高度过滤 · 时间 · Days Look Back）+ Big Trades/Adaptive Big Trades zones + Absorption + Tape Patterns + Exhaustion/Unfinished Auction 检测器；命中格在 flow 层高亮、结果进 DataGrid、每条检测器可存为 AlertCenter 规则 | 前端 Worker（逐笔 + L2）；历史深度靠后端 tick 历史 | 已命名未建 |
| **Workspaces** | 运行中心 | 工作区与模板管理：工作区列表/导入导出/恢复/缺失面板占位、布局模板、**PanelSpec 级面板模板**（Chart/DOM/Tape/Heatmap 设置快照，Save/Default/Export/Favorites）、交易设置单一来源 | 前端：账户配置 Query | blueprint 待卡 |
| **ExitStrategy** | 交易 2→3 | SL/TP (automatic exit strategy) 的对应：Simple / Multi-Level 两模式、Breakeven、Trailing Stop、Stop as StopLimit、Close Outstanding on flat；作为 OrderTicket 的一块、ChartTrader 括号与 DOMLadder SL/TP 放置模式的共同配置源；暴露 `position.setStop/setTarget/breakeven/trail` 命令 | **执行网关执行**（追踪与分层出场必须服务端跑，前端关闭仍有效）；前端只配置与显示 | 新 |
| **FlowGauges** | 订单流 | 四个 Widgets 的面板：Market Pressure · Price Change（−100…+100 Meter）· DOM Pressure · Delta Divergence（5s–20min 多周期 LED 矩阵，N/A 状态）；由 Meter + SparkTile + StatusLED 组成，受仪器预算约束 | 前端 Worker（逐笔 + L2） | 新 |
| **MBOTrackers** | 订单流 | Icebergs / Stops / Sweeps 三个 Tracker 的叠加层 + Activity Panel + 告警：参数照 ATAS（Min Hidden/Total Volume、Max Window ms、Min Range ticks、Aggressors Count、高亮样式 5 种）；叠加到 flow 层、DOMLadder、DOMHeatmap | **后端 MBO/L3 适配器**（Order-ID 级订单簿事件）；无 MBO 源时显示"无逐单数据"空态，不降级伪造 | 新 |
| **OptionsFlow** | 衍生品 3→4 | Options X-Ray 的流式部分：Big Trades · Flow · Flow Delta · Strike Profile · Market State，一条期权成交带 + 按行权价轮廓；GEX/Charm/Strike Heatmap 用 Heatmap 预设；Expected Move / OI Profile / Key Levels / GEX Profile 作为 PriceChart 叠加（经 IndicatorPanel） | **后端期权链 + 成交流 + 定价适配器**（Greeks 由 Worker BS/Black76 或 Lab run） | 新 |
| **AccountMirror** | 组合 6→7 | Following Manager 的对应：Provider → Followers 规则（Positions / Orders 模式、Ratio、Reverse、Manual Confirmation、Notifications），显示镜像状态与偏差 | **执行网关镜像引擎**；前端只配置（写命令 + 确认）与显示 | 新 |

不建新卡、只扩展现有卡的大项：Footprint 全模式矩阵与统计行（→ PriceChart flow 层 / Footprint 渲染器）、DOMLadder 10 个分析列与交易动作、SmartTape 五列与 Bid/Ask Tape 模式、VolumeProfile 完整 TPO、DOMHeatmap 指标层与价格轴锁、LossLimits 限额类型、Cross-Trading（三个下单入口 + markets.md 配对表）、ReplayBar 步进模式、TradeStats 日志维度、SymbolMap 合约目录、YieldCurve 泛化。

**不做为零**（§0）：原先的 10 项全部按"能力 1:1、操作我们的"落位——Chart Strategies / 自定义指标 → Python 策略在引擎 + OpenAlice、TS / Python 指标插件经 IndicatorPanel 注册表（需要**指标 SDK 与模板**，blueprint §6）；RangeX 系 → 自有 Range 变体；Layouts 工作层 → 多工作区标签 + 钉住面板；浮窗 / Clone / Topmost → 弹出到新浏览器窗口（BroadcastChannel 同步）；Connection Settings → Extensions 连接向导 + 后端 vault；Email → Webhook 出站适配器；Heatmap 配色 → 两套 + 用户自定义单色序列；**3D heatmap → DOMHeatmap 3D 视图模式**；**Traders Talk → Talk 卡**；**tier gating → Entitlements 卡**。新卡因此为 11 张（9 + Talk + Entitlements）。

## 四、优先级与 lightweight-charts 冲突：Footprint 必须回到图表坐标系

### 4.1 冲突评估

engineering.md §2.2 把 PriceChart 定为 lightweight-charts（LWC）皮肤，Footprint / DOMHeatmap / VolumeProfile 定为自研 Canvas 2D 独立面板。ATAS 的结构恰好相反：Footprint 是 Chart 的**显示模式**，与 33 个绘图对象、所有指标、Chart Trader、Cluster Statistics 行共用一个坐标系，并按缩放自动在 Candles 与 Clusters 之间切换 ([Chart Display Modes](https://help.atas.net/en/support/solutions/articles/72000602349-chart-display-modes))。按现设计，用户在 Footprint 面板上既画不了线、下不了单，也叠不了 VWAP——这不是补几个模式能解决的，是坐标系归属问题。评估如下（LWC 能力部分属工程判断，标注需 spike 验证）：

| 需求 | 能否在 LWC 上做 | 判断与替代 |
|---|---|---|
| K 线 / 线 / 面积 / 量 / 副图 / 时间周期 | 能 | 维持 LWC（已定） |
| Transparent / Hidden 模式、倒计时、Overlay Mode | 能 | LWC 选项 + Primitive |
| **Footprint 作为显示模式**（每根 K 线一个格矩阵，含文字、失衡描边、统计行） | **大概率能，需 spike**：LWC Primitive（ISeriesPrimitive）拿得到 `priceToCoordinate` / `timeToCoordinate`，ChartTrader 正是这样画线的；把现有 Footprint Canvas 渲染器改成在 Primitive 的 `draw(target)` 里按可见区间绘格即可；风险是每次重绘全量、文字渲染成本、10 万根时的裁剪 | **方案 A（推荐先试）**：Footprint = PriceChart 的 flow 层 Primitive，K 线在柱宽 ≥ 阈值时隐藏实体（Auto Transform）；独立 Footprint 面板保留，内部就是 `1x1` PriceChart + flow 层。**验收**：500 根可见 × 20 档 × 文字，p95 帧时 ≤ 8ms；不过则转方案 B |
| Tick / Volume / Delta / Range / Renko / Reversal 非时间柱 | **部分能，需 spike**：LWC 时间轴要求严格递增的时间值（秒级），同秒多根 tick 柱会冲突；需用序号作横轴并自定义刻度格式化（LWC 4.2+ 的自定义横轴行为），或退化为"每根柱一个合成时间" | Worker `bars/builder` 产柱；横轴用序号 + 格式化真实时间；不行则方案 B |
| Order Flow chart（每笔成交圆/矩形）、Cluster Statistics 行、Value Area 底色、Additional Footprint | 同 Footprint | 同 flow 层 |
| **DOMHeatmap（100ms 列 × 数百价位的流式栅格，撤单余晖，气泡）** | **不能**：LWC 时间轴秒级且面向序列，不是栅格画布；每列 100ms 新列推入与整图位图更新不适合其绘制模型 | 维持自研 Canvas 2D（已定），**WebGPU/WebGL2 栅格后端**（每列一次纹理上传）作为 rendering.md 的"后端"选项；气泡层可用 regl-scatterplot（wheels.md 候选）；不用 uPlot（它是折线库，不是栅格） |
| **MBO Trackers**（逐单事件叠加到 Footprint/DOM/Heatmap） | 叠到 flow 层能；叠到 Heatmap 不能 | 一个渲染器两处挂：flow 层 Primitive 与 DOMHeatmap 图层 |
| **Link Price Axis**（Chart / Footprint / DOM / Heatmap 价格轴锁定） | 能：LWC 价格轴可编程设范围，但三个不同引擎（LWC / DOMLadder 虚拟表 / DOMHeatmap canvas）要共享一个 `priceRange` | LinkContext 新槽位 `priceRange {low, high, tick}`，三方订阅；写入端是用户正在缩放的那一面板 |
| 绘图对象 / ChartTrader 复用到 DOMHeatmap、DOMLadder（ATAS 8.0.15 全局对象进 DOM） | LWC Primitive 只在 LWC 内有效 | 抽象 **`ChartSurface` 接口**（priceToY · xOf(time/index) · hitTest · invalidate）；LWC 适配器与自研 canvas 各实现一份，DrawingToolbar / ChartTrader / MBOTrackers 只针对接口写一次 |

**方案 B（兜底，不是首选）**：若 spike 失败，按 engineering.md §2.2 的既定退路"自研 Canvas 2D 图表层，不是回到闭源库"——以现有 Footprint/DOMHeatmap 渲染器为基础做 `FlowChart`（层栈：柱 / 足迹 / 轮廓 / 热力 / 绘图 / 订单），仅用于订单流台面；PriceChart 的 K 线模式继续 LWC，两者通过 LinkContext（symbol · timeframe · range · priceRange · crosshair）与 `ChartSurface` 共享绘图与订单层。代价是两套坐标引擎并存与 uPlot 之外第三个图库级模块；收益是 ATAS 式 600 FPS 级订单流渲染不受 LWC 绘制模型约束。无论 A 或 B，**`ChartSurface` 接口都要先做**——它是绘图、下单、MBO 三类叠加层能跨 Chart/DOM/Heatmap 复用的前提，也是 ATAS "全局绘图对象进 Smart DOM" 的工程等价物。

### 4.2 实现优先级

P0 以盯盘工作区（Desk 的 2x2 盯盘 / 1+2 订单流 / 2x1 回放 / 1+2 下单四个台面）打开即可用为准；P1 是 ATAS 用户换过来后一周内会找的；P2 依赖尚未选定的数据适配器。

| 级别 | 内容 | 依赖 |
|---|---|---|
| **P0** | ① `ChartSurface` 接口 + Footprint flow 层 spike（方案 A/B 决策）② Worker `bars/builder`（Tick/Volume/Delta/Range/Renko/Reversal）③ **IndicatorPanel 卡** + 首批 12 个 order-flow 指标（Volume · Delta · CVD · VWAP/TWAP · Volume profile（Profile 部分）· Big Trades · Cluster Statistics 行 · Speed of Tape · Open Interest · Depth Of Market · Maximum Levels · Imbalance Ratio）④ **DrawingToolbar 卡**（几何 + Fibonacci + Ruler + Anchored VWAP + Global/Locked/Hidden）⑤ DOMLadder：Simple/Manual 下单语义（Stop 右键）· MKT/Cancel All/Flatten/Reverse · 页脚迷你下单条 · Pulling/Stacking 三模式 · DOM 热键 ⑥ SmartTape：Bids/Asks/Sizes 列 · Separated/L1 过滤 · 价差内着色 · Bid/Ask Tape 模式 ⑦ **ExitStrategy 卡**（Simple SL/TP + Breakeven + Trailing）+ OrderTicket 加 Stop/StopLimit/OCO/TIF ⑧ LinkContext `priceRange` ⑨ Preferences 热键分组 + 交易命令补齐 ⑩ **Workspaces 卡**（面板模板）⑪ ReplayBar 步进模式 + 保真度角标 ⑫ AlertCenter 绘图源与 Cluster Statistics 14 项 | 前端为主；tick/L2 历史与回放流由已选行情适配器提供 |
| **P1** | ① **ClusterSearch 卡**（全参数 + Big Trades zones + Absorption + Tape Patterns）② Footprint 全模式矩阵（10 × 7 × 9）、Additional Footprint、Filters、Value Area、Auto Transform、Footprint 热键 ③ VolumeProfile 完整 TPO（字母/Blocks、split/merge、Single Prints、IB、8 种数据类型、7 种 POC）④ 其余 34 个 order-flow 指标 + 231 technical 批量移植 ⑤ DOMLadder 分析列（Footprint / Rolling Footprint / Liquidity map / Order Flow / Current Trades / Notes / Queue / Bid-Ask 三模式）⑥ DOMHeatmap 指标层 + 三数据模式 + 历史录制适配器 ⑦ **FlowGauges 卡** ⑧ LossLimits 限额类型与 `limit.set` 决策 ⑨ Cross-Trading ⑩ Overlay Mode · Favorite timeframes · 倒计时 · 滚轮模式 · Privacy 全局拨杆 ⑪ TradeStats setup 标签 / REPLAY 来源 / Recovery factor；FillLog 手工补录 ⑫ SymbolMap 合约目录 | L2 历史录制适配器（Heatmap 历史）；其余前端 |
| **P2** | ① **MBOTrackers 卡**（三 Tracker + Activity Panel）② **OptionsFlow 卡** + Options Chain Suite 叠加 + GEX/Charm Heatmap 预设 ③ **AccountMirror 卡** ④ Breakout and Retest Signals、ZigZag TPO and Profile、Magnifier、CVD correlation ⑤ Forward Curve（YieldCurve 泛化）⑥ All Prices（先核实内容）⑦ Coinglass 类加密 OI/LS 数据 ⑧ WebGPU 栅格后端（DOMHeatmap 超大矩阵时） | **MBO/L3 适配器**（Rithmic 类）、**期权链 + 成交流 + 定价适配器**、执行网关镜像引擎、外部数据适配器 |

## 五、ATAS X 壳层的直接借鉴点

ATAS X 的壳层变化集中在五处，都是我们已有骨架能直接吸收的，差别只在"借什么、不借什么"。

| ATAS X 做法 | 借鉴到 | 具体落点 | 不借的部分 |
|---|---|---|---|
| **tab 架构**：从 Classic 多窗口转为"任意数量图表与 widget 组织在标签中"，workspace 加载"2.5x faster"，Classic workspace/模板可迁移 ([atas.net/atas-x](https://atas.net/atas-x/); [spring-promo-x](https://atas.net/spring-promo-x/)) | WorkspaceTabs + split 树 | 印证"面板先于 tab、系统里唯一的 tab 是工作区标签"（engineering.md §7）；Widgets 作为 FlowGauges 面板进 split 树而非悬浮 | 面板级 tab、Clone 浮窗、Topmost——X 仍保留窗口残余，我们不保留 |
| **Indicator Manager 三栏**：Categories（默认开 Favorites）· Search + List · Preview/Settings；8.0.14 加 Data settings 面板；8.0.15 同指标多实例与面板透明度 ([X 7.0.9 推文](https://x.com/AtasTrading/status/1925529961181442218); [Changelog](https://feedback.atas.net/changelog)) | IndicatorPanel 卡 | 三栏照搬；分类用 ATAS 的营销分组（Bid x Ask/Delta/Volume · Clusters/Profiles/Levels · COT · Order Flow · Other · Technical）加"订单簿""期权""热力"；Data 页 = 输入源与 Session reset；多实例 = 同指标不同参数各一行 | 每图指标数上限（tier 产物）；预览用真实数据不用示意图 |
| **Workspace Editor**：集成在授权窗口；记住上次 workspace 并预选；模块设置即时保存同步；Classic↔X 迁移靠"每图设置存为模板" ([Beta 8.0.15](https://feedback.atas.net/changelog/beta-8015)) | Workspaces 卡 + Preferences | 启动即恢复上次工作区；面板模板是迁移单元（PanelSpec + Pane.state JSON）；设置即时写账户配置 Query | 登录窗口里编辑工作区（我们无登录壳） |
| **颜色组联动 + Link Price Axis + 全局光标 + 全局绘图**：Chart 左上角颜色组选择器，同组同步品种，支持 8 类模块；Heatmap 缩放时 Footprint/DOM "lock to the same price range … zero reload lag"；同品种多图光标同步；全局绘图对象 8.0.15 进 DOM ([Windows Linking](https://help.atas.net/en/support/solutions/articles/72000637162-windows-linking); [atas.net/heatmap](https://atas.net/heatmap/)) | PanelFrame 色标 + LinkContext | 维持上一份调研的 8 通道 + Channel audit；**新增 `priceRange` 槽位**，由正在缩放的面板写、同组 Chart/Footprint/DOM/Heatmap 读；Global 绘图对象按 `instrument.id` 存，DOMLadder/DOMHeatmap 通过 `ChartSurface` 画 | ATAS 没有 run / account / scenario 槽位——这些是我们多出来的（上一份报告 §6.1） |
| **热键按模块分区**：Global · Trading · Smart DOM · Charting · Screenshot 五类，8.0.15 加 Heatmap 专区与 Footprint 模式热键、8.0.13 周期热键组；macOS 用 Cmd ([Hot Keys](https://help.atas.net/en/support/solutions/articles/72000602396-hot-keys-configuration)) | Preferences 快捷键节 + 命令表 | 键位表按命令命名空间分组显示（workspace/panel · order/position/trade · dom · chart/drawing · heatmap · replay · snapshot）；补 `dom.*`、`chart.footprintMode`、`chart.timeframe`、`heatmap.*`、`trade.volumePreset`、`position.flatten/setStop/breakeven` 命令，热键只是命令的绑定 | 两篇文档默认键互相冲突（W/S vs ↑/↓）——我们不预设交易热键默认值，由用户显式绑定并经确认 |
| 其他小项：Favorite timeframes 快速组；Candle countdown；三种滚轮模式按工作区记忆；Privacy mode 拨杆；统一对话框与按钮；Instruments Manager 按 ID 搜索；Replay 紧凑控制面板可直接选 Chart/DOM/Tape/Heatmap；Heatmap 全屏含截图/帮助/设置 | PriceChart · Preferences · StatusBar · SymbolMap · ReplayBar · PanelFrame | 逐项进 P1 清单 | Heatmap "600 FPS" 作为营销数字不借；我们的验收是 p95 帧时 |

ATAS 自己总结的设计口号——"Clarity in Every Pixel"、"Zero Visual Noise"、"redesigned interface elements prioritising data analysis"——与 readability.md 的方向一致 ([atas.net/atas-x](https://atas.net/atas-x/); [atas.net/heatmap](https://atas.net/heatmap/))；但第三方实测对 ATAS 的一致批评是"Interface and drawing tools feel dated"、"Dense and functional rather than modern"、学习曲线"at least a month" ([completetradersedge review](https://completetradersedge.com/atas-review/))。这说明功能全集与可上手是两件事：我们照单全收功能，但入口要靠 GO Bar 命令、PanelFrame 右键与 Indicator Manager 的 Favorites 默认页来压学习曲线，而不是把 630 种 footprint 组合全摆在工具条上。

## 结论

把 ATAS X 当作"功能上限"对照后，真正的结论不是"缺 46 个指标"，而是两条结构性修正。第一，94 张卡的覆盖自评有系统性虚高：coverage.md 把三个从未建卡的组件计为 ✅，而它们恰好承接了 ATAS 最大的两块（指标与绘图）；补齐顺序必须从这三张卡开始，否则 46 个 order-flow 指标和 33 个绘图对象没有任何地方可以"逐项标状态"。第二，PriceChart = lightweight-charts 的决定本身不需要推翻，但 Footprint 独立成面板的决定需要——ATAS 的全部订单流能力（Footprint 模式、Cluster Statistics、Order Flow chart、全局绘图进 DOM、MBO 叠加、价格轴锁定）都建立在"一个坐标系"上，所以 `ChartSurface` 抽象与 flow 层 Primitive 的 spike 应该排在任何新指标之前；DOMHeatmap 与 MBO 则维持自研 Canvas，并把 WebGPU 栅格后端从"可选"提升为 P2 明确项。

剩下的边界反而清晰：不做为零，全部是"能力 1:1、操作我们的"——最典型的是 Chart Strategies：ATAS 的"策略"是 C# 容器，没有任何出厂策略，我们的策略在引擎跑、OpenAlice 编排、图上一样能启停看信号，自定义指标走插件注册表而不是编译 DLL，能力对等、操作不同；而 ATAS 的 tier 分层提醒我们，Ultra 级功能（MBO、X-Ray、Heatmap 历史）的真正门槛是数据适配器而非许可，这正是 P2 全部压在"后端适配器未选定"上的原因——选引擎（blueprint §7 列为人工提供物）决定了 P2 何时能开工，前端这一侧在 P0/P1 阶段没有阻塞项。

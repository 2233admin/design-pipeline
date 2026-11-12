# 参考项目功能清单（C2）：FinceptTerminal 与 tick-stock-panel

日期：2026-10-01。对应 `docs/superpowers/ISSUES-2026-10-01.md` 第 96 行 C2。

做法：两个仓库都用 `git clone --depth 1` 浅克隆到 `%TEMP%\refinv-20261001153129\`，只读了源码、文档和许可证，没有安装依赖，也没有运行任何代码。KATANAview（`D:/projects/KATANAview`，当前分支 `feat/ofc-visual-parity`，提交 `d08c06a`）只读，没有改动。

标记说明：

- **[读]**：亲眼看到的文件内容，给出路径。
- **[推断]**：我的判断，没有实际运行验证。

KATANAview 一侧的对照依据：

- `docs/ux/ATAS_COMPATIBILITY_MATRIX.md`
- `components/terminal/panel-registry.tsx`：共 42 个 spec（`panel-registry.test.ts:101` 断言 `toBe(42)`），其中 39 个在 `panels/` 目录下，另外 3 个是 `watchlist`、`price-chart`、`news-feed`。
- `lib/kd-feed.ts`：lane 包括 `dom/tape/footprint/liquidity/quote`，另有 `OrderflowSummary`，字段为 spread/bidImbalancePct/delta/cvd/aggressorBuyPct/poc/vwap。
- `app/api/{amarket,aquote,atrade}`：分别是 TDX 全市场快照、TDX/新浪报价、TDX 逐笔。

## 0. KATANAview 现有数据（判断一个功能是否“缺数据”的依据）

| 来源 | 内容 | 出处 |
| --- | --- | --- |
| kd-feed（fixture 回放 / replay） | DOM 档位（askLevels/bidLevels/spread/mid）、逐笔 prints、足迹 bars、流动性 book、quote（price/prevClose）、订单流汇总 | `lib/kd-feed.ts:27-37,387-411` [读] |
| `/api/amarket` | 全 A 股实时快照约 5200 只，每只的 `Quote` 字段为 symbol（`600519.SS/.SZ/.BJ`）、name、price、prevClose、open、high、low、volume。**没有**成交额、换手率、流通股本、行业或概念、上市日、历史日 K | `app/api/amarket/route.ts:1-4`，`lib/tdx-serve.ts:89-114`，`lib/market-data.ts:3-15` [读] |
| `/api/aquote`、`/api/atrade` | 单票报价（含五档）、最近约 300 笔逐笔 | `lib/tdx-serve.ts:66-135` [读] |
| fixture 生成器 | K 线 `generateCandles`、期权链 `generateOptionChain`（含 callOi/putOi）、新闻、预测市场、持仓等 | `lib/market-data.ts`，`lib/terminal-data.ts:40-109` [读] |
| 已有纯函数 | 市场宽度、板块宽度、screener 筛选排序 | `lib/market-breadth.ts` [读] |

缺的数据：全市场历史日 K 和分钟 K、成交额/换手、行业/概念归属、龙虎榜、竞价、宏观经济、新闻正文源、券商账户。凡是依赖这些数据的功能，下文都标为“缺数据”。

判定标签：

- **已有**：KATANAview 已经有同类面板或能力。
- **可移植**：能做成原生 PanelSpec 面板（或扩展现有面板），用现有数据就够。
- **缺数据**：需要 KATANAview 没有的数据。
- **超范围**：与交易终端定位无关，或会碰到禁区或 PAPER 边界。

---

## 1. FinceptTerminal

### 1.1 基本信息

- 仓库：<https://github.com/Fincept-Corporation/FinceptTerminal>
- 克隆提交：`333780763a4468d06b166d1ee0b04749b6d7fc72`（2026-10-01 10:56 +0530）
- 许可证：**AGPL-3.0-or-later**。依据有两处：`LICENSE` 开头是 GNU AGPL v3 文本，写明 “either version 3 … or (at your option) any later version”；`README.md:173` 写的是 “AGPL-3.0-or-later”。此外，`LICENSE` 第 20 行起附加了一段 Fincept 自己的“双许可声明”，声称任何商业或公司内部使用都要买商业许可。`README.md:177` 却又说不再单独出售商业许可，两处说法互相矛盾。**结论：许可证文本和附加声明互相矛盾；在 Fincept 澄清之前，按不可复制代码处理，只借鉴思路。**
- 允许做什么：
  - AGPL 本身允许复制和修改代码，代价是要履行开源义务：衍生作品整体按 AGPL 发布，以网络服务形式提供时也要公开源码（§13）。KATANAview 如果复制或逐行翻译这里的 C++/Python 代码，或者照搬界面素材和文案，就要接受这些义务。真正挡住复制的，是那段与 AGPL 相矛盾的附加商业限制：它的效力说不清。所以在澄清之前，**不复制任何代码，也不逐行翻译**。这是保守的处理方式，不是法律结论。
  - 只能看功能截图、读文档描述，以及引用公开的通用金融公式（例如 max pain 公式、OI 增减仓四象限），再用 KATANAview 自己的栈从头实现。
  - “Fincept”名称和 logo 是商标（`README.md:179`），不能使用。
  - `LICENSE` 第 95-99 行还把 “Fincept Trade Dress” 列为受保护对象，范围包括屏幕布局、配色、命令语法、快捷键约定、仪表盘小部件词汇和整体视觉风格，并写明 “Substantially similar replication, even with branding removed, is prohibited”（2026-10-02 补读 `main`）。所以“照行为重写”只适用于单个计算或交互功能；整体布局和外观不能做实质相似的复刻。
- 技术栈：原生 C++20 + Qt 6.8.3 桌面程序，内嵌 Python 3.11 做分析（`README.md:77,129,144`），约 1042 个 `.cpp` 和 1371 个 `.py`。只有桌面形态，没有 web。
- 构建方式：
  - Linux/macOS 用 `./setup.sh`。
  - Windows 用 `cmake --preset win-release && cmake --build --preset win-release`，需要固定版本的 CMake 3.27.7、Ninja、Qt 6.8.3、Python 3.11.9（`docs/GETTING_STARTED.md:142-157`）。
  - 没有 dev server 这一说，C3 要录基准只能跑桌面程序。
- 维护状态：开源版每月发布一次，日常开发在闭源 Enterprise 版（`README.md:79,152`）。

### 1.2 功能清单（`fincept-qt/src/screens/` 下 56 个 screen 目录，另有 `common/`）

| 功能 | 源路径（`fincept-qt/src/` 下） | KATANAview 对照 | 判定 |
| --- | --- | --- | --- |
| 仪表盘画布 + 30 余个小部件（可拖拽网格、模板、AddWidget） | `screens/dashboard/canvas/*`，`screens/dashboard/widgets/*` | KATANAview 本身就是面板网格加工作区模板（`lib/workspace-templates.ts`） | 已有（容器层属于禁区，不动） |
| — 指数/行情条/报价表/股票报价/sparkline 条 | `widgets/IndicesWidget.h`，`MarketQuoteStripWidget`，`QuoteTableWidget`，`StockQuoteWidget`，`SparklineStripWidget`，`dashboard/TickerBar` | `watchlist`、`ticker-tape.tsx`、`price-chart` | 已有 |
| — 涨跌榜 Top Movers | `widgets/TopMoversWidget.h` | `screener` 面板可按涨跌幅排序（`lib/market-breadth.ts` sortScreenerRows） | 已有 |
| — 板块热力图 | `widgets/SectorHeatmapWidget.h`（美股板块 ETF） | `heatmap` 面板（A 股按板块） | 已有 |
| — Market Pulse（恐贪、宽度、全球快照、交易时段） | `screens/dashboard/MarketPulsePanel.h` | `sentiment` 面板有恐贪仪表；`heatmap` 有宽度。全球交易时段时钟没有 | 部分已有；交易时段时钟**可移植**（纯时钟，无需数据） |
| — 迷你订单簿 / 成交带 / 快捷下单 | `widgets/OrderBookMiniWidget`，`TradeTapeWidget`，`QuickTradeWidget` | `orderbook`、`tape`、`ticket` | 已有 |
| — 持仓/今日盈亏/保证金/风险指标/组合摘要 | `widgets/OpenPositionsWidget`，`TodayPnLWidget`，`MarginUsageWidget`，`RiskMetricsWidget`，`PortfolioSummaryWidget` | `order`（positions-orders）、`portanalytics` | 已有（PAPER） |
| — 经济日历 / 新闻 / 地缘事件 / 船舶 / Polymarket 价格 / 便签 / 网页抓取 / 视频 | `widgets/EconomicCalendarWidget` 等 | `events`、`news`、`intel`、`prediction`、`journal`、`web` | 大多已有；船舶、视频属于超范围 |
| 加密交易屏：K 线、订单簿、**累积深度图**、Time&Sales、下单、行情条 | `screens/crypto_trading/CryptoDepthChart.h`（买卖累积面积图 + spread），`CryptoOrderBook`，`CryptoTimeSales`，`CryptoOrderEntry` | 订单簿/逐笔/下单都已有；**累积深度图没有** | 深度图**可移植**：用 kd-feed `dom` lane 的 askLevels/bidLevels 累加即可（只重新实现，不抄代码）。按 RENDERING_DOCTRINE 应优先用图表库 |
| 股票交易屏：DOM（累积深度条、spread 带、**失衡页脚**）、篮子单、广播单、组合复制 | `screens/equity_trading/EquityOrderBook.h` 等 | `orderbook` 已有 DOM。失衡数据在 `OrderflowSummary.bidImbalancePct` 里已有 | DOM 已有；失衡页脚**可移植**（改 order-book.tsx，注意它是大文件，1221 行起是 spec）。篮子单、广播单涉及真实下单，**超范围**（PAPER 边界） |
| F&O 期权屏：期权链、**Max Pain 曲线**、**OI 增减仓分类表**、多行权价 OI、日内 OI、多跨式溢价、策略构建器/payoff、FII/DII 资金 | `screens/fno/MaxPainChart.h`（头注释给出公式），`OIBuildupTable.h`（价格变化 × OI 变化四象限），`PayoffChartWidget`，`FiiDiiChart` 等 | `options`（期权链）、`optanalytics`（已有“持仓量分布”）。没有 max pain、OI 四象限、payoff | Max Pain **可移植**：fixture 期权链已有 callOi/putOi，公式是公开知识。OI 四象限**缺数据**（需要 OI 日变化）。FII/DII 是印度市场数据，**缺数据** |
| 波动率曲面（3D、表格、CSV 导入） | `screens/surface_analytics/*` | 无 | 缺数据（需要真实期权 IV 网格）。3D 渲染成本高 |
| 市场屏：可配置分屏行情面板 | `screens/markets/*` | 工作区 + watchlist | 已有 |
| 自选股（多列表） | `screens/watchlist/WatchlistScreen.h` | `watchlist` | 已有 |
| 选股屏（大盘股篮子客户端排序） | `screens/screener/ScreenerScreen.h`（354 行） | `screener`（全 A 股） | 已有 |
| 回测（6 个 provider、50 多个策略） | `screens/backtesting/*` | `backtest`、`vbt*` 四个面板 | 已有 |
| 算法交易（策略构建、扫描、部署） | `screens/algo_trading/*` | 无 | 超范围（实盘部署，PAPER 边界） |
| 组合管理（交易记录 Blotter、热图、FFN、QuantStats、优化、风险、报告等视图） | `screens/portfolio/*`，`portfolio/views/*` | `portanalytics`、`stresstest`、`correlation` | 已有（深度不同） |
| 新闻（RSS 管理、详情、ticker 条） | `screens/news/*` | `news`（fixture） | 已有；真实新闻源属于**缺数据** |
| 宏观经济（FRED/IMF/World Bank/ECB 等 30 多个面板） | `screens/economics/panels/*` | 无 | 缺数据 |
| DBnomics / 政府数据 / AkShare 浏览器 / 亚洲市场（398 个 AkShare 端点） | `screens/dbnomics`，`gov_data`，`akshare/AkShareScreen.h`，`asia_markets/AsiaMarketsScreen.h` | 无 | 缺数据（也不是交易终端的核心） |
| Polymarket（浏览、订单簿、价格图、排行榜） | `screens/polymarket/*` | `prediction`（fixture） | 已有；真实数据**缺数据** |
| 股票研究、M&A 分析、另类投资、QuantLib、衍生品定价 | `screens/equity_research`，`ma_analytics`，`alt_investments`，`quantlib`，`derivatives` | `financials`/`fundmetrics`/`dividends`/`shareholding`（fixture） | 基本面已有；定价器类**超范围** |
| AI：聊天、37 个 agent、Alpha Arena、AI Quant Lab、MCP | `screens/ai_chat`，`agent_config`，`alpha_arena`，`ai_quant_lab`，`mcp_servers`，`chat_mode` | `ai` 面板 | 超范围（另一条产品线；AI 不可下单） |
| 节点编辑器（可视化工作流） | `screens/node_editor/*` | 无 | 超范围 |
| 地缘政治 / 船舶追踪 / 关系图 / 贸易流和弦图 | `screens/geopolitics`，`maritime`，`relationship_map`，`trade_viz` | `intel` 时间线 | 超范围 |
| 报表生成、Excel、代码编辑器、笔记、文件管理、论坛、文档、设置、认证、恢复 | `screens/report_builder`，`excel`，`code_editor`，`notes`，`file_manager`，`forum`，… | `journal` 近似笔记 | 超范围 |
| 加密中心、组合监控（印度券商多账户） | `screens/crypto_center`，`portfolio_monitor` | 无 | 缺数据 / 超范围（真实券商） |

**Fincept 小结**：和 KATANAview 重叠很大，但许可证只允许“按公开通用的公式和交互模式独立实现”，不允许复刻它的屏幕布局、小部件词汇、排列、文案和视觉（Trade Dress 条款，见 §1.1）。值得独立实现的只有三项：

1. 累积深度图（kd-feed `dom` lane，数据现成）。
2. Max Pain 曲线（fixture 期权链，数据现成）。
3. DOM 失衡页脚（`OrderflowSummary` 现成）。

这三项都不适合作为“照抄”试验，因为没有可以合法照抄的源码。做的时候，验收依据只能是公开公式和我们自己的 UI，不能拿 Fincept 的画面当像素基准。

---

## 2. tick-stock-panel（TickFlow 股票面板）

### 2.1 基本信息

- 仓库：<https://github.com/shy3130/tick-stock-panel>
- 克隆提交：`d00a94ea94a2c85e8b6b92967f10d4209af482ae`（2026-09-29 18:35 +0800），`VERSION` = v0.2.2，后端 `pyproject.toml` 版本 0.3.2。
- 许可证：**MIT**（`LICENSE`：“Copyright (c) 2026 tick-stock-panel contributors”；`backend/pyproject.toml` 写的是 `license = { text = "MIT" }`）。
- 允许做什么：可以复制、修改、翻译代码（例如把 Python 翻成 TS），唯一条件是在“所有副本或实质部分”中保留版权声明和许可声明。
  - 照抄时，在移植文件头部注释里写明出处（仓库 URL + 提交 SHA + 原文件路径），并附 MIT 声明全文或指向它。
  - 它依赖的 TickFlow SDK、fuyao、stock-sdk 数据源是另外的服务，不在 MIT 范围内，也不要接入。
- 技术栈：
  - 前端：Vite + React 18 + Tailwind + TanStack Query + ECharts + lightweight-charts + react-grid-layout（`frontend/package.json`）。
  - 后端：FastAPI + Polars + DuckDB + vectorbt，用 uv 管理（`backend/pyproject.toml`）。
  - 数据：TickFlow 官方 SDK，可插件化接入第三方源。
- 运行方式：
  - Web 应用，也可以用 pywebview 打包成桌面版。
  - Dev 模式：`cp .env.example .env` 后运行 `./dev.sh`（Windows 用 `.\dev.ps1`），后端 `http://localhost:3018`，前端 `http://localhost:3011`（`README.md:564-568`）。
  - Docker：`docker compose up --build`，然后打开 `http://localhost:3018`。
  - `TICKFLOW_API_KEY` 留空时是 Free 模式，只有历史日 K（`.env.example:2`）。
  - [推断] C3 想录基准，需要一个 TickFlow key，并先跑一遍盘后管道，否则大部分页面是空的。
- 仓库规则：`AGENTS.md` 要求先读 `CONTRIBUTING.md`。

### 2.2 功能清单（前端路由 `frontend/src/router.tsx:116-156`，功能说明 `docs/features.md`）

| 功能 | 源路径 | KATANAview 对照 | 判定 |
| --- | --- | --- | --- |
| 看板：可拖拽网格加 14 种小部件 | `frontend/src/pages/Dashboard.tsx`，`components/dashboard/registry.tsx:136-245` | 面板网格已有 | 容器已有 |
| — 指数行情 | registry `indices` | `ticker-tape` / watchlist | 已有 |
| — 大盘指标 KPI（总成交额等） | registry `kpi` | 无 | 缺数据（需要成交额） |
| — **涨跌分布（8 档）+ 宽度 + 平均/中位涨跌** | registry `distribution`；后端 `backend/app/services/market_overview_builder.py:336-359`（`_pct_band_rows`），`:428-444`（宽度、中位数） | `heatmap` 只有涨/跌/平/涨停/跌停/均涨跌（`components/terminal/panels/heatmap.tsx:130-149`），**没有分档分布和中位数** | **可移植**（`/api/amarket` 数据够） |
| — 情绪雷达（6 维）+ 情绪评分 | registry `radar`；`market_overview_builder.py:541-559` | `sentiment` 是单只票的恐贪 | 缺数据：6 维里有 4 维要量比、连板、封板率、主线 |
| — 趋势强度（站上 MA5/20/60 家数、新高新低） | registry `trend`；`market_overview_builder.py:469-476` | 无 | 缺数据（需要全市场日 K 历史） |
| — 概念/行业热度 | registry `concept-rank`/`industry-rank`，`_dimension_rank` | `rotation`（fixture） | 缺数据（需要行业/概念归属） |
| — 涨幅榜/跌幅榜 | registry `gainers`/`losers` | `screener` 排序 | 已有 |
| — 成交额榜/活跃换手 | registry `turnover`/`activity` | 无 | 缺数据（成交额、换手） |
| — 涨停梯队（连板层级）、监控中心、外部链接 | registry `ladder`/`monitor`/`ext-link` | `web` 外链已有；`alerts` 近似 | 连板梯队**缺数据**（需要历史） |
| **A 股涨跌停价规则**（按板块 10%/20%/30%，ST 5% 只适用于 2026-07-06 之前；按整数分四舍五入算涨停价） | `backend/app/price_limits.py:11-44,161-166`；测试 `backend/tests/test_price_limits.py:22-75`；标量版 `backend/app/strategy/minute_replay.py:88-92` | `lib/market-breadth.ts:84-105` 对**所有板块**都用 `pct >= 9.9` 近似判涨停：创业板、科创板（20%）和北交所（30%）涨 10% 就会被算成涨停 | **可移植**（纯函数，数据够）。缺上市日，所以新股前 5 日无涨跌幅限制这一条做不到，见 §3 |
| 涨停梯队页（首板/2 连板…，封单，真假板修正） | `frontend/src/pages/LimitUpLadder.tsx`（1835 行），后端 `api/screener.py:807` | 无 | 缺数据（需要连板历史、五档封单） |
| 异动监控（竞价异动、盘中异动、多日偏离值） | `pages/AbnormalMoves.tsx`，`services/abnormal_moves.py` | 无 | 缺数据：竞价靠 fuyao，多日偏离要历史。盘中“涨停/跌停”这一类可以用快照算 |
| 选股引擎（25 个 Polars 策略，ETF 模式） | `pages/Screener.tsx`，`backend/app/strategy/builtin/*.py` | `screener` 只做涨跌/超买超卖粗筛 | 缺数据（全部策略都基于日 K 指标） |
| 指标流水线（MA/MACD/RSI/KDJ/ATR/量比/连板/复权） | `backend/app/indicators/pipeline.py` | `lib/indicators/`（图表指标） | 缺数据（全市场历史） |
| 回测（个股/组合/信号组合，T+1、手续费、蒙卡回撤、因子归因） | `pages/Backtest.tsx`，`backend/app/backtest/*` | `backtest` + `vbt*` | 已有（口径不同）；T+1 等约束可以参考 |
| 因子平台（DSL、IC/IR、组合） | `pages/Factors.tsx`，`backend/app/factors/*` | 无 | 超范围（研究平台，不是终端面板） |
| 盘中信号（分钟 K 特征、上升沿触发、回放） | `backend/app/strategy/intraday_features.py`（见 `docs/features.md:92-99`） | 无 | 缺数据（分钟 K） |
| 监控中心（规则引擎 AND/OR、冷却、飞书/企微/邮件推送） | `pages/Monitor.tsx`，`components/monitor/RuleEditor.tsx`，`services/alert_store.py` | `alerts`（fixture） | 规则引擎前端**可移植**；外部推送**超范围** |
| 个股分析：日 K + **9 类关键价位**（压力支撑、密集区、枢轴、前高前低、Keltner、ATR 通道、缺口、斐波那契、整数关口）+ AI 四维 | `pages/StockAnalysis.tsx`，`backend/app/indicators/levels.py` | 无关键价位 | 缺数据（需要真实日 K）。在 fixture K 线上可以演示，但只是演示 |
| 分时图（均价线、多日分时） | `components/EChartsIntraday.tsx`，`EChartsMultiDayIntraday.tsx` | `price-chart`（K 线） | 缺数据（需要分钟序列） |
| 板块标签（创/科/北） | `frontend/src/lib/board.ts` | `boardOf`（`lib/market-breadth.ts:122-134`）已有 | 已有 |
| 概念/行业分析、市场环境（Regime）、情绪周期阶段、AI 复盘、龙虎榜 | `pages/ConceptAnalysis.tsx`，`IndustryAnalysis.tsx`，`Regime.tsx`，`Review.tsx`，`services/market_phase.py`，`dragon_tiger.py` | `rotation`、`ai`（fixture） | 缺数据 |
| 自选股（分组、截图 OCR 导入、CSV） | `pages/Watchlist.tsx`（2008 行），`services/watchlist_ocr/*` | `watchlist` | 已有；OCR 属于**超范围** |
| 模拟盘（多账户、真实行情撮合） | `pages/Paper.tsx`，`api/paper.py` | `order` + `ticket` + `lib/paper-broker.ts` | 已有（paper-broker 属于禁区，不动） |
| 持仓批次 Lots（到期日、成本 vs 现价） | `pages/Lots.tsx` | `journal` / `portanalytics` 近似 | 可移植，但需求不明 |
| 财务、指数、数据管理、扩展数据接入、开放 API、MCP server、AI 助手 | `pages/Financials.tsx`，`Indices.tsx`，`Data.tsx`，`docs/features.md:160-300`，`mcp-server/` | `financials` 等（fixture） | 超范围或缺数据 |

**tick-stock-panel 小结**：大部分功能建立在“全市场日 K 历史 + 行业概念 + 成交额”之上，KATANAview 没有这些数据。真正现在就能落地的，只有基于 `/api/amarket` 快照的两项纯计算：涨跌停价规则、涨跌分布。

---

## 3. 第一次“照抄”试验：候选和任务草稿

### 候选怎么选的

条件有四个：小、行为可以自动检查、不碰禁区（MEASUREMENT.md §D）、数据现成。只有 MIT 的 tick-stock-panel 能合法照抄。Fincept 的三项（深度图、Max Pain、失衡页脚）只能按公开公式独立实现，并且不复刻 Fincept 的排列、文案和视觉，放到后面做对照组。

### 候选 1（推荐首选）：按板块计算 A 股涨跌停（来源 tsp `price_limits.py`）

- **为什么选它**：
  - 只改 `lib/market-breadth.ts`，外加它的测试，属于纯函数。
  - 隐藏 oracle 可以直接用 tsp 自带的测试数值当期望值。
  - heatmap 面板的“涨停/跌停”计数会自动随之修正，不需要碰 UI。
  - 修的是 KATANAview 现有的真 bug（`market-breadth.ts:84` 的注释自己也承认是近似）。
- **落点**：`lib/market-breadth.ts`（不在禁区内），`lib/market-breadth.test.ts`。不改 PanelSpec，不加命令，不碰 kd-feed，不加 token。
- **口径**（全部从 tsp 读到，[读]）：
  - 北交所（`.BJ`）30%；代码以 `300/301/688/689` 开头的 20%；其余 10%（`price_limits.py:23-28`）。
  - 主板 ST 5% 只适用于 2026-07-06 之前的交易日（`:11,37-44`）。今天已经过了这个日期，所以按快照算时不需要区分 ST。[推断：这是 tsp 代码里写的规则，我没有核对交易所公告]
  - 涨停价 = `floor(prevClose*100+0.5)` 分 × `round((1+pct)*100)`，再 `+50` 整除 100 得到分（`:161-166`）。跌停价同理，把 `1+pct` 换成 `1-pct`。
  - 判定方式：价格 ≥ 涨停价算涨停，价格 ≤ 跌停价算跌停（同 `minute_replay.py:240` 的 `raw_close >= limit_up - 1e-9`）。
- **已知限制**（任务里要写明，不要让 agent 自己编）：
  - 快照里没有上市日，新股前 5 日无涨跌幅限制这一条做不到，这些股票会被误判为涨停。
  - `boardOf`（`market-breadth.ts:122-134`）把 `689` 归为沪主板，tsp 归为科创板。任务只要求涨跌停幅度按 tsp 来，不要求改 `boardOf`。
- **对现有测试的影响**（[读] `market-breadth.test.ts:88-104`）：现有用例的 symbol 是 `'D'`/`'E'`，会落到 10% 档；`111 ≥ 110.00`、`89 ≤ 90.00`，所以原来的断言仍然成立，不需要删除或改写任何断言。

**任务文本（只给 agent 这一段）：**

> 热力图面板"市场宽度"里的涨停/跌停家数现在按涨跌幅 ≥9.9% 近似（`lib/market-breadth.ts`），创业板/科创板（20%）和北交所（30%）会算错。请参照 MIT 开源项目 tick-stock-panel（<https://github.com/shy3130/tick-stock-panel> ，提交 d00a94ea94a2c85e8b6b92967f10d4209af482ae，文件 `backend/app/price_limits.py` 的 `board_limit_pct` 和 `polars_limit_price`）的口径，在 `lib/market-breadth.ts` 里加两个导出纯函数：`limitPctOf(symbol)` 返回涨跌幅比例（0.1/0.2/0.3），`limitPrices(symbol, prevClose)` 返回 `{ up, down }`（按"整数分四舍五入"算），并让 `computeBreadth` 改用"价格 ≥ 涨停价 / ≤ 跌停价"判定。移植的代码要在文件里注明出处（仓库、提交、原文件路径）并附 MIT 声明。不要改热力图面板、kd-feed、注册表。新股上市初期无涨跌幅限制、ST 不用处理。做完告诉我改了哪些文件、怎么验证的。

（English for the log: "Breadth limit-up/down counts use a ≥9.9% approximation, wrong for ChiNext/STAR (20%) and BSE (30%). Following MIT tick-stock-panel @d00a94ea `backend/app/price_limits.py`, add pure exports `limitPctOf(symbol)` and `limitPrices(symbol, prevClose)` (half-up integer cents) to `lib/market-breadth.ts`, make `computeBreadth` use price ≥ limit-up / ≤ limit-down, keep attribution + MIT notice, don't touch heatmap/kd-feed/registry, ignore new-listing and ST. Report files changed and how you checked.")

**自动验收（按顺序）：**

1. `pnpm exec vitest run` 退出码 0；`pnpm exec tsc --noEmit` 退出码 0，或者与 M0 相比没有新增错误。
2. 隐藏 oracle `tests/measure/c1-limits.test.ts`。期望值按 tsp 公式算出，并已用 node 按同一整数分公式复算，全部吻合；其中 18.90→17.96 也是 tsp 测试 `test_price_limits.py:75` 里的值：
   - `limitPctOf('600519.SS')=0.1`，`('000001.SZ')=0.1`，`('300750.SZ')=0.2`，`('301001.SZ')=0.2`，`('688981.SS')=0.2`，`('689009.SS')=0.2`，`('830799.BJ')=0.3`。
   - `limitPrices('600519.SS',10).up=11`，`.down=9`；`limitPrices('600519.SS',12.35).up=13.59`，`.down=11.12`。
   - `limitPrices('300750.SZ',12.35).up=14.82`；`limitPrices('830799.BJ',12.35).up=16.06`。
   - 18.90 按 5% 算跌停为 17.96：这一条只验证四舍五入辅助逻辑。如果 agent 没有暴露带 pct 参数的函数，就改用 `limitPrices` 的 10% 版本：18.90 → 涨停 20.79、跌停 17.01。
   - `computeBreadth`：`300750.SZ` 现价 11.00、昨收 10.00 → `limitUp=0`（涨 10% 但不是涨停）；现价 12.00、昨收 10.00 → `limitUp=1`。`600519.SS` 现价 13.59、昨收 12.35 → `limitUp=1`；现价 13.58 → `limitUp=0`。
   - 原有导出 `pctChange/computeBoardBreadth/boardOf` 的行为不变（用原测试文件覆盖）。
3. 静态检查：
   - `lib/market-breadth.ts` 的 diff 里包含 `tick-stock-panel` 和 `MIT` 字样（出处声明）。
   - 不新增 `setInterval`，不新增颜色字面量。
4. 禁区命中数为 0（MEASUREMENT.md §D 的 grep），并统计越界改动。允许改动的文件只有 `lib/market-breadth.ts` 和 `lib/market-breadth.test.ts`。
5. 测试完整性：`git diff d08c06a -- '*.test.ts'` 不能删除任何 `it(`/`expect(` 行。

**手动（最后做，可选）**：起 TDX serve 和 dev，打开 HMAP，在实盘态下看涨停家数是否下降，并抽查一只创业板 +10% 的股票不再被计入。

### 候选 2：涨跌分布 8 档 + 中位涨跌（来源 tsp `_pct_band_rows`）

- **为什么排第二**：
  - 纯函数部分同样好检查。
  - 但要改 heatmap 面板的 UI，而 heatmap 只在实盘态（TDX serve 可达）才显示宽度区块（`heatmap.tsx:99-126`）。在 node 环境里用 `renderToStaticMarkup` 只能渲染出 fixture 分支，所以 UI 部分**没法自动验收**。
- **落点**：`lib/market-breadth.ts` 加 `computePctDistribution(quotes)` 和中位数；`components/terminal/panels/heatmap.tsx` 在“市场宽度”区块下面加 8 条横条；可能还要改 `.module.css`/`terminal.css`。这些都不是禁区，但 heatmap 已经有一个 `setInterval`（`heatmap.tsx:69`，属于既有的 Gate A 违规），任务里要提醒“不要新增”。
- **口径**（[读] `market_overview_builder.py:336-359,442`）：
  - 8 档为 `<-5%`、`-5~-3%`、`-3~-1%`、`-1~0%`、`0~1%`、`1~3%`、`3~5%`、`>5%`。
  - 区间是左闭右开（`low <= v < high`），所以 0% 落在 `0~1%`，-5% 落在 `-5~-3%`，5% 落在 `>5%`。
  - 每档输出 `{label, count, pct}`，pct 是该档占总数的百分比。
  - 中位数 = 排序后取 `sorted[len//2]`，偶数个时取上中位数。
  - tsp 的涨跌幅用小数（0.05），KATANAview 的 `pctChange` 用百分数（5），任务里要说清楚。

**任务文本：**

> 在热力图面板实盘态的"市场宽度"区块里，加一个"涨跌分布"：按涨跌幅分 8 档（<-5%、-5~-3%、-3~-1%、-1~0%、0~1%、1~3%、3~5%、>5%，每档左闭右开，0% 归 0~1%），每档显示家数和占比横条，并在宽度统计里加"中位涨跌"。口径照抄 MIT 开源项目 tick-stock-panel（提交 d00a94ea，`backend/app/services/market_overview_builder.py` 的 `_pct_band_rows` 和 `median_pct`；注意它用小数，我们 `pctChange` 是百分数）。计算放进 `lib/market-breadth.ts` 的导出纯函数并加单测，面板只负责渲染；注明出处并附 MIT 声明。不要新增 setInterval，颜色只用主题变量。fixture 态不用显示。做完告诉我改了哪些文件、怎么验证的。

**自动验收**：

- vitest 和 tsc 同候选 1。
- oracle：
  - `computePctDistribution` 返回 8 行，label 顺序固定，`sum(count) = 输入数`。
  - 边界：-5、-3、-1、0、1、3、5 各落在正确的档。
  - 空输入时每档 pct 为 0，不出现 NaN（tsp 用 `total or 1` 避免除零）。
  - 中位数：`[1,2,3,4]` 取 3，`[]` 取 0。
- 静态检查：heatmap.tsx 的 diff 不新增 `setInterval`、hex 或 `rgb(` 字面量，也没有对 `onConfigChange` 的改动。
- 禁区命中数为 0；允许改动的文件为 `market-breadth.ts`、对应测试、`heatmap.tsx` 和它的 css。

**手动**：实盘态下 8 条横条加起来等于总家数。没有 TDX serve 时这一步没法做。

### 不推荐当首个试验的

- Fincept 的三项（深度图、Max Pain、失衡页脚）：许可证只允许按公开公式独立实现，测不出“照抄”这一行为；单个小部件也可能落在 Trade Dress 条款的 “dashboard widget vocabulary” 里，所以 UI 必须独立设计，不复刻其排列、文案和视觉。可以作为第二轮对照组。其中 Max Pain 数据现成（fixture 期权链的 callOi/putOi），公式也是公开知识，是对照组里最好的一个。
- tsp 里需要历史或行业数据的功能（连板梯队、趋势强度、情绪雷达、关键价位）：先要有数据，会碰到 kd-feed 或新增 `app/` 路由，属于禁区。

## 4. 没有验证的部分

- 两个参考项目都没有运行，C3 基准也没录。tsp 需要 TickFlow key 并先跑盘后管道 [推断]；Fincept 需要固定版本的 Qt/CMake 工具链。
- “ST 自 2026-07-06 起按 10%”只来自 tsp 代码，没有核对交易所规则。
- 候选 1 的 oracle 数值只用 node 按公式单独复算过，没有在 tsp 或 KATANAview 里跑过；候选 2 的 oracle 没有计算过。
- KATANAview 的对照只看了 `d08c06a` 的文件；`main` 分支（62 个面板）没有对照。
- `/api/amarket` 是否只包含股票（不含指数、ETF、债券）：`fetchTdxAllQuotes` 只过滤了 `price > 0`（`lib/tdx-serve.ts:113`），返回内容由 tdxcli-rs serve 决定，没有核实。如果混入 ETF 或指数，按股票板块规则判涨跌停就不成立。试验前应先在实盘态抽样确认。

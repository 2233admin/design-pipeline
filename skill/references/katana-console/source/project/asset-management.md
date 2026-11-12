# 资产管理层

组合工作区（Workspace「组合」）不只是看持仓。一个管多账户多品种的人每天要做六件事：**监控 → 构建 → 执行 → 绩效 → 风险 → 账务与报告**。Fincept 用 Portfolio / Portfolio Monitor / Report Builder / Excel / Notes 六七个模块各管一块、互不联动；KATANA 把它做成六张布局模板下的一组面板，共享同一个 `book/` 聚合器与 LinkContext，任何一张表点一行其它面板跟随。

## 1. 六个台面（布局模板 × 面板）

| 台面 | 模板 | 面板 | 回答什么 |
|---|---|---|---|
| **监控** | `T` | AccountRail · SparkTile 行（净值 / 日盈亏 / 敞口 / VaR / 现金）· PositionBook · AlertCenter | 现在怎么样 |
| **构建** | `1+2` | RebalanceDesk · FactorExposure · OrderBasket | 想变成什么样、差多少、怎么下 |
| **执行** | `2x2` | OrderBlotter · FillLog · TCA · PriceChart(ChartTrader) | 单在路上怎样、成得好不好 |
| **绩效** | `1+3` | PerformanceReport（主）· PnLAttribution · BrinsonAttribution · Calendar | 赚了多少、为什么 |
| **风险** | `2x2` | RiskBoard · StressTest · FactorExposure · Heatmap（相关） | 会亏多少、哪里集中 |
| **账务** | `1+2` | CashLedger · CorporateActions · TaxLots | 钱的来龙去脉、成本基础 |
| **盈亏** | `1+3` | IntradayPnL · PnLLedger · LossLimits · ExposureTimeline（+ PositionHistory 详情） | 今天亏了多少、每天记了什么账、亏到哪停、仓位怎么走到现在 |

报告不是台面：ReportBuilder 是一个命令（`report.build`），把任意台面的面板快照 + OpenAlice 写的文字拼成 Markdown / PDF，运行中心里排程。

## 2. 组件清单（资产管理层）

| 组件 | 一句话 | 来源 | 状态 |
|---|---|---|---|
| **PnLLedger** | 盈亏总账：按日 × 账户 / 策略 / 品种的已实现 / 未实现Δ / 费税 / 股息，期初期末对账 | 券商对账单 | ✅ |
| **IntradayPnL** | 日内盈亏曲线：合计 + 各账户，日亏损限额线；无任何涨跌反馈 | 自研 | ✅ |
| **PositionHistory** | 一个仓位的一生：价格 + 买卖标记 + 均价阶梯 + 数量带 + 事件表 | 自研 | ✅ |
| **TaxLots** | 批次成本与卖出选批（FIFO / 高低成本 / 指定），长短期标 | 券商 / OpenBB | ✅ |
| **LossLimits** | 日 / 周 / 月亏损限额与自动动作（告警 / 暂停信号 / 锁），限额只读 | ATAS Risk Manager | ✅ |
| **ExposureTimeline** | 总 / 净 / 多空 / 行业敞口随时间 + 限额线 | 自研 | ✅ |
| AccountRail | 账户集合过滤 | 自研 | ✅ |
| PositionBook | 五视角持仓簿 | ATAS Positions + Fincept Portfolio | ✅ |
| OrderBlotter / FillLog | 在途 / 成交 | ATAS Orders / Trades | ✅ |
| RiskBoard | 限额板 | ATAS Risk Manager + Fincept Risk | ✅ |
| PnLAttribution | 按品种 / 账户 / 策略归因 | Fincept Portfolio | ✅ |
| **RebalanceDesk** | 目标权重 vs 当前，漂移、交易清单、成本估算；目标来自 Lab 优化结果或手填 | Fincept Portfolio 优化 / OpenBB | ✅ |
| **OrderBasket** | 篓子单：一组跨账户订单的预检、拆分、分批提交；是 RebalanceDesk 的出口 | ATAS / TV 无；自研 | ✅ |
| **PerformanceReport** | 区间收益、基准超额、滚动指标、回撤表、月度表——组合的"体检单" | Fincept Portfolio Monitor + OpenBB portfolio | ✅ |
| **FactorExposure** | 风格 / 行业 / 国家因子暴露 vs 基准，主动暴露条 | Fincept Analysis 因子 / Barra 式 | ✅ |
| **StressTest** | 历史情景 + 自定义冲击，对组合与各账户的损益；相关性压力 | Fincept Risk 压力测试 | ✅ |
| **CashLedger** | 现金流账：出入金、股息、利息、费用、FX、保证金划转；按账户按币种 | Fincept Portfolio；券商对账单 | ✅ |
| **TradeStats** | 交易统计：胜率、盈亏比、MAE/MFE、持仓时长、按时段 / 品种 / 策略分布 | ATAS Statistics / TV 策略报表 | ✅ |
| **Fundamentals** | 三表 + 比率 + 估值瓦片 + 同业对比，中国市场报告期 | Fincept Equity Research / TV Financials | ✅ |
| BrinsonAttribution | 配置 / 选择 / 交互三效应，按行业 | OpenBB / 机构标准 | ✅ |
| TCA | 成交成本分析：vs 到达价 / VWAP，按算法 / 账户 / 时段 | 机构标准 | ✅ |
| CorporateActions | 分红、送转、配股、拆合、解禁、指数调入调出 | Fincept Markets / 交易所公告 | ✅ |
| TaxLots | 批次成本、已实现 / 未实现、持有期 | 券商 / OpenBB | ✅ |
| Calendar | 收益月历 + 事件日历（经济 / 财报 / 分红 / IPO / 解禁） | TV 四种日历 | ✅ |
| OptionsChain / GreeksBoard / VolSurface | 期权链、组合 Greeks 聚合、波动率曲面（热力，不做 3D） | Fincept F&O / Surface Analytics, TV Options | ✅ |
| YieldCurve / BondCalc | 收益率曲线对比、债券分析（久期 / 凸性 / DV01） | Fincept Solver / Curves, TV Yield Curves | ✅ |
| SeriesBrowser | 宏观 / 另类数据序列浏览、对比、指数化 | Fincept Global Data, TV Macro | ✅ |
| Fundamentals · Valuation | DCF / 可比 / DDM 作为 Lab 产物进 Fundamentals 瓦片 | Fincept DCF | ✅（在 Fundamentals） |
| RelationGraph | 持股 / 供应链 / 同实控人关系图 | Fincept Relationship Map | ⬜（v3） |
| ReportBuilder | 面板快照 + Alice 文字 → Markdown / PDF；排程 | Fincept Report Builder | ✅ |
| Notes | 带品种 / run / 订单链接的 Markdown 笔记，交易日志 | Fincept Notes | ✅ |
| DataSources / SymbolMap | 连接状态、覆盖范围、跨源代码映射、数据质量 | Fincept Data Sources / Data Mapping | ✅ |
| StrategyCompare | 多策略净值对照 + 指标表（"Alpha Arena"的去游戏化版） | Fincept Alpha Arena | ✅ |
| RunInspector | OpenAlice run 的证据、输入快照、门结果 | 自研 | ✅ |

## 3. 规则

- **一个聚合器。** PositionBook、RiskBoard、PnLAttribution、RebalanceDesk、FactorExposure、StressTest、PerformanceReport 全部读 `book/aggregator` 的同一份输出；同一个数字在两个面板里不许不一样。
- **计算在哪。** 轻量（权重、漂移、简单 VaR、区间收益）在前端 Worker；重量（优化、压力测试、因子回归、Brinson）是 Lab / OpenAlice 的 run，前端只显示结果与 run id。两者边界写在每个组件的"谁提供什么"。
- **基准永远灰**；主动暴露、超额收益才有颜色。
- **目标 vs 当前**是资产管理层的核心视觉：一律用"双条"——当前实心点阵条 + 目标 1px 空心框，差值写数字；不用饼图、不用环。
- **研究账本可以进构建台面**（作为目标来源），永不进执行、账务。
- 任何改变持仓的动作（再平衡、篓子）都只产生命令对象 → 确认 → 执行网关；RebalanceDesk 和 OrderBasket 没有"一键执行"。
- 中国市场特有项（T+1 可卖、整手取整、涨跌停不可成交、印花税单边）由 Market Profile 进入 RebalanceDesk 的交易清单计算，不写在组件里。

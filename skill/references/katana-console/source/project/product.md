# 产品定义：Capital + Alpha + Agents

这一页在 blueprint.md 之上。blueprint 回答"需要什么"，这一页回答"为了什么"。

**KATANAview 是面向单人量化公司与小型量化团队的 Capital & Alpha Operating System**：一个人通过 Agent 团队获得研究、数据、组合、交易、风控、运营和复盘的能力，围绕真实资金持续做出更好的决策。软件不保证盈利；它能控制的是减少虚假 Alpha、资金配置错误、执行损耗、数据错误、实盘漂移、对账错误和运营故障对研究优势的侵蚀。

用户每天最重要的问题不是"系统里有多少工具"，而是：哪里在赚钱、哪里在亏、哪个策略还有效、哪笔钱没在工作、哪个风险在消耗收益、回测到实盘在哪一步衰减、下一单位风险资本最值得放在哪。

## 1. Alpha 保全账

贯穿全产品的分析模型，不是会计准则：

```
Realized Net Alpha ≈ Research Edge
                   − Selection / Overfit Loss
                   − Portfolio Construction Loss
                   − Turnover & Financing Cost
                   − Execution Shortfall
                   − Operational / Data Loss
                   − Live Model Divergence
```

每一项在系统里有一个归属：Research Edge（Lab 回测 run）· Overfit（RobustnessGate：trials / PBO / DSR / OOS 衰减）· Construction（RebalanceDesk 与基准组合对照）· Turnover & Financing（PnLLedger 费税 + CashLedger 利息）· Execution（TCA）· Operational / Data（DataQuality + BreakWorkbench）· Divergence（LiveDivergence）。**AlphaLedger** 组件把七项排成一张账。

## 2. 四个闭环

| 闭环 | 必须回答 | 主面板 |
|---|---|---|
| **Alpha** | 有哪些研究优势？证据多强？哪些已衰减？新机会在哪？ | HypothesisLedger · FactorLibrary · RobustnessGate · StrategyCompare · FactorDecay |
| **Capital** | 资金在哪？风险在哪？下一单位资本配给什么？ | Cockpit · PositionBook · RiskBoard · RebalanceDesk · ExposureTimeline |
| **Execution** | 理论收益有多少被换手、价差、冲击、成交失败、执行方式吃掉？ | OrderBasket · OrderBlotter · TCA · FillLog |
| **Learning** | 回测 → 模拟 → 实盘 → P&L 的偏差从哪来？下次研究修正什么？ | LiveDivergence · AlphaLedger · DecisionJournal · PnLLedger |

85 张卡是这四个闭环的显示与操作零件，不是产品本体。用户从任意重要状态进入（"为什么今天亏钱"、"这个策略为什么不如回测"、"还有多少现金没工作"、"这笔大单继续还是停"、"400 个参数组合里这个 Sharpe 可信吗"），再由对象关系走到其它环节；七大流程（研究 → 策略 → 组合 → 交易 → 执行 → 对账 → 复盘）是对象链，不是强制导航。

## 3. 五层对象：永不混在一起

| 层 | 是什么 | 例子 | 视觉语法（全系统统一） |
|---|---|---|---|
| **Facts 事实** | 不由 Agent 猜测 | 行情、成交、持仓、现金、公司行动、数据版本 | 实心、`ink-100`；带 `source · asOf · quality` |
| **Hypotheses 假设** | 待验证的研究判断 | "低流动性反转在某状态有效" | 点阵标 `HYPO` `signal-blue`；带依据 / 反例 / 范围 / 状态 |
| **Forecasts 预期** | 模型的条件预测 | Alpha、风险、成交成本、概率 | 虚线 / 点阵纹理；带模型版本、误差、区间；标 `FCST` |
| **Plans 计划** | 尚未发生的目标 | 目标组合、再平衡、交易计划、订单草稿 | **空心**（双条的空心框、ChartTrader 的草稿线）；带与现状差异、成本、约束 |
| **Outcomes 结果** | 已实际发生 | 成交、P&L、滑点、回撤 | 实心 + 与计划 / 预期的偏离数字 |

已有组件天然符合：RebalanceDesk 实心当前 / 空心目标；ChartTrader 实线已确认 / 虚线草稿；PositionBook 的 `估算` 角标是 Forecast 对 Fact 的让位。规则：**目标持仓不是当前持仓，预测成本不是实际 TCA，Agent 推断不是公告，订单草稿不是券商接受的订单。** 任何组件把两层画成同一种实心即不通过。

### 持仓的五个数

实际 6,000 + 已确认在途 2,000 + 目标 10,000 不能显示"还需买 4,000"。PositionBook / RebalanceDesk / OrderBasket 必须同时表达：**Actual · In-flight · Projected（= Actual + In-flight）· Target · New Delta（= Target − Projected）**。这是资本决策正确性的组成部分，不是 UI 细节。

## 4. 首屏：Profit & Capital Cockpit

不是行情 Dashboard，不是服务器监控墙。首屏把影响当前资本决策的数据组织成一个答案：

| 区 | 回答 | 零件 |
|---|---|---|
| Capital | 净资产、现金、可用、占用、杠杆、实际 / 预计可用资本 | AccountRail 摘要 + SparkTile 行 |
| PnL | 今日 / 周期 / 累计净 P&L；已实现 / 未实现；费用、融资、执行成本 | IntradayPnL 缩略 + PnLLedger 合计 |
| Risk | 回撤、风险预算使用、净 / 总敞口、集中度、因子敞口 | RiskBoard 缩略 + LossLimits 使用度 |
| Strategy | 各策略资本占用、收益贡献、风险贡献、状态、预期 vs 实际偏离 | DeploymentBoard 缩略 + 一张"占用 vs 贡献"零轴条 |
| Execution | 在途资金、未完成意图、预估 / 实际短缺、拒单与异常 | OrderBlotter 合计 + TCA 当日 |
| Research | 新发现、待审阅实验、因子衰减、研究队列 | HypothesisLedger 待办 + RunQueue |
| Trust | 行情、账户、数据、对账、Agent、关键服务是否足以支撑当前决策 | DataSources / SystemHealth / BreakWorkbench 灯 → 一行 **Trust 带** |
| **Decision Queue** | 真正需要人的事项：批准、停止、调整、调查、继续研究 | **DecisionQueue** |

Cockpit 是「总览」Workspace 的默认模板（`T` 变体：上 Capital + PnL + Trust 一横，下 Decision Queue 左、Strategy / Risk / Execution / Research 右四格）。总览最有价值的不是更多 KPI，而是把这些决策连接到当前资本。

## 5. Agent 团队

一个人是负责人，Agent 是团队成员。默认六个：

| Agent | 默认职责 | 可自动做 | 默认不能直接做 |
|---|---|---|---|
| Research | 文献、市场、事件、新假设 | 搜证据、建研究主题、提实验 | 认定策略有效 |
| Data | 数据发现、质量、PIT、缺口 | 扫异常、回补建议、lineage | 静默更换研究数据 |
| Quant | 因子、模型、实验、回测 | 提交计算、比较 run、诊断过拟合 | 自行推进到实盘 |
| Portfolio | 资本、风险、目标组合 | what-if、优化候选、压力测试 | 无授权改真实持仓 |
| Execution | 流动性、成本、执行方案 | 分析订单、产生执行建议 | 绕过交易锁或账户权限 |
| Ops / Risk | 运行、对账、异常、安全 | 自动检测、重试安全任务、形成 incident | 改关键限额、掩盖异常 |

OpenAlice 承载这六个角色（session / task / run）；KATANA 显示他们的提案、证据与状态（AliceSessions、RunQueue、DecisionQueue），并通过同源命令接受人的裁决。Agent 不是权限角色。任何有副作用的提案走同一条不可绕过的路径：

```
Agent Proposal → Capability Permission → Data Freshness / Account / Risk Check
→ Policy Engine（blocked → Evidence）→ Human / Mandate Gate → Execution Gateway → Broker
```

UI 插件、Agent、MCP、工作流都不能跳过最后三步。每个有副作用的动作显示 Agent、工具、账户、参数、政策结果；确认绑定固定参数 hash（engineering.md §4）。

## 6. 决策级数据

做资本决策前人和 Agent 必须知道什么——每条关键数据至少带：

`instrument_id · account_id · source · event_time · received_time · effective_time · as_of · revision · unit · currency · quality · lineage`

基本面、指数成分、公司行动、研究特征必须 point-in-time；指数成分用生效日期，不用今天的成分回测过去。事件市场（预测市场）保存合约定义、bid / ask / last、流动性、结算规则，不只保存"概率"——显示价可能是中点或最近成交，不等于可成交价。研究 **Trial Ledger** 保存全部尝试而非只保存赢家；**Run Artifact** 保存 code / data / config / environment hash 可回放；**执行基准**（arrival / VWAP / decision price）在下单时固化。

数据分层表（L1 / L2-L3 / 逐笔 / 持仓 / 现金 / 订单 / 目标组合 / 信号 / P&L / 风险 / Regime / 基本面 / 公司行动 / 成分 / 事件 / 预测市场 / 替代数据 / Trial / Artifact / 基准 / 遥测）各自的实时与回溯要求见 blueprint §5 适配器；每类的质量语义（延迟、缺口、sequence、修订、授权）是适配器 `source + asOf + quality` 的具体内容。

## 7. 研究风险是 UI，不是研究员自觉

RunInspector 顶部不是 `Sharpe 2.18 · 年化 36%`，而是 **Candidate Quality**：

```
OOS Sharpe · IS→OOS degradation · Trials in search · Deflated Sharpe · PBO
Worst rolling window · Estimated turnover · Cost sensitivity · Data quality · PIT / leakage tests
```

漂亮数字不得拥有最大视觉权重。**RobustnessGate** 组件把 PBO / DSR / OOS 衰减 / 尝试数做成门；门未过的候选在 StrategyCompare 与 DeploymentBoard 上带标。组合优化同理：`Baseline → Constraints → Candidate → Stress → Cost → Compare`，优化器不能只给一个"最优权重"，必须与等权 / 当前 / 风险预算基准并列（RebalanceDesk 目标来源切换）。

## 8. 探索通道

不能因为建了完整流程就只会优化已知因子。研究层维护 **Exploration Lane**：新数据 → 新市场 → 新关系 → 新假设 → 低成本检验 → 证据积累。预测市场、数字资产微结构、替代数据通过适配器与 HypothesisLedger 进来，不重做导航。

## 9. 扩展单位是 Capability，Panel 是它的一种投影

Dev Spec 的 PanelSpec 是宿主侧的接线；真正的扩展契约是 Capability：

```yaml
capability:
  id · version · domain
  input_schema · output_schema
  requires: { data_capabilities, market_capabilities, permissions }
  actions: [ { id, side_effect, idempotency, confirmation_policy } ]
  surfaces: { full_panel, dashboard_summary, inspector, comparison, report }
  lifecycle: { activate, suspend, dispose, migrate }
  resources: { cpu, memory, market_subscriptions }
  compatibility: { host_version, schema_version }
  audit: { events, evidence }
```

一个新研究工具以 Capability 接入后，同时出现在 GO Bar、Lab、Agent tools 和报告里，不改四套业务代码。`surfaces` 解释了为什么同一能力在 Cockpit 是一格摘要、在 Lab 是整面板、在 RunInspector 是检查器、在 StrategyCompare 是一列、在报告是一节。85 张卡按此归为：UI Primitives · Financial Views · Domain Tools · Decision Workflows（engineering.md §1 的四层级）。

## 10. 对象链

```
Hypothesis → Dataset / Universe / Evidence → Factor / Model / Strategy Version
→ Experiment → Run → Review → Capital Allocation → Target Portfolio
→ Trade Intent → Order Plan → Broker Order → Fill → Position / Cash
→ PnL / TCA / Attribution → Live Divergence → New Hypothesis
```

链断了 Alpha 就在组织层面消失。每个环节一个 ID，上下游可点。**Trade Intent** 是新对象：订单 100% 可追溯到 intent 或明确标 manual。

## 11. MVP 按能力验收，不按组件数

| 优先级 | 交付 | 完成定义 |
|---|---|---|
| P0-A | Profit & Capital Cockpit | 真实回答资本、P&L、风险、策略、执行、账户、异常当前状态 |
| P0-B | Decision-Grade Data Layer | symbol / account / time / source / version / quality 统一；stale / missing 不伪装成 0 |
| P0-C | Research Ledger + Run Evidence | hypothesis → dataset → strategy → run 全追踪；全部 trials；OOS / PBO / DSR |
| P0-D | Strategy Studio | 定义、回测、walk-forward、compare、shadow / live divergence 一个现场 |
| P0-E | Capital Allocation + Rebalance | Actual / In-flight / Projected / Target 同时可见；risk / cost / constraints what-if |
| P0-F | Order & Execution Lifecycle | intent → order → fill；pre / in / post TCA；拒绝 / 超时 / 未知正确 |
| P0-G | Reconciliation + Alpha Attribution | positions / cash / fills 对账；Gross Alpha → Net P&L 损耗可解释 |
| P0-H | Agent Team Control Plane | 六类 Agent 共用事实；任务持久；权限、审批、日志、网关不可绕过 |
| P0-I | Workspace / Capability Runtime | 85 组件进正式场景；新 capability 不改 Shell |
| P1 | 探索与高级资产 | 事件市场、数字资产回放、衍生品、复杂归因、报告自动化 |

### 验收任务（九条全部跑通才算 MVP）

1. 首页发现某策略"占用高贡献低" → 下钻 → 找到成本 / 偏离来源 → 建研究任务 → Agent 生成对照实验 → 新旧 run 可比。
2. 账户发现持仓 ≠ 目标 → 系统自动计入在途 → 增量再平衡 → 风险与预计成本 → 订单计划。
3. 一张订单从提交、部分成交、改单、拒绝到完成全程可恢复；刷新不丢状态。
4. 历史数据修订后旧 run 按原版本重建；新 run 明示数据版本变化。
5. 漂亮回测来自数百次试验时，界面自动暴露 trials / OOS 衰减 / PBO / DSR。
6. 券商与内部持仓不一致 → 进入 break；任何 Agent 不能静默修平。
7. 模拟行情断线、sequence gap、账户超时、worker crash、渲染失败后，用户明确知道哪些数据仍可信、哪些决定暂不执行。
8. 新研究工具以 Capability 接入 → 同时出现在 GO / Lab / Agent tools / 报告。
9. Agent 独立完成资料研究、数据检查、实验、组合草案，但绕不过网关、风险策略、生产权限。

### 性能验收（写数字，不写"高性能"）

点击 / 选择 / 聚焦本地反馈 p95 ≤ 100ms · INP p75 ≤ 200ms · Splitter / 图表 pan-zoom 记录 p95 帧时与丢帧（不只报平均 FPS）· 100–200 标的 warm watchlist · 8–16 个活跃 L2 / Footprint 窗口 · 长任务全部 durable · 8h soak 无泄漏 · 断线后恢复到同一任务或明确终态。100–200 与 8–16 是建议负载，按实际数据源与硬件重标。

### 任务生命周期

`CREATED → QUEUED → RUNNING → { WAITING_INPUT | CANCELLING | FAILED | CANCELLED | SUCCEEDED }`。Progress 是临时状态；Run identity 与结果是 durable fact。需要跨刷新保留的写持久日志，streaming / progress 保持临时。"request sent" 绝不等于 "accepted"。

## 12. 一句话

**KATANAview = Capital + Alpha + Agents。** 它知道钱在哪里，知道研究从哪里来，知道策略为什么工作或失效，知道理论收益在哪里被消耗；Agent 扩大一个人的研究和运营能力，人负责最终资本责任。将来探索预测市场、Tokenization 或任何新 Alpha 来源，只要它能提供事实、数据、假设、预测、资金风险和结果，就进同一套决策系统，不重新设计产品。

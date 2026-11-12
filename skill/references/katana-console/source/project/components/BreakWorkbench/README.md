# BreakWorkbench

对账差异工作台：内部账（账户服务）与外部（券商 / 托管对账单 / 成交回报）之间的持仓、现金、成交差异。每个 break 一行：编号 · 账户 · 对象 · 内部值 · 外部值（差异 amber）· 候选原因与处理记录 · 状态与时长。规则只有一条最重要：**缺失不解释为 0，差异必须显式，任何 Agent 不能静默修平。**

## 结构

- KPI 5 格：未闭合 break（按类型拆）· 匹配率 · 最老 break 时长 · 对账源数 · 最近运行。
- 表：OPEN amber / CLOSED 绿；CLOSED 行 `ink-300` 并写闭合方式（人 / 自动）；自动闭合只允许"时点差"类（T+1、结算时点）。
- 候选原因由 Ops Agent 填（`候选` 字样），处理记录是人或系统的事实。
- 孤立事件（外部有而内部无 parent order）单独类型。

## 交互

- 点击 break → 展开：两侧明细、时间线、相关 FillLog / CashLedger / CorporateActions 行、Agent 推理（标来源）。
- 处理动作：确认外部为准（写 ADJUST 行到 CashLedger / TaxLots，走确认）· 确认内部为准（向券商提交查询）· 标为时点差（自动闭合规则）· 升到决策队列。
- 「导入对账单」CSV / 券商接口；「重跑」对账。
- 超过 24h 的 OPEN 进告警阶梯 L2；影响交易锁判断的（持仓差）在 RiskBoard 底行同步显示 `对账中`。

## 规则

- 对账是账户服务的作业，前端显示并驱动人工处理。
- 每个 break 有影响范围（哪些面板的数字受影响）、责任（人 / 系统）、处理记录、最终确认；闭合写 DecisionJournal。
- 有 OPEN 持仓 break 的品种在 PositionBook 标 `对账中`，RebalanceDesk 不对它生成交易。
- 不显示"对账健康分"。

## 谁提供什么

- 组件：breaks[]（id、account、kind、object、internal、external、candidates[]、log[]、state、openedAt、impact）、stats、onResolve、onImport、onRerun。
- 调用方：账户服务对账作业 + Ops Agent。

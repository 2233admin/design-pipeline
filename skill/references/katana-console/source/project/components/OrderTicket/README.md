# OrderTicket

下单票。**核心界面**：由外壳渲染，主题与插件不能替换结构，和确认框同级（Overlays §Dialog）。它是手动下单的入口之一（另两个是 DOMLadder 点击和 ChartTrader 图上拖），三者都只产生 `order.place` 命令，不直接连券商。

## 结构（自上而下，顺序固定）

1. **标题行：账户短码 + 种类 + 品种。** 账户永远第一；实盘 `LIVE · 实盘` amber 点阵标，PAPER 蓝标。多选账户集合时这里是一个必选下拉，没有默认值。
2. 方向：两格 Segmented，BUY `bid` 蓝底 / SELL `ask` 橙底，点阵大写 + 中文。不用红绿。
3. 类型：限价 / 市价 / 对手价 / 算法（≤ 5）。算法展开时间窗与参与率两行。
4. 价格：LCD 输入，右侧参考价（买一 / 卖一 / 最新），点击参考价填入；↑↓ 按最小变动价步进，Shift 为 10 档。
5. 数量：LCD 输入 + 步进钮 `− + ¼ ½ 全`（按可用资金或可卖量算）；期货显示手数并换算名义。目标 ≥ 28px。
6. **预估块**（凹陷）：金额 · 可用 · 成交后权重（接近限额 amber ▲）· 费用（估）。所有数字来自 RiskBoard 共享的计算器，带 `估` 字。
7. **ConsensusBlock**（GATEWAY · ACCOUNT · RULES 三方表决 + 结论 + hash）取代预检灯行；danger 或未评估时提交钮禁用。
8. 提交钮：`提交 → 确认`，⌘⏎。按下后弹核心确认框；确认框显示同一个 hash，票上任何改动 hash 变、确认框失效。

## 交互

- 从 Watchlist / PositionBook / 梯子带入品种与方向；从 PositionBook 带入时数量默认 = 该账户可卖量（卖）或 0（买）。
- 价格框聚焦时梯子上该价位高亮（同 LinkGroup）。
- 提交 → 确认 → `order-sent` + 票闪一次 orange + 单进 OrderBlotter；失败 `cmd-err` + 抖 2px + 原因。
- 快速模式（跳确认）在 DOMLadder 开启后对票同样生效；实盘每会话重新确认一次；永不跳过风控拒绝。
- Esc 清空票但保留账户与品种。

## 规则

- 文案平淡、字号正常、无动效诱导（§24）：提交钮不发光、不跳。
- 不显示盈亏预测、不显示"胜率"。
- 实盘票的边框 1px amber；模拟票无边框色。
- 一张票一个账户；要在多个账户下同一单是「篮子」命令，另开界面（第二版）。

## 谁提供什么

- 组件：account、symbol、side、type、price、qty、algo、precheck（来自执行网关）、estimate（来自共享计算器）、onSubmit(cmd)。
- 外壳：渲染与确认框绑定；主题只能改 token 值。

## ATAS 对照补齐（2026-10-03，atas.md §2.7）

- 订单类型补齐：Market · Limit · Stop · StopLimit · Conditional · OCO；TIF Day / GTC / FOK / IOC；Stop as StopLimit 与滑点。
- 市场差异标志由 MarketProfile 决定显隐：Reduce Only · Post Only · Close on Trigger · 保证金模式（加密）。
- Trading panel 快捷钮：Buy/Sell Market · Buy/Sell Ask · Buy/Sell Bid · Cancel Bids / Asks / All · Reverse · Close · Flat；数量预设 5 档 + `trade.volumePreset n` 热键。
- 出场策略一栏嵌入 ExitStrategy 默认，可临时覆盖；"执行合约"下拉（Cross-Trading）。
- 命令补齐：`order.cancelAll(kind)` · `position.flatten` · `trade.flag.*`，全部进 Preferences Trading 热键组。

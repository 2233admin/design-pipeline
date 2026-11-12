# OptionsChain

期权链：行权价居中，左 Call 右 Put，每侧价格 · IV · Delta · 持仓量，自己的仓位 `order-own` amber。到期日用 Segmented（≤ 5 个可见，其余下拉）。它是 DOMLadder 的姐妹：同样价格居中、同样可以点击下单（走 OrderTicket 期权变体 → 确认）。

## 结构

- 顶行：标的 · 到期 Segmented（含剩余天）· 标的价 / ATM IV / PCR · 账户。
- 行 `row-tight`：ITM 侧轻微提亮背景（2% 白），ATM 行行权价橙 + 描边；行权价列 `bg-000` 凹陷。
- 默认 ±5 档，滚轮扩展；页脚显示合计 Δ 等效（进 PositionBook 的 `Δ-eq` 行）。
- 列可配置：加 Gamma / Theta / Vega / 买卖价 / 成交量 / 隐波偏度。

## 交互

- 点击某格 → OrderTicket（期权）预填合约与方向；Shift 点击多格 → GreeksBoard 策略构建（组合 P&L 曲线）。
- 悬停 → tooltip：Greeks 全套、理论价、买卖价差、持仓量变化。
- 行权价居中跟随标的价滚动（跟随 / 锁定同 DOMLadder）。
- 到期切换：数据直接换，不动画。

## 规则

- IV 来自数据源或 Lab 定价 run（标来源）；两者不一致 > 2 个 vol 点时 amber。
- 保证金、行权规则来自 Profile（CN-OPT）；组件不算。
- 不用涨跌色；Call / Put 不着色（用位置区分）。
- 到期 ≤ 5 天的 Segmented 项 amber。

## 谁提供什么

- 组件：underlying、expiries[]、chain[]（strike、call{...}、put{...}、own）、columns、account、onPick、onBuild。
- 调用方：行情（MarketAPI，期权 L1）+ Greeks（Worker 或 run）+ Profile。

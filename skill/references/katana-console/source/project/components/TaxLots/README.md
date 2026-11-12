# TaxLots

批次成本：一只票在各账户里每一批开仓的日期、数量、成本、持有期、未实现盈亏；卖出时按规则（FIFO / 高成本先 / 低成本先 / 指定）选批次并预估已实现。PnLLedger 的"已实现"和 PositionHistory 的均价都从这里的批次算。

## 结构

- 顶行：代码·名称 · 批数 / 总量 / 可卖量 · 批次规则 Segmented（≤ 4）· 右侧卖出数量 LCD 输入 → 预计已实现。
- 列：选择框 · 开仓日 · 账户 · 数量 · 成本 · 持有天 · 未实现 · 状态（可卖 / 本次出多少 / 不可卖原因）。
- 不可卖批次（Profile.settlement 决定）整行 `ink-300`，状态 amber 写原因。
- 持有 > 1 年（或 Profile 定义的长短期界限）的批次持有列带点阵 `L` 标。
- 页脚：加权成本 · YTD 已实现 · 长期批数 · 「生成卖单 →」（预填 OrderTicket，批次选择随单带入执行网关）。

## 交互

- 改卖出数量或规则 → 被选批次的选择框与"本次出 n"实时变，预计已实现数字滚动。
- 「指定」模式手动勾选批次；数量不足时页脚 amber 提示。
- 点击批次 → FillLog 高亮开仓成交；点击未实现 → PositionHistory。
- 分红 / 送转调整成本的批次带 `ADJ` 标，悬停显示调整前后。

## 规则

- 批次规则来自 Profile 或账户设置，每次卖出记录所用规则（PnLLedger 可追溯）。
- 跨账户不混批：卖单只能选同一账户的批次；合并视图只做展示。
- 涨跌色只在未实现 / 已实现数字。
- 研究账本无批次。

## 谁提供什么

- 组件：lots[]（openDate、account、qty、cost、holdDays、unrealized、sellable、reason、flags）、rule、sellQty、onChange、onGenerateOrder。
- 调用方：账户服务批次表（Query）+ Profile。

# AlphaLedger

Alpha 保全账：从研究优势（回测 gross）到真实净收益之间的七项损耗，一张账。每行一项：名称 + 归属组件小字 · 水平条（长度 = 幅度，Research Edge 与 Realized 用 `series-1`，最大损耗项 amber）· 年化 · 累计列。这是 Learning 闭环的核心视图，回答"理论收益在哪里被消耗"。

## 结构

- 顶行：范围 Segmented（组合 / 各策略）· 区间与口径（年化 % · 费后）· 右侧 Edge → Realized 两个 LCD 与保全率。
- 八行：Research Edge · Selection/Overfit · Portfolio Construction · Turnover & Financing · Execution Shortfall · Operational/Data · Live Divergence · **Realized Net Alpha**（合计行 `bg-300`）。
- 不用瀑布图的悬浮柱：每行独立水平条 + 右侧累计列，读者不用追踪基线（dataviz 规则保留）。
- 估算项（如费用折算）标 `估`；对账通过的 Realized 带 ✓。

## 交互

- 点击行 → 归属组件（RobustnessGate / RebalanceDesk 基准对照 / PnLLedger / TCA / DataQuality + BreakWorkbench / LiveDivergence）定位到同区间。
- 切策略 → 行值 `gentle` 过渡；顺序不变。
- 「作为决策队列依据」→ 把最大损耗项生成一条 INVESTIGATE 提案（Agent 填证据）。
- 导出 / 加入报告。

## 规则

- 七项口径由 `facts/alpha-ledger.md` 定义，前端不算：Edge 来自对应 run 的 gross 年化；Overfit 用 DSR 与原 Sharpe 之差折算；Construction 用实际组合 vs 等权（或指定）基准；Turnover & Financing 用费税 + 利息；Execution 用 TCA arrival shortfall；Operational 用停算 / 对账差异日的机会成本；Divergence 用 LiveDivergence 未解释 + 信号不一致部分；合计必须等于 PnLLedger 的费后年化（差额进 `未解释` 行并 amber）。
- 单位统一年化 %（或可切金额）；不用涨跌色填条。
- 研究账本不进此账。

## 谁提供什么

- 组件：rows[]（key、value、cumulative、source、estimated）、edge、realized、scope、range、onDrill、onPropose。
- 调用方：`book/performance` + 各归属组件的同源数据（Query）。

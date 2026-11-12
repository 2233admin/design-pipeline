# SignalMonitor

信号流：今天所有 paper / live 策略发出的信号——时间、策略（阶段标）、品种、方向（OPEN / ADD / TRIM / CLOSE / SHORT，订单流色）、目标仓位、理由（前三特征贡献，来自模型）、执行结果（进了哪个篓子 / 已成 / 跳过原因）。append-only，SmartTape 滚动规则。LiveDivergence 的"信号不一致"层点进来就是这里的对照表。

## 结构

- 顶行：过滤 Segmented（全部 / live / paper / 未执行）· 今日计数（信号 / 执行 / 跳过）· 自动滚动灯。
- 列：时间 · 策略 + 阶段点阵标（LIVE amber / PAPER 蓝）· 品种 · 方向 · 目标仓 · 理由（≤ 3 项，特征名 `ink-200` + 贡献值）· 执行。
- 跳过的行执行列 amber 写原因（涨停 / 停牌 / 策略暂停 / 风控拒绝 / 可卖不足）。
- 最新一条左 2px 橙描边 3s。

## 交互

- 点击行 → PositionBook 高亮该票；点击"→ 篓子" → OrderBasket；点击理由特征 → FactorIC 该因子。
- 「与回测比对」→ LiveDivergence 信号层：同日回测信号 vs 实盘信号差异行。
- 右键：加入笔记（带信号引用）· 对该策略建警报。
- 用户上翻停止滚动，底部 `↓ 新 n`。

## 规则

- 理由来自模型的特征贡献（SHAP / 线性系数），标方法；不是文字解释。
- 信号不是订单：执行列说明它变成了什么。
- 研究阶段的策略不发信号到这里（它们没有"今天"）。
- 不显示信号的预期收益。

## 谁提供什么

- 组件：signals[]（ts、strategy、stage、symbol、action、target、reasons[]、exec{kind, ref, reason}）、filter、onPick。
- 调用方：OpenAlice 信号流 + 执行网关结果。

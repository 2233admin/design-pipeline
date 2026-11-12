# FactorDecay

因子衰减：IC 随持有期（1…20 日）的曲线，多因子叠加，半衰期竖线，成本后盈亏平衡 IC 水平线（amber）。右侧表给半衰期与建议调仓频率。它直接回答"这个因子该多久调一次仓"，是 FactorLibrary 卡片上那 10 根迷你柱的完整版。

## 结构

- 顶行：持有期范围 · 参与 run 蓝标 · 宇宙与区间。
- 图：每因子 `series-n` 2px；半衰期竖虚线同色；成本线 amber 虚线（来自 RunLauncher 第 5 步的成本模型折算成 IC 当量）。
- 右表：因子 · 半衰期 · 建议调仓；多因子合成时底注给出合成的调仓建议规则。
- ≤ 5 条因子，超出拆面板。

## 交互

- 悬停持有期 → tooltip：各因子该持有期 IC、t 值、与成本线距离。
- 点击因子 → FactorIC / QuantileLayers 切到该因子并把持有期设成悬停值。
- 切成本模型（标准 / 保守 / 零）→ 成本线移动，建议重算。
- 「用建议调仓重跑」→ RunLauncher 预填 rebalance 参数。

## 规则

- IC 衰减来自因子评估 run（固定评估器），前端不算。
- 半衰期 = IC 降到首日一半的持有期（线性插值），标注方法。
- 不用涨跌色；IC 为负的段不变色，只在表里写负。

## 谁提供什么

- 组件：factors[]（id、name、decay[{h, ic, t}]、halfLife、suggestedRebalance）、costLine、range、onPick、onRerun。
- 调用方：因子评估 run（Query）+ 成本模型。

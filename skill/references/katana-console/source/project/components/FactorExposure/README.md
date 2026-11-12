# FactorExposure

因子暴露：组合相对基准在风格因子（动量 / 成长 / 规模 / 价值 / 波动 / 流动性 / Beta……）和行业上的主动暴露。零轴条，基准就是零线；限额线来自 RiskBoard 的同一份限额。暴露由 Lab 的因子回归 run 给出（CNE6 / Fama-French / 自定义），前端只显示。

## 结构

- 顶行：模式 Segmented（主动 / 绝对）· 模型 run（蓝标：id · 模型 · 日期）· 基准 · 右侧拟合质量（R² · 特异风险占比）。
- 两栏：风格（单位 σ，≤ 10 行）· 行业（主动权重 %，Top 6 + `其他 ×n`）。每行：标签 · 零轴条 · 数值。
- 条 `ink-200` 点阵纹理，方向用位置；越限的条与数字转 amber；限额线 1px amber 半透明在两侧。
- 绝对暴露模式切成双条（组合实心 / 基准空心），与 RebalanceDesk 同一形态。

## 交互

- 点击一行 → PositionBook 按该因子 / 行业排序并高亮贡献最大的持仓（LinkContext 扩展字段 `factor`）；再点取消。
- 悬停 → tooltip：暴露值、限额、贡献前三持仓、t 值。
- 切模型 run：条 `gentle` 移到新值；行顺序不变（§9）。
- 时间：跟 LinkContext.range 的终点取最近一次 run；可在 Lab 里看暴露时序（不在这里画）。

## 规则

- 不做雷达图 / 蜘蛛图。
- 风格因子顺序固定（模型定义的顺序），不按大小排；行业按 |主动| 排但 `其他` 永远最后。
- 限额与 RiskBoard 同源；越限同时在 RiskBoard 出现。
- 研究账本可以作为"组合"进来对照（Lab 用法），此时顶行标 `RUN`。

## 谁提供什么

- 组件：exposures（style[]、industry[]，各含 value、limit、contributors）、mode、model（run id）、bench、onSelect(factor)。
- 调用方：因子回归 run（Query）；限额（RiskBoard 同源）。

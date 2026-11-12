# TCA

成交成本分析：每张单的成交价相对三个基准（到达价 / 区间 VWAP / 收盘）的滑点（bp），按算法 / 账户 / 时段 / 品种分组看零轴条，逐单看散点（横轴订单占 ADV%，纵轴滑点）。回答"哪种下单方式在哪种流动性下更贵"。LiveDivergence 的"滑点与冲击"层点进来就是这里。

## 结构

- KPI 5 格：vs 到达价 · vs VWAP · vs 收盘 · 成交率 · 成本合计（含费）。滑点对我不利时 amber，不用涨跌色。
- 左框：分组零轴条（Segmented：算法 / 账户 / 时段 / 品种），零线靠右（多为不利）；最差一组 amber。
- 右框：逐单散点 `ink-200`，最差一单橙圈；横轴 ADV% 对数。
- 单位统一 bp；金额只在 KPI 合计出现。

## 交互

- 点击分组 → 散点只显示该组；点击散点 → FillLog 高亮该单的全部成交 + PriceChart 画到达价 / VWAP 线。
- 基准切换（到达 / VWAP / 收盘）→ 条与点 `gentle` 移动。
- 区间跟 LinkContext.range；账户跟 AccountSet。
- 导出逐单 CSV；「加入报告」。

## 规则

- 到达价 = 命令确认时刻的中间价（确认框 hash 时间）；VWAP 用成交区间；由 Worker 从 FillLog + 行情历史算。
- 买卖方向调整后统一为"负 = 对我不利"。
- 样本 < 20 单的分组标 `样本少`。
- 不做"执行评分"。

## 谁提供什么

- 组件：orders[]（id、algo、account、symbol、advPct、slipArrival、slipVwap、slipClose、filled、fees）、groupBy、bench、range、onPick。
- 调用方：FillLog + 行情历史（Query）；计算在 Worker。

# PerformanceReport

绩效报告：组合（或一个账户、一条策略）在一个区间内的"体检单"。KPI 行 + 净值 vs 基准 + 滚动指标副图 + 月度表 + 回撤表。它是「绩效」台面的主面板，也是 ReportBuilder 第一页的来源。

## 结构

- 顶行：区间 Segmented（1M / 3M / YTD / 1Y / 全部，自定义走 LinkContext.range）· 基准（可换，永远灰）· 账户集合 · 右侧口径（费前/费后 · 币种 · 频率）。
- **KPI 行 6 格**（≤ 6，§7）：收益 · 超额 · Sharpe · 最大回撤 · 波动 · Beta；每格 LCD 大数 + 一行对照小字（基准值 / 相邻指标）。收益与回撤数字用 `pnl-*`，其它 `ink-100`。
- 主图：净值线 `series-1` 2px、基准 `chart-bench` 1px 虚线、末点橙；下方可选 1–2 个滚动副图（夏普 / 波动 / Beta / 跟踪误差 / 超额），`series-2..3`。回撤面用点阵纹理（同 EquityCurve）。
- 右侧月度表：月 × （组合 / 基准 / 超额），YTD 行 `ink-100` 加亮；数字用 `pnl-*` 只上组合列，基准列不上色。超过 24 个月折成年度表 + 可展开。
- 下方（滚动可见）回撤表：前 5 次回撤的深度 / 开始 / 谷底 / 修复天数；仍未修复的标 `进行中` amber。

## 交互

- 刷选主图 → LinkContext.range，月度表与 KPI 重算；同组的 PnLAttribution / Calendar 跟随。
- 悬停月度格 → 主图对应月高亮；点击 → 区间设为该月。
- 切基准：基准线 `gentle` 换；组合线不动。
- 口径切换（费前 / 费后、含分红 / 不含）：KPI 数字滚动，不重画线。
- 导出：CSV（日频序列）与「加入报告」命令。

## 规则

- 所有指标由 `book/performance` Worker 用同一份日频净值算，与 EquityCurve 对回测的算法相同（同一个函数库）。
- 基准必须与组合同币种或已换算（标 `估算`）。
- 不做饼图、不做"评分"、不做雷达图。
- 多账户时合计口径 = 资金加权（TWR）；可切 MWR，页脚写明。

## 谁提供什么

- 组件：nav[]（日频）、bench[]、range、basis（gross/net、incl. dividends）、accounts、rollingMetrics[]、onRange。
- 调用方：净值与基准序列（Query + 聚合器）；指标计算在 Worker。

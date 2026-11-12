# ExposureTimeline

敞口时间线：总敞口 / 净敞口 / 多空 / 行业或资产类别堆叠随时间的变化，叠限额线。回答"什么时候仓位最重、重在哪"，和 PerformanceReport 对照能看出收益是不是靠加杠杆来的。

## 结构

- 顶行：视图 Segmented（总/净 · 行业堆叠 · 多空 · 资产类别）· 区间与账户 · 右侧当前总 / 净 LCD 与限额。
- 总/净：总敞口 `series-1` 25% 面 + 线，净敞口 `ink-100` 线，限额 `signal-red` 虚线；超限时段用 amber 8% 竖带标出并写天数。
- 行业堆叠：≤ 7 个行业 `series-1..7` 堆叠面（点阵纹理可选），其余 `其他` `ink-400`；顺序固定。
- 多空：多在零线上 `series-1`，空在零线下 `series-2`，净为 `ink-100` 线。
- 日频；盘中最后一点为当前估算（标 `估算`）。

## 交互

- 悬停 → tooltip：日期、各项值、持仓数、当日换手。
- 刷选 → LinkContext.range；PerformanceReport / PnLLedger 跟随。
- 点击堆叠面的某行业 → PositionBook 按行业过滤到该日（历史快照）。
- 切视图：面 `gentle` 过渡；颜色不重分配。

## 规则

- 期货期权按名义 / Δ 等效计入，图例注明；研究账本不计。
- 限额与 RiskBoard 同源。
- 堆叠 ≤ 7 + 其他；不做 100% 归一堆叠（那会丢掉总量信息）。
- 不用涨跌色。

## 谁提供什么

- 组件：series{gross[], net[], long[], short[], byGroup{}}、limits、view、range、onBrush、onPickGroup。
- 调用方：`book/aggregator` 日快照（Query）。

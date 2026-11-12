# FlowGauges

ATAS 8.0.12 的四个 Widgets 做成一行仪表：**Market Pressure**（近 N 秒逐笔买卖力量，−100…+100）、**Price Change**（周期内价格变化归一）、**DOM Pressure**（前 N 档 Bid / Ask 挂单比）、**Delta Divergence**（5s / 1m / 5m / 20m 多周期 Delta 与价格背离，LED 矩阵，N/A 状态不伪造）。由 Meter + SparkTile + StatusLED 组成，归仪器预算（engineering.md §6）：一屏最多一行。

## 结构

- 四格等宽，每格：点阵小标题（含周期）、LCD 数值或 LED 矩阵、一行说明。
- 零轴居中的 Meter 用 `series-1 / series-2`，不用涨跌色（压力不是盈亏）。
- 周期可配（每格独立），默认 1m / 5m / 10 档 / 5s–20m。

## 交互

- 悬停 → 计算口径与窗口；点格 → 把对应指标加到当前图的副图（经 IndicatorPanel）。
- 跟随 LinkGroup 的 instrument；回放时接回放时钟。

## 规则

- 全部在 Worker 算（逐笔 + L2）；窗口不足显示 N/A，不填零。
- 无逐笔方向时 Market Pressure 灰显并标 `估算`。
- 不做声音、不做闪烁——这是读数，不是告警（告警走 AlertCenter）。

## 谁提供什么

- 组件：gauges[]{kind, window, value, state}。
- Worker：`flow.pressure / flow.priceChange / flow.domPressure / flow.deltaDivergence`。

## ATAS 对照

承接 Widgets 四项（atas.md §2.9）。P1。

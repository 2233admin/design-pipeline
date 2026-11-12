# RegimeStrip

市场状态带：Lab 的状态模型（HMM / 规则 / 聚类）把历史分成几种状态，画成一条色带叠在任何时间轴下（EquityCurve、WalkForward、PriceChart 都能挂），加一张分状态收益表。回答"策略在什么市场里行、什么市场里不行"。颜色是类别（`series`），不是好坏。

## 结构

- 顶行：run 蓝标 · 模型与状态数 · 右侧当前状态（色块 + 名）· 已持续 · 转移概率提示。
- 上：参考线（基准）`ink-300`；下：状态带 14px，`series-1 / 2 / 4 / 7`（挑色距大的四个），无缝。
- 表：状态 · 占比 · 策略年化 · 基准年化 · 超额 · MaxDD；样本段少（≤ 2）的格标 amber `样本 n 段`。
- ≤ 6 态；更多提示合并。

## 交互

- 悬停带 → tooltip：区间、状态、持续月、当期策略 / 基准收益。
- 点击某状态 → EquityCurve 只高亮该状态的区段，TradeStats 过滤；再点取消。
- 作为叠层：任何时间轴组件可挂 `RegimeStrip.band` Primitive，只画带不画表。
- 切 run（不同状态模型）→ 带 opacity 换，表重排。

## 规则

- 状态在样本外的识别有滞后，带的最后一段标 `估`（模型用当月数据才能确认）。
- 不用涨跌色、不用 signal 色；危机也是 `series` 色。
- 表里的数来自回测 run 按状态切分，与 EquityCurve 同源。

## 谁提供什么

- 组件：segments[]（from、to、state）、states[]（id、name、color、stats）、current、run、onPickState。
- 调用方：状态 run + 回测 run（Query）。

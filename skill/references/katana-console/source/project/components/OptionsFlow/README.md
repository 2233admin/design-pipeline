# OptionsFlow

ATAS Options X-Ray Suite 的流式部分：**Big Trades**（大单权利金）、**Flow**（成交带）、**Flow Delta**（买入权利金 − 卖出）、**Strike Profile**（按行权价的 Call / Put 流）、**Market State**（GEX、Expected Move、Put/Call、Flow Δ 读数）。GEX / Charm / Strike Heatmap 用 Heatmap 的"行权价 × 时间"预设；Expected Move / OI Profile / Key Levels / GEX Profile 作为 PriceChart 叠加经 IndicatorPanel 加入。

## 结构

- 主区成交带：时间、行权、C/P（`series-1 / series-2`，不用涨跌色）、方向、权利金、张数、标记（SWEEP / BLOCK / MULTI，点阵标签；SWEEP 橙）。
- 右侧 Strike Profile（零轴左右对称条）与 Market State 四个 LCD 读数。
- 顶部分段切换视图；周期与过滤（最小权利金、0DTE / 全部到期）是面板设置。

## 交互

- 点一笔 → OptionsChain 定位到该合约；行权价 → PriceChart 画水位线。
- 大单可存为 AlertCenter 规则（权利金 ≥、SWEEP）。
- 跟随 LinkGroup 的标的 instrument。

## 规则

- **需要期权链 + 成交流 + 定价适配器**（CBOE 类分钟级流）；Greeks 由 Worker（BS / Black76）或 Lab run 提供，面板不自算。
- 无流数据时空态，不用链快照伪造"流"。
- 数据源与延迟在标题行常显（`CBOE 分钟级`）。

## 谁提供什么

- 组件：trades[]、profile{}、state{}、filters。
- 后端：期权成交流适配器、期权链 Query、定价 / Greeks。

## ATAS 对照

承接 Options X-Ray：Big Trades · Flow · Flow Delta · Strike Profile · Market State；热力三项走 Heatmap；Surface Profile 已由 VolSurface 覆盖。P2（压在适配器上）。

# Calendar

日历：一个月历格子，底色是收益（或换手）的低饱和发散热力，格内右下数字，左下点阵事件点（财报 / 分红 / 解禁 / 宏观 / 交易日历变化）。TradingView 四种日历 + 收益月历合成一个组件：切「事件」视图时格子不着色，事件按类别列出。

## 结构

- 顶行：视图 Segmented（收益 / 换手 / 事件）· 月份与账户集合 · 事件层图例 · 右侧月合计。
- 格 34px：日期左上 `ink-300`，数值右下 `ink-100`；休市日 `bg-100` + "休"；未来日无色只有事件点；今天橙描边。
- 收益色：`div-pos/neg-100` 大多数，`-200` 仅 |收益| 超月内 80 分位；全饱和不出现（readability §14）。涨跌约定跟 Profile。
- 事件点 5px：普通 `ink-300`，持仓相关或高影响 amber；一格 ≤ 3 点，更多显示 `+n`。
- 周标 `W40` `ink-400`。

## 交互

- 点击日 → LinkContext.range = 该日；PnLLedger / FillLog / IntradayPnL 跟随。
- 悬停事件点 → tooltip 列事件（品种、类型、时间、是否持仓）。
- 事件视图：每格列出事件文字（≤ 2 行），顶行筛选类别与"只看持仓"。
- 月切换 ←→；年视图 = 12 个缩小月历，格只有色没有字。

## 规则

- 休市日来自 Profile.calendar；多市场账户集合时按最早开盘市场显示，格内 `2 市场` 标。
- 收益口径与 PnLLedger 一致（费后、基础货币）。
- 事件来源：数据平台（财报 / 分红 / 解禁 / 宏观）+ CorporateActions；不抓新闻。
- 不做 streak、不做"连胜"计数。

## 谁提供什么

- 组件：month、days[]（date、value、isOpen、events[]）、view、accounts、onPickDay。
- 调用方：PnLLedger 日结 + 事件源（Query）+ Profile。

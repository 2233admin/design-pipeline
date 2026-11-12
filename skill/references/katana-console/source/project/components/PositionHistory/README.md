# PositionHistory

仓位历史：一只票在一个（或合并的几个）账户里的一生——价格线、买卖三角标记、均价阶梯线、底部数量带、事件表。回答"怎么走到现在的"，是 PositionBook 任一行双击后的详情。

## 结构

- 顶行：代码·名称 · 账户（单个或合并，短码）· 持有天数与加减次数 · 右侧均价 / 现价 / 浮盈 / 已实现。
- 图：价格 `ink-200` 1.5px；均价阶梯 `signal-orange` 虚线（每次加减仓变一级）；买 `bid` 上三角、卖 `ask` 下三角，大小按数量三档；底部数量带 `series-1` 35% 面（点阵纹理可选）；末点橙。
- 事件表（≤ 8 行可见）：日期 · 方向 · 事件（账户 · 数量 @ 价格 · 来源 / 原因 · 已实现）· 数量 → · 均价 →。分红、送转、配股也是事件行（点阵标 `DIV` `SPLIT`）。
- 多账户合并时每个事件带账户短码；可切单账户。

## 交互

- 点击事件行 → 图上对应标记高亮 + ReplayBar 定到那一刻（Desk 开着时）。
- 悬停图 → tooltip：日期、价、数量、均价、当日浮盈。
- 右上：在 PriceChart 打开（把标记作为 Primitives 叠上去）· 导出 · 加入笔记（Notes）。
- 已清仓的票：顶行标 `已清仓 · 持有 n 天 · 已实现 x`，图到最后一笔卖出为止。

## 规则

- 均价按 Profile 批次规则（与 TaxLots / PnLLedger 同源）；送转后均价调整要有事件行解释。
- 涨跌色只在浮盈 / 已实现数字；买卖用订单流色。
- 不画指标、不画趋势线；这是账的图，不是分析图。

## 谁提供什么

- 组件：symbol、accounts、price[]、events[]（ts、kind、account、qty、price、source、realized、qtyAfter、avgAfter）、current。
- 调用方：FillLog + CorporateActions + 行情历史（Query）。

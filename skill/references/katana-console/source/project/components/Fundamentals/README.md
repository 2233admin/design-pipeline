# Fundamentals

基本面面板：一只股票的三表（季度 / 年度）、比率瓦片、估值区间、同业对比。Fincept Equity Research 与 TradingView Financials 的对应；DCF / 可比 / DDM 这类估值是 Lab 的 run，结果作为瓦片与区间进来。报告期、会计准则、披露节奏来自 Profile（季报 / 半年报 / 年报），组件不知道"A 股"。

## 结构

- KPI 行 6 格：PE TTM（含历史分位）· PB · ROE · 营收同比 · 净利率 · FCF 收益率；每格 LCD + 一行对照（分位 / 均值 / 变化）。全部 `ink-100`，不上涨跌色——基本面没有涨跌。
- 左：三表 DataGrid（利润 / 资产负债 / 现金流，用点阵小节标分隔，不用 tab），最近 4–8 期列，最新期附同比小字 `ink-300`；单位在表头写明（亿 / 百万，Profile 币种）。
- 右上：估值区间——点阵范围条（悲观→乐观），现价橙刻、估值中枢白刻；标注 run 蓝标与方法。
- 右下：同业表（≤ 6 家 + 中位）：PE / ROE / 营收增，本公司行 `signal-orange`，中位行 `ink-300`。

## 交互

- 跟 LinkContext.symbol；切股数据直接换，KPI 数字滚动。
- 季度 / 年度 Segmented；TTM / 单季 切换。
- 点击三表任一行 → 右侧变成该科目的 8 期迷你柱 + 同业对比；再点返回估值区间。
- 点击同业行 → 写 LinkContext（同组 PriceChart 跟随）。
- 点击估值 run → Lab 打开该 DCF 的假设表。

## 规则

- 每个数字可追到报告期与来源（悬停 tooltip：期、准则、数据源、更新时间）；调整后的指标标 `调整`。
- 中位、分位用全历史或同业全样本，不用结果集。
- 不做评分、不做"综合诊断"、不做雷达图。
- 财务数据是 Query 的；不走行情路径。

## 谁提供什么

- 组件：statements（income / balance / cashflow，periods[]）、ratios、valuation（run、low、mid、high）、peers[]、period（Q/A，TTM）、onPeerSelect。
- 调用方：财务数据源（Query）、估值 run、Profile（报告期与币种）。

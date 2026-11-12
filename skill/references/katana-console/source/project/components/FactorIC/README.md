# FactorIC

因子检验主图：IC 序列柱 + 累计 IC 线 + 五道门 LED + 指标 LCD 行。

## 结构

- 柱：正 `div-pos`、负 `div-neg`（跟随 Market Profile 涨跌约定；色觉友好模式切橙/蓝），瘦柱、柱间 2px 缝、**不圆角**（正负柱不做圆角），0 线用 `line-200` 比网格亮一档。
- 累计 IC 线 2px `series-1`，末点 `signal-orange`。
- 标题右侧五道门 LED：通过 ok、当前 on、未过 warn、未到 off，文字写明哪一道未过。
- 下方 KPI 行用 LCD 窗：IC 均值、ICIR、t 值、成本后 IC、BH-FDR q。未过门的指标用 `signal-amber`。

## 交互

- 逐柱 tooltip：月份、IC、累计 IC、样本数。
- 点击某道门 LED → 展开该门的证据（阈值、输入快照、run id）。
- 和同因子的分层图共享十字线。

## 规则

- 不把 IC 柱和分层净值画在一张图里。
- 门的通过/未过由固定评估器给出，前端只显示，不重算。

## 谁提供什么

- 组件：ic[{t,value}]、cumulative、gates[5]、kpis、onGateClick。

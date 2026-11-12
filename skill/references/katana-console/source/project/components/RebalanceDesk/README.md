# RebalanceDesk

再平衡台：目标组合 vs 当前组合，差多少、怎么下。目标来自 Lab 的优化 run（均值方差 / 风险平价 / Black-Litterman / 等权……）或手填；输出是一张交易清单，交给 OrderBasket。这是资产管理层"构建"台面的主面板。

## 结构

- 顶行：模式 Segmented（目标权重 / 目标数量）· 目标来源（`RUN id · 方法 · 日期`，蓝标；手填时显示 `手动`）· 漂移阈值 · 右侧账户集合与总市值 LCD。
- 列：代码·名称 · **双条**（当前实心 + 目标空心，同一刻度；在途部分用虚线段叠在实心之后 = Projected）· Actual · In-flight · Projected · Target · **New Delta = Target − Projected**（不是 Target − Actual）· 交易清单。五个数必须同时可见（product.md §3）；已有在途订单不重复生成交易。
- 交易清单一行一句：`卖 500 @ 246.80 · A 可卖 3,000 · 整手`。数量来自 Profile 的 `lot()` 取整、可卖量来自 `settlement`、涨跌停来自 `priceLimit`（标 `可能不成`）；组件只拼句子不算规则。
- 现金行永远在底，`ink-300`。
- 页脚：笔数 · 账户数 · 换手率 · 费用估（含印花税等，来自 Profile 费率表，标 `估算`）· 再平衡后最大漂移 · 「生成篓子 →」。

## 交互

- 拖目标空心框 = 改目标权重（弹簧跟随，松手吸附 0.5%）；其它行目标按比例缩放（可锁定某行）。
- 点击漂移列排序；阈值内的行默认折叠成 `n 项阈值内`，点开展开。
- 多账户：每行交易清单可展开到账户分配（按现金 / 按现有持仓 / 手动）；分配规则是 Segmented ≤ 3。
- 「生成篓子」→ 打开 OrderBasket 并带入全部交易；这里**没有执行按钮**。
- 目标来源切换：双条目标框 `gentle` 移到新位置；当前条不动。

## 规则

- 当前权重与 PositionBook 页脚合计必须一致（同一聚合器）。
- 研究账本可以当目标来源，不能当当前持仓。
- 不做饼图 / 环图对比；双条是唯一形态。
- 漂移颜色只有两档：阈值内 `ink-100`、超阈 amber；不做红绿。

## 谁提供什么

- 组件：positions（聚合器）、target（weights | qty，source）、threshold、accounts、profileResolver、feeTable、onBasket(orders[])。
- 调用方：优化 run（Query）、Profile、费率表；组件算漂移与整手取整后的数量，不算优化。

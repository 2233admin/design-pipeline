# CashLedger

现金流账：每个账户每种币种的现金从哪来到哪去——出入金、股息、利息、费用、税、FX、保证金划转、融资融券费用。一行一事，append-only，和券商对账单逐条核对。它是「账务」台面的主面板，也是 PerformanceReport 算 MWR 和费后收益的依据。

## 结构

- 顶部余额卡（≤ 4，更多横滚）：账户短码 + 币种 · 余额 LCD · 一行关键数（冻结 / 融资负债 / 保证金占用）· 对账灯（ok 一致 / warn 有差，差额写出）。外币卡附换算 `估算`。
- 列：日期 · 账户 · 类型点阵标（DEPOSIT / WITHDRAW / DIVIDEND / INTEREST / FEE / TAX / FX / MARGIN / BORROW / REPAY）· 说明（≤ 24 字符）· 金额 · 余额。
- 流入 `ink-100`、流出 `ink-200`，**不用涨跌色**（现金流不是盈亏）；待到账 amber。
- 划转两边各一行（A -100,000 / F +100,000），说明一致，点击一边高亮另一边。
- 页脚：条数 · 净流入 · 费用合计 · 股息合计 · 对账 / 导出。

## 交互

- 筛选：账户（跟 AccountSet）、币种、类型、区间（跟 LinkContext.range）。
- 点击分红 / 税 / 费行 → PositionBook / FillLog 高亮关联品种或成交。
- 「对账」= 导入券商对账单（CSV）→ 差异行 amber 标 `差` 并给出可能原因（时间差 / 费率差 / 缺记录）；接受差异写一条 `ADJUST` 行，永不改旧行。
- 「导出」CSV / XLSX（替代 Fincept 的 Excel 模块）。

## 规则

- 费用必须拆到类型（佣金 / 过户费 / 印花税 / 融资利息），费率来自 Profile 费率表；不显示"手续费"一个总数。
- 外币余额按当日汇率换算显示，标 `估算`；FX 行记录实际成交汇率。
- 研究账本没有现金流账。
- 不做现金流瀑布图；需要趋势时用 SparkTile。

## 谁提供什么

- 组件：balances[]（account、currency、cash、frozen、debt、margin、reconciled、diff）、entries[]（ts、account、kind、memo、amount、balance、refs）、onReconcile(file)、onExport。
- 调用方：账户服务流水（Query，分页）；对账差异计算在 Worker。

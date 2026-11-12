# PositionBook

持仓簿：所有账户、所有品种的一张表。DataGrid 之上用 TanStack Table 的 grouping / expanding 切五种视角（portfolio.md §2），列顺序永不变。它回答三件事：持了什么、分布在哪、赚亏多少。

## 结构

- 顶部一行：视角 Segmented（品种 / 账户 / 策略 / 资产类别 / 品种×账户，≤5 项）+ 右侧当前账户集合（`A B F · 3/5`），集合由 AccountRail 决定，这里只显示。
- 列（固定顺序）：代码·名称 · 持仓/可卖 · **在途**（已确认未成交的净数量，虚线纹理标）· 均价 · 现价 · 浮盈 · 市值 · 权重。持仓是 Fact，在途是已接受的 Plan，两者不相加显示；需要 Projected 去 RebalanceDesk（product.md §3）。`持仓 / 可卖` 两数并列；可卖量按该品种 Profile.settlement 算，两数相等时只显示一个。
- 聚合行 `ink-100`，子行 `ink-200` 缩进 24；聚合行名称后点阵标 `×2 账户`，不堆账户名。
- 子行首列账户短码 Doto 12 `signal-orange`（同 AccountRail）。
- 行高 `row-base` 28；权重列点阵条，期货名义市值的条用 `ink-300` 纹理并标 `名义`。
- 跨币种 / 实时 mark 算出的数带 `估算` amber 点阵标；研究账本行 `ink-300` + `RUN xxxx` 蓝标 + `研究 · 不计入`，永不进合计。
- 页脚：品种数 · 行数 · 视角 · 密度 · 合计市值与浮盈（浮盈数字用 `pnl-*`）。

## 交互

- 点击聚合行展开 / 折叠（`snappy`，子行从聚合行下方升起 ≤ 200ms）；Shift+点击展开全部同级。
- 点击行写 LinkContext `symbol.set`；双击打开 Desk；右键菜单：平仓 / 反手 / 加到自选 / 在 Lab 中打开（前两个是写命令，走确认）。
- 切视角：数据直接重排，不做行飞行动画；只有页脚 LCD 数字滚动。
- 列头排序只在聚合层生效，子行跟随父行。

## 规则

- 浮盈 / 涨跌只上数字，不上行底色；越阈值（浮盈穿 0、权重过上限）才闪一次。
- 期权不与股票相加：按标的另起 `Δ-eq` 聚合行。
- 聚合均价按数量加权；涨跌幅按市值加权；缺某账户数据时聚合行标 `缺 B` 并把该账户摘出合计。
- 永不自己连行情：mark 经 MarketAPI 订阅，每帧 `applyTransaction` 只改变化单元格。

## 谁提供什么

- 组件：positions[]（portfolio.md 模型）、accounts（选中集合）、view、baseCurrency、fx（汇率快照）、onRowAction。
- 调用方：账户快照（Query）、汇率、策略名映射；组件只算聚合与投影。

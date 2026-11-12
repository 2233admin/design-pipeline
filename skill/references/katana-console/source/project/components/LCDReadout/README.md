# LCDReadout

> 只给少数稳定的关键摘要；表格里的数字不是 LCD。**可执行价格、可用资金、订单数量、风险阈值不滚动插值**——它们没有中间值；只有展示性汇总允许数字滚动（engineering.md §5 §6）。

读数窗。所有"一个重要数字"都用它：总资产、时钟、延迟、RS、VaR、状态码。它是系统里唯一允许用 `lcd-xl` / `lcd-md` 字号的地方。

## 外观

- `lcd-bg` + `shadow.recess` + `hairline`，内距 6×12；`lcd-bg` 在 Console = bg-000，在 Paper 仍是深色岛（themes.md §1），数字用 `lcd-fg`。
- 标签 `tag`（Doto 9px，`ink-300`，**≤ 8 个大写字母**，不加字距）在上；中文标签用 `tag-cn` 12px 且只放固定含义；数值 `lcd-xl`（26px）或 `lcd-md`（16px）；单位/副文字 10px `ink-300`。
- 数值颜色只有五种：`ink-100`（中性）、`signal-orange`（当前关注）、`signal-green`（正常/盈利）、`signal-amber`（警告）、`signal-red`（错误/锁定）。
- 无数据显示 `— —` 用 `ink-400`，不显示 0。

## 动效

- 低频数值（资金、VaR、延迟）变化时做**数字滚动**：每一位独立用 `snappy` 弹簧滚到新值，总时长 ≤ 300ms。盈亏方向不改变动效（§25）。
- 高频行情不用这个组件；盘口和表格数字不滚动。
- 状态码变化（LOCKED ↔ OK）：旧值 fade 60ms，新值 fade in 60ms，配对应 LED。

## 规则

- 一行最多 4 个 LCD；更多信息进表格。
- 不在 LCD 里放两个数值；需要对比时用两个 LCD。

## 谁提供什么

- 组件：label、value、unit、tone（neutral / accent / ok / warn / danger）、size（xl / md）、animated。
- 调用方保证 value 已格式化（千分位、小数位）；组件不做数值格式化。

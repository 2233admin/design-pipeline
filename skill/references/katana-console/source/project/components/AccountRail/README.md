# AccountRail

账户轨：一排账户卡片 + 右侧"选中合计"LCD。它是组合工作区的过滤器——选中哪些账户，PositionBook / OrderBlotter / FillLog / RiskBoard / PnLAttribution 同时只看这些账户。账户集合是 Workspace 级状态，和 LinkGroup 平级（portfolio.md §3）。

## 结构

- 每张卡 132×84，`bg-200` + hairline；选中 `bg-000` 凹陷 + `signal-orange-dim` 内描边。
- 第一行：短码（Doto 16 `signal-orange`，A / B / F / P / C，用户自定一个字母）· 种类点阵标（LIVE / FUT / PAPER / SIM / RESEARCH）· 状态灯。
- 第二行：券商 · 账户类型（`sans` `ink-200`）。第三行：净值 `lcd-md`。第四行：两个最要紧的数（现金% / 风险度 / 保证金%，与持仓数）。
- **PAPER / SIM 卡左侧 2px `signal-blue` 竖条，种类标为蓝**；实盘没有任何颜色条。此规则不可皮肤化。
- 账户之间不用颜色区分；颜色只给 LinkGroup。
- 右侧合计窗：`SELECTED n · 基础货币`，净值 `lcd-md` 橙，今日盈亏数字用 `pnl-*`，含换算时标 `估算`。

## 交互

- 点击 = 切换该账户进出集合；⌘点击 = 只看这一个；双击 = 只看这一个并把它设为默认下单账户。
- 键盘 ←→ 移焦，Space 切换，Enter 独选。
- 拖动卡片改顺序（弹簧 `snappy`，其它卡让位）；顺序持久化。
- 超过 8 个账户：轨可横向滚动 + 橡皮筋，折叠的用"+3"计数卡。

## 状态

- 断线账户：卡片 `ink-400`，灯 red，净值 `— —`，合计窗出现 `缺 C` amber 标，并把该账户从合计里摘掉。
- 对账中：灯 amber，净值保留但 `ink-300`。
- 保证金 / 风险度越阈值：对应数字转 amber，灯 warn；不闪。

## 动效 / 音效

- 切换集合：卡片内描边 `snappy`，LCD 数字滚动；表格数据直接换，不做进出动画。
- 账户断线 / 恢复：`link-down` / `link-up` + 灯；不弹 toast。

## 谁提供什么

- 组件：accounts[]（id、code、kind、label、nav、currency、cash%、risk%、positions、status）、selected、onChange、baseCurrency。
- 不自己拉账户快照；快照来自 TanStack Query，权威在账户服务。

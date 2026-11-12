# GreeksBoard

Greeks 板：期权与标的仓位按标的聚合的 Δ Γ Θ ν 表、组合到期 / 当前 P&L 曲线、标的 % × IV 情景小热力。既是持仓风险视图（RiskBoard 的衍生品补充），也是策略构建器的结果页（OptionsChain 多选后进来）。

## 结构

- 顶行：账户 · 腿数 · 时点 Segmented（到期日 / T+0 / T+5）· 右侧组合 Δ-eq 与每日 Θ LCD。
- 左上表：每个标的一行 Δ Γ Θ ν，合计行 `ink-100`；标的期货 / 现货的 Δ 也计入。
- 左下热力：标的 ±5% × IV ±3 vol 的 P&L（千元），发散低饱和，`-200` 只给角落极值；中心格 `bg-300`。
- 右：P&L 曲线——到期 `ink-300` 虚线、当前时点 `ink-100` 实线、标的现价 `poc` 竖线、盈亏平衡点橙；底注最大亏损与方向。

## 交互

- 悬停曲线 → tooltip：标的价、到期 P&L、当前 P&L、各 Greek。
- 点击热力格 → 曲线变成该情景（IV 调整后）。
- 策略构建模式：左表变成腿列表（合约、方向、数量、价），可增删改，曲线实时重算；「下单」→ OrderBasket（多腿一篓）。
- 时点切换：实线 `gentle` 过渡。

## 规则

- Greeks 由 Worker 定价（BS / Black76，Profile 给利率与分红）或 Lab run；来源标注。
- P&L 不用涨跌色填面；只有盈亏平衡点和最大亏损文字。
- 热力中点灰；不做 3D 曲面。
- 保证金占用来自账户服务，显示在 RiskBoard，不在这里算。

## 谁提供什么

- 组件：legs[]、underlyings[]、greeks{byUnderlying, total}、payoff{expiry[], now[]}、scenario[][]、timePoint、onEditLegs、onOrder。
- 调用方：持仓（book/）+ 定价 Worker + 行情。

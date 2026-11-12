# RiskBoard

限额板：风险不散落在各表，集中在这一块。每条限额一根 Meter（当前值 / 预警线 / 硬限）+ 一个 LCD（当前 / 限额），底部一行交易锁状态。它只显示，不下锁；锁由执行网关下发。

## 结构

- 2 列网格，每格：点阵标签（限额名 + 作用账户集合 `A B F`，`ink-400`）· LCD 当前值（`lcd-md`）+ 小字限额 · 点阵纹理条。
- 条上两条线：预警线 amber 1px（半透明）、硬限 red 2px。填充到预警线之前 `series-1`，越预警线填充转 amber，LCD 数字转 amber；越硬限整格边框 red 并进入告警阶梯第 3 级（states.md）。
- 六条默认限额：总敞口/净值 · 保证金占用 · Top-1 集中度 · 行业集中度（显示当前最高的行业）· 1 日 VaR · 日内回撤。可增删，≤ 8 格（超过进表格）。
- 底行：交易锁 LED（off / danger）+ 文字：锁状态 · 限额快照来源与时间 · 接近限额的计数。

## 规则

- **限额只读**，来自账户权威的快照（Query）；前端不能改限额，改限额是账户服务里的操作。
- 当前值由前端用 PositionBook 的聚合与 mark 实时算，和 PositionBook 一样标 `估算` 直到对账。
- 研究账本永不计入。
- 不做仪表盘式 gauge、不做"健康分"、不做颜色从绿到红的渐变——只有三档：正常 / 接近 / 越限。
- 回撤这种"越低越差"的指标，条从左向右表示离限额的接近程度，方向统一（readability §20 一致的映射）。

## 动效 / 音效

- 值变化：条 `gentle` 跟随、LCD 数字滚动；越预警线一次 `radar-ping` + 格子边框 amber；越硬限 `alarm-low` + 交易锁 LED red + 占屏确认由执行网关触发（不是这个面板）。
- 回到正常：不发音，颜色 300ms 退回。

## 谁提供什么

- 组件：limits[]（key、label、scope、current、warnAt、hardAt、unit、direction）、lock（state、since、reason）、snapshotAt。
- 调用方：限额快照（Query）+ 当前值计算器（与 PositionBook 共享聚合器）。

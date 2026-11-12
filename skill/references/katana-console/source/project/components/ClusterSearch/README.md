# ClusterSearch

ATAS 的"扫描器"：按条件在历史与实时足迹里找格子。五个检测器共用一个面板：**Cluster Search**（全参数：Calculation Mode 6 种、Auto Filter、量 / 均量倍数 / 占比、Imbalance / Delta 过滤、K 线方向、Price Location 8 档、高度、时间窗、Days Look Back）、**Big Trades / Adaptive Big Trades**（单笔或聚合大单、分位自适应阈值、Price Location、zones）、**Absorption**（吸收）、**Tape Patterns**、**Exhaustion / Unfinished Auction**。

## 结构

- 左：参数表单（TanStack Form），每个检测器一页，参数可存为预设。
- 右：结果 DataGrid（时间、价位、Bid、Ask、Δ、类型 + 说明），类型用点阵小标签（CLUSTER / BIG / ABSORB / EXHAUST / TAPE）。
- 命中格同时在 Footprint flow 层高亮（描边 + 底色），Big Trades zones 画成价格区间带。

## 交互

- 点结果行 → `ViewChart` 定位到那根 K 线与价位（图表切品种 / 周期如需要）。
- 「存为告警」把当前参数变成 AlertCenter 的订单流规则，命中走告警阶梯；一条检测器 = 一条规则。
- 实时模式：新命中从顶部插入并闪一次；历史模式：按 Days back 批量扫描，进度 Meter。
- 命令：`scan.run / scan.save / scan.alert`。

## 规则

- 计算在 Worker（逐笔 + L2 输入），历史深度取决于后端 tick 历史；不足时结果头部显示"仅 n 日"。
- 无逐笔方向数据时 Bid/Ask 类检测器灰显，不估算。
- Price Location 与 Cluster Statistics 的口径一致（同一个 Worker 聚合器）。

## 谁提供什么

- 组件：detector、params、hits[]、live、range。
- Worker：`scan.*`；后端：tick 历史 Query。

## ATAS 对照

承接 atas.md §2.2 的 Cluster Search、Big Trades、Adaptive Big Trades、Absorption、Exhaustion、Tape Patterns（6 项）。P1。

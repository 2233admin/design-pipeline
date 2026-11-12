# EventTimeline

事件时间轴：把异动、公告、自己的成交、警报命中、run 完成放到一条时间线上，按类别用形状 + 状态色区分（圆 = 异动橙、方 = 公告蓝、三角 = 成交 bid/ask、方 amber = 警报、菱形 = run 绿）。看"今天这只票 / 这个账户发生过什么、先后顺序如何"，点击任意事件把 ReplayBar 定到那一刻。

## 结构

- 顶行：范围（品种 + 账户集合，跟 LinkContext）· 类别开关 Segmented（多选）· 事件数。
- 轴：一条 2px `line-200`，交易时段按 Profile（午休可压缩成一段 `bg-100` 短带，这里压缩是可以的，因为看的是顺序不是斜率）；"现在"橙竖线。
- 事件标记 8px，标签 9px `ink-300` 上下交错避免重叠；同一分钟多事件聚成一个带计数的标记。
- 跨日 / 周视图：轴变成日 × 行的泳道，每行一天。

## 交互

- 点击事件 → ReplayBar 定位 + 对应面板高亮（成交 → FillLog 行、公告 → NewsFeed 行、run → RunInspector）。
- 悬停 → tooltip：时间、类别、内容、关联对象。
- 拖选一段 → LinkContext.range。
- 类别开关切换：标记 opacity 120ms，不重排。

## 规则

- 发光只给异动（StatusLED 预算内，同屏 ≤ 3）；其它标记不发光。
- 买卖用订单流色；盈亏不在这里显示。
- 事件来源各自的流（规则引擎 / 数据平台 / FillLog / run 存储），组件只合并排序。
- ≤ 60 个可见标记，更多先聚合。

## 谁提供什么

- 组件：events[]（ts、kind、label、ref、symbol?、account?）、range、session、kinds、onPick、onBrush。
- 调用方：各事件流（Query / 流）+ Profile。

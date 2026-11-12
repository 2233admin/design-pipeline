# MBOTrackers

ATAS MBO Bundle 的对应：基于逐单（Market-by-Order / L3，带订单 ID 的订单簿事件）的三个 Tracker——**Icebergs**（隐藏量 / 总量 / 持续时间 / 置信度 Absolute 或 Medium）、**Stops**（量 / 时间窗 ms / 价格范围 ticks / 数量区间，5 种高亮样式）、**Sweeps**（主动单数量区间、是否含止损）——加 Activity Panel（事件表）与告警。

## 结构

- 三个 Tracker 卡片：参数照 ATAS；活跃计数在标题。
- Activity Panel：时间（毫秒）、类型（点阵标签）、价位 / 区间、量、置信度（四格）、说明。
- 渲染是**一个渲染器三处挂**：Footprint flow 层 Primitive、DOMLadder 行标记、DOMHeatmap 图层——通过 `ChartSurface` 接口。

## 交互

- 点事件行 → 图表 / DOM 定位；悬停 → 订单 ID 序列摘要。
- 每个 Tracker 可存为 AlertCenter 规则（冰山出现 / 扫单完成 / 止损簇触发）。
- 命令：`mbo.track / mbo.alert`。

## 规则

- **需要 MBO/L3 适配器**（Rithmic 类订单 ID 流；dxFeed 待后端支持）。无源时整板空态「无逐单数据」，**不用 L2 推断伪造**，不降级。
- 事件与行情共享 `instrument.id` 与毫秒时间戳，否则图上定位会落空（Datadog 采样不一致的教训）。
- 历史深度由适配器声明，面板显示可用窗口。

## 谁提供什么

- 组件：trackers{}、events[]、source。
- 后端：MBO/L3 适配器（订单簿逐单事件流）。

## ATAS 对照

承接 MBO Bundle（Icebergs / Stops / Sweeps + Activity Panel + 告警）。P2（压在适配器上）。

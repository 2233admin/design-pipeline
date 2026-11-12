# SparkTile

KPI 瓦片：点阵标签 + LCD 数值 + 24px 迷你折线 + 一行变化说明。总览和面板顶部的"仪表行"。

## 结构

- `bg-200` 单元格 + `hairline`，内距 8×10。
- 标签 `tag`（点阵），数值 `lcd-md`，迷你线 1.5px `series-1`（或 `ink-300` 表示"越低越好"的指标），末点 `signal-orange`。
- 阈值线 1px `signal-amber` 虚线（仅当有上限/下限）。
- 变化行 10px：涨跌用 `pnl-up/down`，说明用 `ink-300`，警告用 `signal-amber`。
- 接近阈值的瓦片边框转 `signal-orange-dim`。

## 交互

- 悬停迷你线 → 小 tooltip（时间、值）；点击瓦片 → 打开该指标的完整图。
- 不可拖拽排序（由面板布局决定）。

## 动效

- 数值变化：数字滚动（`snappy`，≤ 300ms）；迷你线末端延伸。
- 越过阈值：边框 + 变化行同时转 amber，瓦片 2px 脉冲一次。

## 规则

- 一行最多 5 个；更多拆两行或进表格。总览默认把实体折叠成计数（5 在线 · 1 受锁），点开才展开（工作记忆 4±1，§7）。
- 迷你线不画轴、不画网格、不标数值。
- 不用颜色区分瓦片类型，只用标签。

## 谁提供什么

- 组件：label、value、unit、series、delta、deltaTone、threshold、trendTone（series / neutral）。

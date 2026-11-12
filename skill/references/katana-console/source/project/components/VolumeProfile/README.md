# VolumeProfile

成交量轮廓。竖向按价位分布的成交量，POC（最大成交价位）与价值区（默认 70%）。可独立面板，也可叠在 Chart 或 DOMLadder 的成交列上（DOMLadder 的成交列就是它的简化版，两者共用聚合）。

## 结构

- 每行一个价位：价格 `chart-axis`，条用点阵纹理（买 `bid` / 卖 `ask` 拆分，或总量 `seq-300`，或 Delta 用 `div`），右侧数量 `ink-300`。
- POC 行：价格与数量 `poc` 色，行中一条 `poc` 发光线。
- 价值区行底色 `va`（比面板亮一点点）。
- 模式 chip：区间（可见 / 固定起点 / 按日 / 按会话）、拆分（买卖 / 总量 / Delta）。

## 交互

- 悬停行 → tooltip（买、卖、总、占比）；点击行 → 在 Chart 画一条水平线（`poc` 色）。
- 拖动"固定区间"的起止把手 → 实时重算；重算用 `gentle` 弹簧过渡条长。
- 价值区百分比在局部设置（60–80）。

## 规则

- 同一输入下，独立面板的轮廓、DOMLadder 成交列、Chart 叠加层数值必须一致（共用聚合器）。
- 时段边界由 Market Profile 的 calendar 给（午休不算跨日，夜盘归属下一交易日）。

## 谁提供什么

- 组件：levels[{price,bid,ask}]、poc、valueArea、mode、range、onLevelClick。

## ATAS 对照补齐（2026-10-03，atas.md §2.2 Volume profile & TPO）

- TPO 完整版：字母 / Blocks 两种、split / merge、Single Prints、Initial Balance（Minutes / Bars）、Poor High/Low。
- 数据类型 8 种（Volume · Trades · Bid · Ask · Delta · Ticks · Time · TPO）、POC 7 种口径、VA 百分比可配；固定 / 动态 / 复合 / 会话 / 可见区间五种范围。
- 轮廓聚合器是共享 Worker 模块：Footprint 的 Value Area 底色、DrawingToolbar 的体量型对象（Anchored VWAP · Market profile and TPO · Dynamic POC · ZigZag TPO）、IndicatorPanel 的 Dynamic Levels / Initial Balance 全部复用，不各算一份。
- 优先级：P1。

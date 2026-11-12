# DrawingToolbar

33 类绘图对象（ATAS 的全集）作为 `ChartSurface` 上的 Primitives 插件：几何（趋势线、角度线、水平/垂直线、射线、十字线、通道、矩形、椭圆、三角、画笔、文本、仓位标记、艾略特波）、斐波那契（回撤 / 扩展 / 扇）、测量（Ruler / Measure），以及**体量型对象**：Anchored VWAP、Market profile and TPO、Dynamic POC、CVD correlation、ZigZag TPO and Profile——后者共用 VolumeProfile 的轮廓聚合器。

## 结构

- 左侧工具条（可折叠为一行）；右侧对象列表：名称、周期掩码、Global / Locked / Hidden 三个开关。
- 对象按 `instrument.id` 存在 Pane.state；**Global** 对象升级到 instrument 级存储，同品种的 PriceChart、Footprint flow 层、DOMLadder、DOMHeatmap 通过 `ChartSurface` 各画一份（= ATAS 8.0.15"全局对象进 Smart DOM"）。
- 每个对象有周期掩码（只在某些周期显示）、Locked（不可拖）、Hidden（不画但保留）。

## 交互

- 磁吸（吸附 OHLC / 档位）、连续绘制（Keep Drawing）、⌘Z / ⌘C / ⌘V、Save As Default（新对象默认样式）。
- Horizontal Line 的"接近告警"是 AlertCenter 的绘图源：对象本身带告警位，命中走告警阶梯。
- 对象列表行点击 = 选中并滚到对象；右键：复制到另一周期 / 转 Global / 删除。
- 命令：`draw.<tool>`、`draw.global`、`draw.lock`、`draw.hide`、`draw.clear`。

## 规则

- 绘图只针对 `ChartSurface` 接口（priceToY · xOf · hitTest · invalidate）写一次，LWC 适配器与自研 Canvas 图层各实现一份；绘图层不知道底下是哪种图。
- 切换品种不销毁对象（按 instrument 存），只切换可见集合——NinjaTrader 丢告警的反面教训。
- 体量型对象的数据来自 Worker 轮廓聚合器，不在绘图层重算。

## 谁提供什么

- 组件：objects[]、tool、magnet、keepDrawing、surface。
- 前端：Pane.state / instrument 级存储；Worker 轮廓聚合器。
- 后端：无。

## ATAS 对照

承接 atas.md §2.3 全部 12 行（33 个对象 + 管理功能）。第一阶段（P0）：几何 + 斐波那契 + Ruler + Anchored VWAP + Global/Locked/Hidden；P2：ZigZag TPO and Profile、CVD correlation。

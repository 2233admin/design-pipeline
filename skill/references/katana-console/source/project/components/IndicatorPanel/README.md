# IndicatorPanel

ATAS Indicator Manager 的对应。三栏：分类 / 收藏 · 搜索 + 列表 · 预览 + 参数。指标在 Worker 计算（逐笔 + L2 + K 线输入），PriceChart 只画线、Footprint flow 层只画格、DOMHeatmap 指标层只叠加——面板不持有任何算法。

## 结构

- 左栏分类沿用 ATAS 的营销分组再加三类：收藏（默认页）· Bid × Ask / Delta / Volume · Clusters / Profiles / Levels · Order Flow · 订单簿 · 热力 · 期权 · Technical · COT。每类带计数。
- 中栏搜索即过滤；每行显示指标名与**落点**（副图 / 叠加 / 标记 / flow / 统计行 / FlowGauges），用户先知道加到哪。
- 右栏预览用**当前图的真实数据**（不用示意图）；参数页按指标定义生成；Data 页固定三项：输入源（Volume / Ticks / Bid / Ask）、Session reset（None / Default / Custom）、历史深度。
- 同一指标可多实例，各自参数与颜色（`series-n` 顺序分配）；实例数不限（ATAS 的每图上限是资费产物，不借）。
- 面板透明度、模板（Save / Default / Export / Favorites）走 Workspaces 的 PanelSpec 模板。

## 交互

- 双击或「添加到图」挂到当前 LinkGroup 的图表；拖到另一面板 = 挂到那张图。
- `★` 进收藏；收藏页是默认页，压学习曲线。
- 指标行右键：添加 / 添加为副图 / 查看文档 / 复制参数。
- `indicator.add / remove / set` 命令；GO Bar 直接 `cvd session=none`。

## 规则

- 指标注册表是前端的一张静态表（名称、分类、落点、参数 schema、算法入口）；开源算法（ATAS 官方仓 MIT）直接移植到 Worker，闭源的（Big Trades、Absorption、Breakout and Retest、Volume profile & TPO、DOM levels）按文档参数自研并标 `KATANA 实现`。
- 需要外部数据的指标（OI、期权、Coinglass 类）在列表里显示数据源 LED；无源时灰显，不隐藏。
- 指标输出永远带 `asOf` 与输入源标记；估算的（无逐笔方向时）显示 `估算` 角标。

## 谁提供什么

- 组件：registry、instances[]、target(chartId)、search、favorites。
- Worker：`indicator.compute(id, params, inputs)` → series / marks / cells。
- 后端：仅外部数据类指标的 Query（OI、期权链、外部比率）。

## ATAS 对照

承接 46 个 order-flow 指标中除 Cluster Search（→ ClusterSearch）、MBO（→ MBOTrackers）、Widgets（→ FlowGauges）外的全部，以及 231 个 technical、14 个期权、6 个热力指标的入口。首批 12 个（P0）：Volume · Delta · CVD · VWAP/TWAP · Volume profile · Big Trades · Cluster Statistics · Speed of Tape · Open Interest · Depth Of Market · Maximum Levels · Imbalance Ratio。详见 atas.md §2.2。

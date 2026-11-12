# 技术栈与 TanStack 分工

> 完整的轮子清单与分档（采用 / 候选 / 参考 / 不用）在 wheels.md；本页只写已定的分工。**2026-10-03：K 线底盘定为自研 `@katana/chart`（经 lightweight-charts → Vela 样机 → 自研，engineering §2.2）。** 新增：XState（业务状态机）、Arrow + DuckDB-WASM（列式数据与浏览器内 SQL）、uPlot（非 K 线的序列图）、@number-flow（展示性数字滚动）、dnd-kit、xterm.js（CLI 模式）；候选：Glide Data Grid（DataGrid 内核备选，Spike C 并排测）。

设计系统不是只有样式；每个组件背后用什么库、库之间的边界在哪，写在这里，agent 实现时照此分配，不自行选库。

## 总表

| 层 | 库 | 用在 | 不用在 |
|---|---|---|---|
| 交互基元 | **Base UI** | Dialog / Popover / Menu / Select / Slider / Checkbox / Tabs / Tooltip 的行为与无障碍 | 布局、样式 |
| 动效 | **Motion** | 弹簧、手势、可打断动画、橡皮筋（motion.md） | 颜色 / 透明度过渡（CSS 120ms） |
| 音效 | **Howler.js** | `sound.ts` 的 `play(id)`、预加载、分类音量 | 组件直接调用 |
| 命令面板 | **cmdk** | CommandLine 的解析与建议列表 | 其他列表 |
| K 线主图 | **`@katana/chart`（自研，Canvas 2D；WebGL2 P2）** | PriceChart：序号轴坐标系 / 多 pane / K 线 · 柱 · 线 · 面积 · HA · 足迹 / 绘图 / 十字线读数 / 历史分页 / 回放画面；DOMLadder · DOMHeatmap · ChartTrader 共用 `ChartSurface`（engineering §2.2）；参考 TradingView 与 Vela 的语义与架构，不引代码 | 数据拉取与指标计算（后端）、研究序列图 |
| 研究序列图 | **uPlot** | EquityCurve / FactorIC / QuantileLayers / IntradayPnL / 迷你线 | K 线 |
| 订单流与热力 | **自研 Canvas 2D**（WebGPU 可切） | DOMHeatmap / Heatmap 大数据；Footprint 的 ChartSurface 参考实现（方案 B 兜底） | — |
| 指标脚本 | **PineTS**（候选，AGPL，仅后端 Node sidecar） | 经典 Pine 指标语料经 RemoteEngine 端口上图 | 浏览器内执行；订单流指标（Python SDK） |
| 图标 | **Lucide** | 基础图标 | 控制台专用（自绘） |

## TanStack 分工

| 包 | 用在 | 边界 |
|---|---|---|
| **Table** | DataGrid 的 headless 模型：列定义、排序、筛选、分组、行选择、列配置；DOMLadder / SmartTape / 自选 / 持仓 / 研究结果 / 因子库全部基于它 | 不做虚拟化（交给 Virtual），不做样式 |
| **Virtual** | 所有超过一屏的列表与表格的行虚拟化；SmartTape 每秒上千行；DOMLadder 几百档；Heatmap 的列虚拟化 | 预渲染上下各 8 行；不用于图表 canvas |
| **Pacer** | rAF 合并（`rafThrottle`）、Tape 批量追加、搜索防抖、Meter / LCD 的高频降频、滚轮缩放节流 | 不用于行情 Worker 内部（那是 ring buffer 的事） |
| **Query** | "问一次拿一份"的服务端状态：研究结果、回测报告、因子库、账户快照、数据覆盖；缓存、失效、重连重取、后台刷新；错误态由它驱动 states.md 的错误/过期 | **行情永远不进 Query**；订单事实的权威是账户服务，Query 只缓存投影 |
| **Form** | 参数编辑区：从 PanelSpec.settingsSchema 生成表单，校验、修改态、应用 / 取消 / 恢复默认 | 字段控件用 Controls；不做交易确认（那是核心 Dialog） |
| **Router** | deep link：`/w/:workspace/p/:pane?symbol=&tf=&replay=`；OpenAlice 回跳到研究现场；回放时间可分享 | 不做面板状态（在 Pane.state） |

## 两条硬边界

1. **流 vs 问**：Quote Hub → Worker → MarketAPI 是"流"，TanStack Query 是"问"。一份数据只能走一条；行情、逐笔、L2 走流；研究、账户快照、配置走问。
2. **投影 vs 事实**：Table / Query / Form 里的都是投影；账户、订单、研究验证的事实在服务端，前端改动必须经命令与确认。

## 组件 ↔ 库对照

| 组件 | Base UI | Motion | Table | Virtual | Pacer | Query | Form | @katana/chart | Canvas |
|---|---|---|---|---|---|---|---|---|---|
| PanelFrame / Splitter / WorkspaceTabs | | ● | | | | | | | |
| Toggle / Controls / Overlays | ● | ● | | | | | ● | | |
| LCDReadout / Meter / StatusLED / SparkTile | | ● | | | ● | | | | |
| CommandLine | ● cmdk | ● | | | ● | | | | |
| DataGrid | | ● | ● | ● | ● | ● | | | |
| DOMLadder / SmartTape | | ● | ● | ● | ● | | | | |
| PriceChart / Footprint（flow 层）/ ChartTrader / DrawingToolbar / IndicatorPanel | | ● | | | ● | | | ● | |
| EquityCurve / FactorIC / QuantileLayers | | ● | | | | ● | | uPlot | |
| Heatmap / DOMHeatmap / VolumeProfile | | ● | | ● | ● | | | | ● |
| ReplayBar | | ● | | | | | | | |

## 版本与许可

Base UI、Motion（MIT）、Howler（MIT）、cmdk（MIT）、TanStack 全家（MIT）、`@katana/chart` 自研（无第三方署名）、uPlot（MIT）、Lucide（ISC）。全部可随 GPL 项目分发；PineTS / vela-pinets 为 AGPL-3.0，与 GPLv3 可组合、与 GPLv2-only 不可，许可证未定前只参考（spec.md §8）；新增依赖须经人批准（hook 拦截 `pnpm add`）。

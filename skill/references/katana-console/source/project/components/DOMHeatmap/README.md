# DOMHeatmap

盘口历史热力图（ATAS Heatmap / Bookmap 式）。横轴时间、纵轴价格，每个格子 = 该时刻该价位的挂单量，用 `seq-100..600` 顺序色阶；成交画成气泡（大小 = 数量，`bid` / `ask` 色），现价一条 `poc` 发光线。自研 Canvas 2D，WebGPU 可切。

## 结构

- 左侧价格轴 `num-sm` `chart-axis`；底部时间轴；无网格（热力本身就是网格）。
- 挂单量映射到色阶用对数，上限按可见区间 99 分位（极值用 `seq-600`）。
- 撤单：格子由亮变暗，留 1 格余晖（上一格色 × 50%），便于看"撤单留痕"。
- 成交气泡半径 4–14px，中心 `ink-100` 1px 描边与底色分离。
- 图例一行：色阶、买卖气泡、现价线、操作提示。

## 交互

- 滚轮时间缩放、⇧+滚轮价格缩放、拖动平移，都有橡皮筋；双击复位到"最近 5 分钟 + 现价居中"。
- 悬停格 → tooltip（时间、价位、挂单量、该格的变化）；悬停气泡 → 成交明细。
- 右键：价格档位聚合、时间粒度（100ms / 500ms / 1s）、色阶上限锁定。
- 十字线与同 LinkGroup 的 Chart、Footprint 同步。

## 状态

- 无 L2 历史：显示"无深度历史"空态；只有实时时从现在开始累积，左侧为空不补假数据。
- 回放模式：接回放时钟，右上角 `REPLAY` amber 标识。

## 规则

- 顺序色阶永远单色橙，不用彩虹；成交与挂单是两套视觉（气泡 vs 格），不混。
- 高频：每帧最多重绘一次，新列用 `snappy` 从右侧推入，高负载时直接赋值。

## 谁提供什么

- 组件：snapshots（列式：t[], price[], qty[]）、trades、last、tick、timeBucket、domain。
- 数据：MarketAPI L2 增量；历史由数据中心按需回补。

## ATAS 对照补齐（2026-10-03，atas.md §2.9）

- 三数据模式：Heatmap by Volume / Trades / Delta。
- 指标层：CVD · Market Pressure · Price Change · OHLC Plus（O/H/L/C/Equilibrium/POC/VWAP/VAH/VAL）· Value Area · VWAP，复用 Worker 指标输出，画在同一价格轴。
- 价格轴锁定（Perfect Sync）：LinkContext `priceRange` 槽位，与 PriceChart flow 层、DOMLadder 三方同步缩放滚动。
- 历史：**后端 L2 历史录制适配器**声明可用天数，面板显示窗口；全屏模式 + `heatmap.*` 热键组；MBOTrackers 事件作为图层叠加。
- **3D 模式**（ATAS 3D mode 对等）：作为 DOMHeatmap 的一个视图模式——时间 × 价格 × 挂单量的高度场（WebGL / WebGPU 栅格后端），同一份数据、同一价格轴锁定（`priceRange`），默认 2D，切换走 `heatmap.view 3d`；不做可旋转的装饰视角，仰角固定两档，仍遵守单色序列。配色：两套内置 + 用户自定义单色序列。渲染维持自研 Canvas 2D，WebGPU / WebGL2 栅格后端提为 P1（3D 依赖它）（engineering.md §2.2）。

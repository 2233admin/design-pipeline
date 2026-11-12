# 布局与工作区网格

外壳不是 docking。Workspace 标签 → split 树 → Pane。这页定面板怎么排、多大、缝多宽、大屏模式怎么变。

## 外壳尺寸

| 区 | 高 / 宽 | 说明 |
|---|---|---|
| 顶栏 | `rail-h` 48 | logo · 工作区标签 · 系统灯 · 市场时钟 |
| 底栏 | 44 | 命令行 · 快捷键 · SOUND / QUIET 拨杆 |
| 面板缝 | `space-3` 12（大屏 `space-8` 32） | 缝就是地面 `bg-100` |
| 面板最小 | 240 × 160 | 分割线拖不过；低于时面板显示"太小"占位 |
| 面板标题栏 | 32 | 见 PanelFrame |

## 布局模板

| 模板 | 结构 | 默认用途 |
|---|---|---|
| `1x1` | 一格 | 全屏图表 / 大屏地图 |
| `2x1` | 左右 | Chart + DOMLadder |
| `1+2` | 左一大，右上下 | Chart + Watchlist / Positions |
| `2x2` | 四格 | Desk 默认：Watchlist / Chart / DOMLadder / Positions |
| `3x2` | 六格 | 多标的监控 |
| `1+3` | 左一大，右三小 | 研究：主图 + IC / 分层 / KPI |
| `T` | 上一横，下两格 | 总览：地图 + 策略 / 资金 |

模板只决定树的形状，比例可拖；双击分割线回到模板比例。

## 密度与面板类型

| 面板 | 密度 | 最小尺寸 |
|---|---|---|
| Watchlist / Positions / Orders | tight 24 | 240 × 160 |
| DOMLadder / SmartTape | tight 22（专用） | 280 × 240 |
| Chart / Footprint / Heatmap | — | 320 × 200 |
| 研究结果 / 因子库 | base 28 | 320 × 200 |
| 设置 / 参数 | loose 36 | 320 × 240 |

## 大屏模式

- 顶栏变 56，底栏隐藏（⌘K 仍可唤起），缝 32，面板标题栏隐藏只留色标。
- 所有编辑控件隐藏；敏感金额可一键遮蔽（显示 `¥ ●●●`）。
- 字号整体 +1 档（12 → 13，26 → 28）。

## 响应

- < 1280：2×2 自动变 1+2 或堆叠，Watchlist 折成抽屉。
- < 768（手机只读）：单列，面板变 tab；不提供下单；Footprint / Heatmap 不提供。

## 规则

- 面板不能自己决定位置和尺寸；只能声明 `minSize` 和 `density`。
- 不做壳内浮窗、面板级 tab、边缘吸附。多显示器：开第二个浏览器窗口载入另一个 Workspace，**或把任一面板「弹出到新窗口」**——弹出的面板仍属原工作区与联动组，上下文经 BroadcastChannel 同步，关闭窗口即回到原位（atas.md §0）。
- **钉住面板**（pinned pane）：StatusBar 之外允许最多 2 个面板钉住后跟随所有工作区（如 AlertCenter、DecisionQueue），对应 ATAS 的 Universal 层。
- 布局 JSON 版本化；旧版本导入失败保留原文件并给占位。

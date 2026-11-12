# DotMatrix · 点阵与签名标本

点阵体系（pixel.md）与控制室签名元素（signature.md）的标本页。它不是一个组件，是"硬件感"的所有零件放在一起看一眼：LED 时钟、六角灯阵、三方表决、同步率条、波形带、斜切 + 密排大字、角括号、L4 警示带。LCDReadout、StatusLED、Meter、PanelFrame、Overlays 各自取用其中一两样。

## 角色（点阵）

| 角色 | 字体 | 尺寸 | 用在 |
|---|---|---|---|
| `led-md / led-xl` | Sixtyfour（BLED / SCAN 轴） | 20 / 32 | 顶栏时钟、延迟、大屏时钟、开盘自检 |
| `led-ticker` | Workbench | 16 | 底栏异动跑马、LED 矩阵内文字 |
| `tag` / `tag-cn` | Doto / 方舟像素 12 | 9 / 12 | 标签、型号、LCD 标题 |
| `dot-md` | Doto / 方舟像素 16 | 16 | 面板级点阵标题 |
| `dot-display` | Jersey 25 / 方舟像素 16 ×2 | 40 | 总览大屏标题、Workspace 名 |
| `display-dense` | Barlow Condensed 800 | 56 / 50 | 大屏 KPI、占屏确认关键数（签名） |
| `dot-5` / `dot-micro` | Tiny5 / Micro 5 | 10 / 5 | 刻度 |

## 签名元素（各一例）

- **六角灯阵**：StatusLED 矩阵的 `hex` 形态，16×14 六边形、2px 缝、奇偶列错位 7px；异动灯阵、板块热度、门矩阵用它。亮灯预算同 StatusLED（≤ 3 发光）。
- **三方表决 ConsensusBlock**：三格斜切块，GATEWAY · ACCOUNT · RULES 各一灯一短句，下方一行结论。OrderTicket / OrderBasket / DeploymentBoard 推进用。
- **同步率条**：Meter 的 `sync` 形态——分段齿条 + amber 刻度（评估点）+ 右侧密排大百分比。paper 进度、容量使用、偏离门距离。
- **波形带**：1px `signal-green` 心电式折线，右进左出；只给系统体征（延迟 / 帧时），永不给价格或盈亏。
- **密排大字块**：`bg-100` 斜切块，右上点阵橙标签，56px 数字，一行小字口径。大屏 KPI。
- **角括号**：四角 10px L 线，标"当前对象"；一屏一组。
- **L4 警示带**：顶部 10px 斜切条纹 + 点阵标题 + 三行事实逐行点亮（第三行是"能做什么"）。核心界面。

## LED 字的动效

- 点亮 BLED 0 → 60 `snappy`；时钟秒位每秒瞬间 60 回 30；跑马 BLED 随速度 20–60；呼吸只给 danger（40 ↔ 70，2s）；安静模式 BLED 30、SCAN 0。
- 签名元素本身不动：条纹、括号、斜切、六角都是静态；只有灯和数字变。

## 规则

- 整数倍、关抗锯齿、不加字距、不伪粗、像素网格对齐（pixel.md §2）。
- 一个面板 ≤ 1 个签名元素；一屏 ≤ 1 组括号、≤ 1 条警示带；扫描线只在大屏 / 自检 / 回放（signature.md §2）。
- 中文点阵未载入时回退 `sans` 并在页脚显示 `字体回退`。
- 不引入日文、假名或任何第三种文字做装饰；不做旋转瞄准环、雷达扫描、故障艺术。

## 谁提供什么

- token：`border.chamfer-8` · `border.bracket` · `shadow.hazard` · `shadow.scanline` · `type.display-dense`。
- 字体：Google Fonts 六个自托管子集；方舟像素、缝合像素由 `fonts/` 提供。

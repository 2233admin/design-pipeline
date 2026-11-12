# 图标

一套基础图标 + 12 个控制台专用图标。全部线性、16px 网格、1.5px 描边、方头、不填充；颜色永远 `currentColor`，由文字 token 决定。

## 基础：Lucide

- 来源 Lucide（ISC 许可，可随 GPL 分发），16px，`stroke-width: 1.5`，`stroke-linecap: square`（改掉 Lucide 默认的圆头，贴工业感）。
- 只用这些：settings（齿轮）、maximize、x（关闭）、table（表格视图）、download、search、filter、chevron-down/right、play、pause、skip-back/forward、link（联动）、pin、plus、refresh、alert-triangle、check、lock、unlock、eye / eye-off（遮蔽金额）、layout-grid（模板）、terminal（命令行）。
- 不用：表情类、填充类、品牌类。

## 控制台专用（自绘，`assets/icons/console/`）

| 名 | 画法 | 用在 |
|---|---|---|
| `led` | 8px 实心圆 | 状态（这是唯一允许填充的"图标"） |
| `ladder` | 三横两列 | DOMLadder 面板 |
| `tape` | 竖向三行带箭头 | SmartTape |
| `footprint` | 2×3 格 | Footprint |
| `heat` | 3×3 格渐变点 | Heatmap / DOMHeatmap |
| `profile` | 左对齐横条三根 | VolumeProfile |
| `replay` | 圆箭头 + 竖线 | ReplayBar |
| `gate` | 五个小圆横排 | 五道门 |
| `fleet` | 三角 + 底线 | 策略实体 |
| `lcd` | 圆角矩形 + 两短横 | 读数 |
| `rivet` | 小圆 + 内高光 | 装饰，不作图标语义 |
| `quiet` | 波形被横线穿过 | 安静模式 |

## 规则

- 图标按钮 22 或 28px，必有 `aria-label`；图标不单独承载状态，旁边必有文字或 LED。
- 面板标题栏左侧不放图标（色标已经占位），只在命令建议和面板选择器里出现。
- SVG 作为内联 `<svg>` 使用（继承 currentColor）；`<img>` 只用于装饰。
- 图标文件就位后登记到 `assets/icons/`，命名 `console-<name>.svg`。

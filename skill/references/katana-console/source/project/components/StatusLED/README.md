# StatusLED

> 只表达真实业务状态：无业务依据不亮绿，不为"显得在线"闪烁；布尔字段不自动变灯（engineering.md §6）。
> 矩阵新增 `hex` 形态（16×14 六边形、2px 缝、奇偶列错位 7px），异动灯阵 / 板块热度 / 门矩阵默认用它；预算与圆点矩阵相同（signature.md）。

指示灯。8px 圆点，五种状态：`off`（`led-off`，带内阴影）、`on`（orange + glow）、`ok`（green + glow）、`warn`（amber + glow）、`danger`（red + glow）。也可以排成点阵矩阵（异动灯阵、门序列）。

## 用在哪

- 顶栏三个系统灯：QUOTE / EXEC / ALICE。
- 策略条目左侧：运行状态。
- 五道门序列：5 个灯，通过 ok、当前 on、未过 warn、未到 off。
- 异动灯阵：8×N 矩阵，命中亮 on，需处理亮 warn。

## 预算

- **LED 默认 off**；正常 = 没有亮灯（弹出不对称，readability §20）。只有活的才亮：运行中、命中、异常。
- 每屏发光体 ≤ 3（含时钟、拨杆开态）；面板内同时亮的 LED ≤ 4（工作记忆）。
- 周边视野里的提示靠**亮度变化**而不是颜色（§16）：异动灯阵点亮时亮度从 0 到满，颜色只是附加。

## 动效

- 点亮：从 `led-off` 用 `snappy` 弹簧到目标色，glow 从 0 到 6px；播对应音效（见 sound.md）。
- 熄灭：60ms 线性淡出，无音效。
- 不闪烁（≤ 2Hz、≤ 3 次是硬上限）。需要持续告警用 2s 周期（0.5Hz）的 20% 亮度呼吸，且只给 `danger`；安静模式关闭呼吸。

## 规则

- LED 必须配文字标签或 `aria-label`，不单靠颜色。
- 一个状态只对应一种颜色；不要用 orange 表示"正常"。

## 谁提供什么

- 组件：state、label、size（8 / 6）、breathing。
- 矩阵：cells（state[]）、cols。

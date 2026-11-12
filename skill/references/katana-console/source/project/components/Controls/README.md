# Controls

表单与操作基元的皮肤：Button、Input、Select、Slider、Checkbox、Segmented。交互与无障碍由 Base UI 提供（Select、Slider、Checkbox 用它的基元；Button 与 Input 是原生元素），本系统只定外观、四态和弹簧。参数表单由 TanStack Form 从 `settingsSchema` 生成，字段渲染用这里的控件。

## 共同规则

- 高度 `control-h` 28px = `target-min`（费茨定律：高频目标 ≥ 28 且靠近内容；危险操作可小可远）；圆角 `radius-sm` 2px；文字 `label`（display）或 `num`（mono）。
- 四态必须全有：hover `bg-400`；focus-visible 2px `focus-ring` 外环（Input 用内发光 25% orange）；active 下沉 1px；disabled 40% 透明 + not-allowed。
- 错误：边框 `#5a1f1f` + 红色 20% 外环 + 下方 `caption` 红色说明，说明写"需要什么"而不是"错了"。
- 帮助文字 `caption` `ink-300`，带单位与范围。

## 各控件

- **Button**：金属按键（上高光 + 底 1px 厚度）。主按钮 `signal-orange` 文字 + 暗橙底；危险按钮红色文字；图标按钮 28×28。按下播 `key-down`。
- **Input**：凹陷 LCD 风（`bg-000` + recess）；数值输入用 `mono` + tabular-nums；右侧可放单位。
- **Select**：按钮样式触发器 + Base UI Popover 列表（见 Overlays）。
- **Slider**：凹槽轨 + 点阵填充 + 发光圆把手；拖动跟手，松手 `settle` 吸附到步进；键盘 ←→。
- **Checkbox**：14px 凹陷方框，选中后中心 6px 橙色发光方块（像一颗 LED）。
- **Segmented**：周期、模式切换；选中项 `bg-000` 凹陷 + 底部 2px orange，切换时下划线 `snappy` 滑移。

## 规则

- 开关类（启停）用 Toggle 不用 Checkbox；多选用 Checkbox。
- 不做 Radio 圆点；两到五个互斥选项用 Segmented（≤ 5，希克定律），更多用 Select。
- 表单"应用 / 取消 / 恢复默认"三按钮固定在参数区右下，修改未应用时主按钮亮。

## 谁提供什么

- 组件：标准 props + `tone`（default / primary / danger）、`size`（28 / 24）、`error`、`help`。

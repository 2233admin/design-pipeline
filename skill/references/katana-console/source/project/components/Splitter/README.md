# Splitter

> 拖动中**无弹簧追赶、无惯性**；松手不改用户选定的精确尺寸（吸附只在 6px 内且可关）；方向键 8px 步进、尺寸范围、可访问名按 WAI-ARIA Splitter 模式；含 canvas 的面板 resize 用终值一次性，不用 Motion `layout`（engineering.md §5）。

分割线。split 树里每条边一个。这是"手感"最集中的组件，参数由人调。

## 外观

- 命中区 8px，可见线 1px `line-100`；中央 16×2 的 grip `line-200`。
- hover：线 `line-200`。
- 拖动中：线 2px `signal-orange` + glow，grip 同色；两侧面板实时重排。
- 键盘焦点：2px `focus-ring`。

## 交互（Apple 式）

- **跟手**：拖动零延迟，用 `transform` 预览，松手才提交比例。
- **吸附**：靠近 1/2、1/3、2/3 时 6px 内吸附，吸附瞬间线体 1px 脉冲 + 播 `snap`。
- **最小尺寸**：拖过 `minPaneSize`（默认 160px）进入橡皮筋：实际位移 = `d × 0.55 / (1 + d / 220)`；松手 `settle` 弹回边界。
- **双击**：复位到 1/2（或模板默认值），`gentle` 弹簧。
- **键盘**：← → ↑ ↓ 每次 8px，Shift 加速 32px。

## 规则

- 分割线不可拖出新面板、不可拖到边缘分裂——不是 docking。
- 拖动时不触发面板内部重渲染（面板用 ResizeObserver 节流到 rAF）。

## 谁提供什么

- 组件：orientation、ratio、minPaneSize、snapPoints、onChange、onCommit。
- 待人工调整的参数（实现时留 props，不定终值）：snapThresholdPx、rubberBand 系数、settle 弹簧、grip 显示时机。

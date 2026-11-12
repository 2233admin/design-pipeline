# Toggle

> 视觉落位 ≠ 后台生效：异步设置显示 `处理中` 纹理，失败弹回 + 原因（engineering.md §5）。

拨杆开关。所有"启停"用它：策略启停、音效、安静模式、模拟/实盘账户模式、监控规则启用。

## 外观

- 槽 34×18，`bg-000` + `shadow.recess` + `hairline`；开态槽 `#3a1e0e` + `signal-orange-dim` 边。
- 滑块 12px：关态 `line-200`，开态 `signal-orange` + `shadow.glow-orange`。
- 标签在左，`mono` 9px 大写字距 0.12em（控制台语境）或 `body` 12px（设置语境）。

## 交互（Apple 式）

- 点击切换：滑块 `snappy` 弹簧到对侧，到位播 `toggle-click`，对应 LED 同步。
- **拖动**：滑块跟手；拖过槽端橡皮筋；松手按速度投影，超过 40% 行程即切换，否则 `settle` 弹回。
- 键盘：Space / Enter 切换；焦点环 2px `focus-ring`。
- 禁用：整体 40% 透明，光标 not-allowed，不响应拖动。

## 规则

- 账户模式（模拟/实盘）切换的拨杆外观相同，但切换后必须二次确认，确认框不配音效。
- 一个面板里拨杆不超过 6 个；多了用设置页。

## 谁提供什么

- 组件：checked、onChange、disabled、label、size（默认 34×18，紧凑 28×14）。
- 调用方：不传动效参数；弹簧取 `snappy` / `settle` 预设。

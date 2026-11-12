# CommandLine

底栏命令行（GO Bar）。GUI、快捷键、CLI、MCP、OpenAlice 调的是同一张命令表；这里是人的入口。

## 外观

- 底栏 44px，`bg-300` + 2px 顶厚度。
- 输入是一个 LCD 窗：`bg-000` + `shadow.recess`，左侧 orange `>`，右侧显示命令的 `sideEffect`（view / write）。
- 聚焦：边框 `signal-orange-dim` + 2px 25% orange 外环。
- 建议列表从底栏**升起**（`gentle`，scale 0.96 → 1，y +8 → 0），`bg-400` + `shadow.lift` + `radius-md`；当前项 `bg-000` + 左侧 2px orange。
- 写操作的建议右侧标 `WRITE · 需确认`（amber），执行前必走确认。

## 交互

- ⌘K 聚焦；Esc 收起；↑↓ 选择；Tab 补全；Enter 执行。建议列表 ≤ 8 条（希克定律）。
- 执行成功：输入框闪一次 orange（60ms）+ `cmd-ok`；失败：抖 2px + `cmd-err`，错误文字在同一行显示，不弹窗。
- 命令参数用 cmdk 的解析；建议来自命令注册表的 `input` schema。

## 规则

- 命令行不执行任何绕过确认的 write 操作。
- 同一命令在 GO Bar 和 CLI 的参数格式一致：`<command.id> <args…>`。

## 谁提供什么

- 组件：commands（注册表）、onRun、recent。
- 调用方提供命令表；组件不内置任何命令。

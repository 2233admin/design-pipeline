# WorkspaceTabs

顶层工作区标签。Workspace 模型里唯一的 tab：切换整个工作现场（总览 / Desk / Lab / 组合 / 运行 / 用户自建）。面板级没有 tab。

## 外观

- 顶栏 48px（`rail-h`），`bg-300` + 2px 底厚度 + 1px 顶高光。
- 每个标签：`display` 14px 600 大写字距 0.06em，右侧 `mono` 9px 快捷键提示 `ink-400`。标签之间 1px `hairline`。
- 当前标签：`bg-000` 凹陷 + 底部 2px `signal-orange` 内阴影 + `ink-100` 文字——"按下去的键"。
- hover：`bg-400`，文字 `ink-200`。
- 最右：新建工作区（+）。

## 交互

- 切换：orange 下划线用 `snappy` 弹簧从旧标签滑到新标签（不是消失再出现）；内容区交叉淡入 120ms；播 `tab-slide`。
- 拖动排序：标签跟手，其他标签 `gentle` 让位，松手 `settle`。
- 右键：重命名、复制、关闭、设为启动。
- 键盘：⌘1–9 直达；Ctrl+Tab 循环。

## 规则

- 标签文字不超过 8 个汉字 / 12 个字母，超出截断加 title。
- 不做标签溢出滚动；超过 9 个工作区时右侧折叠进菜单。

## 谁提供什么

- 组件：workspaces[{id, name, hotkey}]、activeId、onSelect、onReorder、onCreate。

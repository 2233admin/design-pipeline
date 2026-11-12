# AliceSessions

OpenAlice 会话投影：每个会话的目标、当前任务、在等什么（run / GPU / 人 / 时间）、产出（run / 评估 / 报告）。KATANA 不管理会话，只显示；要和 Alice 对话走 GO Bar 的 `ask #id` 命令。"等人决定"的会话是运行中心最重要的一行——它会在总览亮一盏灯。

## 结构

- 顶行：状态 Segmented（活跃 / 等待 / 今日完成）· 连接灯与 MCP 工具数 · 右侧"继续会话"提示。
- 列：状态 LED（on 跑 / warn 等人 / ok 完成）· 会话 id · 目标（主句 + 小字背景）· 当前任务（含 run 蓝标、进度）· 等待（什么 · 多久，等人 amber）· 产出计数或链接。
- 定时会话（收盘摘要、每日压力）显示下次时间。
- 完成的会话 `ink-300`，保留当日。

## 交互

- 每个会话三个控制动作（参考 Oh My Pi 的 Agent Hub）：**注入指令**（steering，追加一条给该会话）· **唤醒**（parked / 等待中的会话）· **终止**（stuck）。注入是 `ask` 命令带会话 id；终止是写命令（会话有未完成 run 时走确认）。

- 点击会话 → 展开任务树（已做 / 在做 / 待做）与评估文字（标来源）。
- 点击 run → RunInspector；点击"等人决定" → 展开问题与选项，回答 = `ask` 命令带会话 id（写副作用取决于问题，通常 none）。
- 「新会话」→ GO Bar 预填 `ask`。

## 规则

- 会话、任务、评估全是 OpenAlice 的事实；前端不缓存超过会话寿命。
- 等人的会话超过 4h 升告警阶梯 L2（常亮，不闪）。
- 不显示 token 用量、费用——那在 AgentsStatus。
- 评估文字标 `alice · session · 时间`。

## 谁提供什么

- 组件：sessions[]（id、goal、context、task、waitingOn、waitSince、outputs[]、state、nextAt）、onOpen、onAnswer。
- 调用方：OpenAlice 会话 API（Query + 流）。

# AgentsStatus

代理状态：OpenAlice 用的 LLM 提供方（可用灯、延迟、今日用量 / 额度、费用）与 MCP 服务器（工具数、最近调用、错误）。Fincept「Agent Config / MCP Servers」的只读版——配置在 OpenAlice，KATANA 只看。

## 结构

- 左框 LLM 按**角色槽**分组显示路由（default / plan / task / advisor / vision / tiny …，参考 Oh My Pi 的十槽模型），每槽当前提供方 + fallback 链；
- 左框 LLM：灯 · 提供方 · 延迟 LCD（p50）· 今日用量 Meter（≥ 90% amber）· 今日费用。本地模型费用 —。
- 右框 MCP：灯 · 服务器 · 工具数 · 最近调用（时间 + 命令名）· 错误计数（> 0 amber + 原因）。
- `katana-commands` 是 KATANA 自己暴露给 Alice 的命令表——它在这里出现证明同源性成立。

## 交互

- 点击提供方 → 展开：模型列表、每模型用量、最近 10 次调用的会话 id。
- 点击 MCP 服务器 → 工具列表与最近错误日志。
- 断开的服务器 → 「重连」（系统命令）。
- 费用点击 → 本月累计与按会话拆分。

## 规则

- 不显示 API 密钥任何片段；凭证到期同 DataSources 规则。
- 额度来自提供方响应头或 OpenAlice 配置。
- 延迟 = 首 token 时间 p50，不是总时长。
- 费用是估算（标 `估`），按提供方价目。

## 谁提供什么

- 组件：providers[]（id、state、latency、usage、quota、cost）、servers[]（id、state、tools、lastCall、errors）、onReconnect。
- 调用方：OpenAlice 状态 API。

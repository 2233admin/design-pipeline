# DataSources

数据源板：运行中心里每个行情 / 执行 / 数据源一行——连接灯、延迟 LCD、今日拉取量、覆盖或配额 Meter、凭证到期、动作。Fincept「Data Sources」的对应，但这里是机舱读数，不是配置页：配置在适配器 YAML，这里只显示与重连。开盘自检（pixel.md §4）的 `QUOTE OK · EXEC OK` 从这里读。

## 结构

- 顶行：源计数与状态 · 类别 Segmented（全部 / 行情 / 执行 / 数据）。
- 列：灯（ok / warn 降级 / red 断）· 源名 + 类型 · 延迟 LCD（流式源）或 — · 今日量（笔 / 任务）· 覆盖 Meter（流式 = 订阅覆盖，拉取 = 配额使用，≥ 90% amber）· 凭证（到期天数 ≤ 14 amber，只读标）· 动作（重连 / 刷新）。
- 页脚：最近错误一行（时间 · 源 · 原因 · 处理）。

## 交互

- 点击行 → 展开：订阅的品种数、最近 24h 延迟迷你线、错误日志 ≤ 10 条。
- 「重连」= `source.reconnect` 命令（系统类，二次点击确认）。
- 点击凭证 → 外链配置文档，不在前端填密钥。
- 行情源断线 → `link-down` + 灯 red + 顶栏 QUOTE LED 同步；恢复 `link-up`。

## 规则

- 延迟 = 源时间戳到 Worker 接收（observed_at），不是渲染延迟（那在 SystemHealth）。
- 凭证只显示到期，不显示任何密钥片段。
- 降级（限流 / 退避）是 warn 不是 red。
- 配额来自源的响应头或配置。

## 谁提供什么

- 组件：sources[]（id、kind、state、latency、todayCount、coverage、quota、credentialExpiry、readonly、lastError）、onReconnect。
- 调用方：Quote Hub / 执行网关 / 数据平台的健康端点。

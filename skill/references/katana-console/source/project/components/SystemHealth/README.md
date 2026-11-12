# SystemHealth

机器体征：六块仪表——行情到 Worker 延迟、帧时 p95、长任务数、JS 堆、WS 重连、渲染后端——每块 LCD 大数 + 一行说明 + 1 小时迷你线 + 灯。与 `/perf-check` 的性能验收共用同一套计量（Dev Spec 行情路径验收数字就是从这里读）。

## 结构

- 2 × 3 格：QUOTE HUB → WORKER（p95）· FRAME TIME p95（目标线）· LONG TASKS > 50ms（竖线标出时刻与来源）· JS HEAP（含 ring buffer 占用与上限）· WS RECONNECTS（竖线 = 事件）· RENDER（后端 · AA · DPR · GPU · 面板数 · 后台停绘数）。
- 超目标：数字 amber，灯 warn；持续 5 分钟升 L2。
- 迷你线 `ink-300`，事件竖线 `signal-amber`；不填充。延迟与帧时可切 `wave` 波形带形态（signature.md）。

## 交互

- 点击格 → 展开 24h 曲线与分面板拆解（哪个面板最耗帧）。
- 长任务点击 → 来源栈（面板 / 组件 / 函数）。
- RENDER 格点击 → rendering.md 的 RENDER 设置面板。
- 「导出报告」→ perf-check 格式 JSON。

## 规则

- 计量全部来自 PerformanceObserver / Worker 自报，不估。
- 行情延迟 = Quote Hub 时间戳 → Worker 接收；渲染延迟 = Worker postMessage → rAF 画完；两者分开。
- 不做"健康分"；六个数各自对目标。
- 后台面板停绘计数是 rendering.md 的"后台面板停绘"拨杆的证据。

## 谁提供什么

- 组件：metrics{quoteLatency、frameP95、longTasks[]、heap、reconnects[]、render}、targets、onDrill。
- 调用方：Worker 计量 + PerformanceObserver + rendering 设置。

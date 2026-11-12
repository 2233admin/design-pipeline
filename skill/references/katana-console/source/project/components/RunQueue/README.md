# RunQueue

run 队列：运行中心里看 OpenAlice 正在跑什么、排着什么、刚失败什么。KPI 给运行 / 排队 / 今日完成与资源占用；表给每个 run 的进度 Meter、预估剩余、资源、取消 / 重跑。状态来自 OpenAlice 任务流与 MLflow。

## 结构

- KPI 5 格：运行中 · 排队（含预计）· 今日完成（含失败）· CPU · GPU（Meter 风格数字）。
- 列：状态 LED（on 运行 / off 排队 / ok 完成 / red 失败）· run id 蓝 · 类型 · 对象 · 进度条（运行中）或排队说明（位置、等什么、依赖）· 剩余 · 资源 · 动作（取消 / 重跑）。
- 失败行进度列 amber 写原因（≤ 24 字符），动作变"重跑"。
- 完成的 run 停留 60s 后移出（去 RunInspector 找）。

## 交互

- run 日志按**卡片**展示（工具调用 → 结构化卡，参考 pi-tui），不是终端文本流；需要原始输出时切 xterm 视图。

- 点击 run → RunInspector（运行中也能看 INPUTS 与已出产物）。
- 「取消」= `run.cancel` 命令（研究类无确认，但二次点击确认防误触）；「重跑」= RunLauncher 预填。
- 拖动排队行改优先级（弹簧让位），写 `run.reorder`。
- 资源 KPI 点击 → SystemHealth。

## 规则

- 进度来自 run 自报（步数 / 窗口数），没有自报的显示不定进度条（点阵流动纹理）。
- 预估剩余来自同类历史 run，标 `~`。
- 失败不发音效（研究类）；完成一次 `run-done`（整批合并，不逐个）。
- GPU 占用 ≥ 90% 时 KPI amber——这是提示排队会变慢，不是告警。

## 谁提供什么

- 组件：runs[]（id、kind、target、state、progress、eta、resources、error、position、dependsOn）、capacity、onCancel、onRerun、onReorder。
- 调用方：OpenAlice 任务流 + MLflow 适配器。

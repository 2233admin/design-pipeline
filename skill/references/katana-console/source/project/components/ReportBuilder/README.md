# ReportBuilder

报告装配：左边是可用来源（任意面板的快照、笔记、Alice 评估、表格 CSV），右边是报告大纲；拖进去排顺序，设排程，输出 Markdown / PDF。文字段落由 OpenAlice 写（`report.build` 命令带大纲），每段标来源；面板快照是该面板当时的图 + 表格视图。Fincept「Report Builder」的对应，形态上是一个命令的表单，不是富文本编辑器。

## 结构

- 顶行：报告名与范围 · 排程 Segmented（一次 / 每周 / 每月，含时间）· 输出格式与收件数。
- 左：来源列表，类型点阵标（PANEL / NOTE / ALICE / TABLE），面板来源带区间 / run 说明。
- 右：大纲，每节序号 · 标题 · 来源类型（Alice 写的蓝）；最后一行「拖入 / 自定义文字 · 预览 · 生成」。
- 自动节：待办（Notes 待办 + CorporateActions 需决定）、异常清单（告警 L2+）。

## 交互

- 拖来源到大纲 = 加一节（弹簧让位）；大纲内拖动排序；点节标题改名。
- 「预览」→ 渲染 Markdown（面板快照用 SVG / PNG 内嵌 + 表格）；「生成」= `report.build`（研究类命令，无确认），完成 `run-done` 一次并出现在运行中心产物。
- 排程 = `report.schedule`，出现在运行中心排程列表；排程运行时若某面板来源数据不可用，该节写"数据不可用 · 原因"而不是跳过。
- 收件：邮件 / Webhook / 本地目录（配置在 OpenAlice）。

## 规则

- 面板快照以面板当前 Pane.state 为准（列配置、区间、账户集合）；快照记录这些参数，可复现。
- Alice 文字每段末标 `alice · session · 时间`；人改过的段标 `已编辑`。
- 不嵌入实时数据——报告是时间点文档。
- 模板可保存（周报 / 月报 / 策略评审），模板也是命令参数。

## 谁提供什么

- 组件：sources[]、outline[]（title、source、params）、schedule、output、recipients、onBuild、onSchedule、onPreview。
- 调用方：面板快照服务（前端自己渲染）+ OpenAlice `report.build`。

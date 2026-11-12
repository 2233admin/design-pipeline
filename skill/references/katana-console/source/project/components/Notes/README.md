# Notes

笔记：Markdown，行内可引用品种、run、订单、信号、新闻、公司行动——引用是点阵标，可点跳转，也让笔记能被反向查到（"关于这只票我写过什么"）。按日或按对象两种视图。Fincept「Notes」的对应，也是 ReportBuilder 的文字来源之一；交易日志、研究决定、待办都写在这。

## 结构

- 左列表：按日（日期 + 标题 + 引用数）或按对象（品种 / run / 策略，各自的笔记数）；当前项 `bg-000` + 橙描边。
- 右正文：`sans` 11px 行高 1.7；标题 12px；引用标 Doto 9px 带边框（品种橙、run 蓝、订单 amber、新闻 / 公司行动 `ink-300`）。
- 底部元信息：引用数 · 最后编辑 · 是否可进报告 · 可见性。
- 待办行以 `待办：` 开头自动识别，进总览的待办计数。

## 交互

- `@` 触发 cmdk 引用：输入代码 / run id / 订单 id / 粘贴新闻；从任何面板右键「加入笔记」自动带引用。
- 点击引用标 → 对应面板定位（LinkContext / RunInspector / FillLog / NewsFeed / CorporateActions）。
- 按对象视图里选一只票 → 该票所有引用段落按时间列出。
- 「加入报告」→ ReportBuilder 把该笔记作为一节。

## 规则

- 纯 Markdown 文件存账户配置（Query），可导出；不做富文本。
- 引用只存 id，渲染时解析名称（更名不丢）。
- 笔记默认私有；可见性是显式动作。
- 不做 AI 自动写笔记——Alice 的评估在 RunInspector，想引用就 `@RUN`。

## 谁提供什么

- 组件：notes[]（id、date、title、md、refs[]、visibility）、view、active、onEdit、onRef、onAddToReport。
- 调用方：账户配置存储 + 引用解析器（各域 Query）。

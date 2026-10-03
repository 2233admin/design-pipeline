# Source digest: 历史前端live evaluator实验

- Source: Harness design for long-running application development
- URL: https://www.anthropic.com/engineering/harness-design-long-running-apps
- Publisher: Anthropic Engineering
- Published: 2026-03-24（native published_time与页面Published一致）；modified: 2026-03-24
- Accessed: 2026-10-04
- Acquisition lineage: Luna搜索摘录/浏览器timeout；lead和本worker read native原文成功。仍单发布者、单历史实验，非独立复现。

## 原文支持
作者给evaluator Playwright MCP以直接与live page交互、导航/截图/按criteria critique，再把反馈送generator。原文：“I gave the evaluator the Playwright MCP, which let it interact with the live page directly before scoring each criterion and writing a detailed critique.”

作者报道每次generation 5 to 15 iterations，但其个人偏好不总随评分线性改善，可偏好中间版本；implementation complexity也可能增加。这里只保留实验方法与局限，不采用时间、性能或效果数字支撑建议。

## 更正与边界
日期与方法已原文确认，但距本次访问超AI workflow/landscape三个月窗；不能作为当前Claude Design能力、当前模型性能、自动迭代普遍有效或本工具提效证据。可作为“检查interactive运行对象，不把单截图当行为证明”的历史方法背景；建议可迁移性仍[INFERENCE]。

status=unverified：第一方历史报告措辞有支持；独立复现、当前效果、目标流程有效性均未核验。直接读取成功不升级既有high验证状态。

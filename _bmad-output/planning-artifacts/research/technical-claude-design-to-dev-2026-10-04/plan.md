# 已批准的研究计划

- 决策：参考 Claude 设计工具及实际前端开发链路，选择 design-pipeline 最有价值、可验证且复用既有合同的增强目标。
- 用户批准：本会话选择「按计划继续」。
- 类型／形状：technical／explore；breadth-first 三路，官方能力与私有样本由 Luna 调研，本地接点独立核对。
- 研究模型：派发指定 `openai-codex/gpt-6-luna`；执行身份以父会话 task 元数据为准，不以研究者自报为准。主会话模型未改。
- 范围：设计产物结构、局部反馈、源码与版本关系、静态与真实运行边界；从规格到组件状态、样机和交付的流程；现有 Token/Playground/源码映射/feedback/state/receipt 接点。
- 来源：优先 Anthropic/Claude 官方原文，网页检索只提供线索，重要事实必须读取来源；当前运行版本与兼容性只使用近一个月证据，AI 工作流概况近三个月，其他模式按 technical pack 时效。
- 私有边界：只读目标项目，不发送提示、不上传、不修改目标源码。原始私有路径、URL、摘录保留在 `local://katana-workflow-private.md`，不进入仓库研究产物。报告只能包含去标识化的观察与建议，不能把私有项目当公开来源。
- 文件授权：本地 worker 可读 `openspec/project.md`、canonical `skill/SKILL.md`、相关 OpenSpec change、Playground/token/code-map/feedback/state/receipt 代码与合同；这些是本地接点证据，不是外部产品事实。
- 上限：深度预设；并发固定三路，每维每轮最多 12 个来源，最多 3 轮。上限不是配额，有覆盖或新信息耗尽即停止。
- 验证：high；对关键版本/兼容性、性能或失败主张要求不同底层报告／不同发布者的佐证，无法取得则标 unverified；对重要结论做独立反证调查。
- 检索面：现有 web_search/read，用户授权私有目标的 GitHub 只读工具；不接入额外付费研究服务。
- 停止条件：能明确一个增强目标、已有复用接点、缺口、取舍、边界和真实用户路径验收；不为了填满轮数扩大竞品或重造客户端。
- 输出：brief.md、digests/、由 lead 综合的 research.md、脚本维护的 .memlog.md；研究后形成对应 OpenSpec 变更和可验收实现合同。
- 保护：保留既有用户 dirty 文件；不另建 gate/receipt/state 真相源；Component Conformance 与 Visual Acceptance 继续分离。

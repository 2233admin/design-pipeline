# 工具派发与拆解修复验证

状态与批准记录见本目录 README。2026-10-06，依据已批准的 tool-dispatch-repair-plan.md（SHA-256 cde0ff957d92df19cdb4c143b0e74a05d78bc94911d283b4d5387f57f44ae494），在既有工作副本完成本地工具补丁，无提交、推送、发布、宿主安装或新模型制作。

## 证据表

| 结论 | 验证方式 | 结果与局限 |
| --- | --- | --- |
| 图形主知识缺实际运行时选择会 blocked | toolchain-routing.test.cjs 的 graphics jobs require a selected runtime，及最终 QA | 显式 family/adapter、existing.graphics 保持可用；缺失、空对象、空字符串给出可操作 blocker；普通 UI 保持 optional，未知 adapter 仍合同错误。这是选择校验，不是实际运行时或视觉通过 |
| 真实 plan 能交接给原 resolver | job-route.test.cjs 的 persisted route supplies an executable typed toolchain handoff，实际执行返回 argv | 从持久化 plan + 显式选择生成既有 request.v1，再经原 resolve 返回 Three.js 指南；query、hash、job id、plan path 绑定相符。生成状态为 prepared，不冒称 probe ready |
| 输入和绑定受到保护 | job-route.test.cjs 的 request handoff rejects / route handoff keeps | 缺 framework、绑定冲突、计划漂移、输出越界拒绝；输入覆盖及 Windows 大小写、junction 别名被阻止，原输入保持。特殊 plan 文件名得到不冲突的交接文件名 |
| web/UI quick replicate 不跳参考；web replicate 不强制替代概念 | workflow-next.test.cjs 的 quick frontend replication / frontend replication uses the reference，最终 QA | 参考不能 waive；brief/freeform 与既有 interaction 失效、film/edit 路径受原有测试保护。reference.md 仅作文档已交付标识，不验证观察正确 |
| 制作指令明确单视觉目标和返修 | workflow-next.test.cjs 的 frontend actions define bounded visual tasks；核查四份修改指南 | 沿用 tasks.md 及 reference/scene/reconstruction；先受限灰模，再读取完整检查结果，保留 graybox ready/geometry blocked 的 optical 权限。指令检查证明指导存在，不能证明模型遵守；BUILD 仍以 index.html 存在进入 probe，没有自动逐部件执行器 |
| 仓内 QA 与临时安装包检查通过 | root 执行 node scripts/qa.cjs，退出 0 | 99 文件、843 项，840 pass/0 fail/3 skipped；临时安装包 public CLI smoke 11/11；QA 校验仓库状态未改变。不是宿主工具安装生效证据 |
| OpenSpec 与 diff 检查通过 | root 执行 openspec validate evaluate-design-model-progress --strict --no-interactive 和 git diff --check | 退出 0。QA 后只更正 SKILL.md 对 UI/web 审阅阶段的说明及写本报告，未改 CLI 或测试行为；最终再校验文档，不重复全套 QA |
| 新徽章画质及模型行为改善 | 无新供应商调用或视觉验收 | 未验证。运行中的评测台仍使用旧冻结快照；本轮未接新派发、未改旧作品或用户评分。Component Conformance 与 Visual Acceptance 仍单独评价 |

完整 QA 原记录：[qa.log](../../../.design-pipeline/video-ab/model-eval/tool-repair-20261006/qa.log)，SHA-256 a79d9b3ba628ae2fb4b1e806670bf0cc59e638727ba2f9f7db0eb3f2f4e37b75。日志位于忽略目录；红绿输出保留在本聊天对应命令记录，不编造另存的日志文件。

## 改前改后与验收条件对应

| 已批准检查条件 | 对应证据 | 结果 |
| --- | --- | --- |
| 图形选择漏检：显式及 existing 来源兼容、普通 UI 不强制 graphics | toolchain-routing.test.cjs；子代理红阶段 11 pass/2 个目标失败（漏检仍 ready、构造函数缺失），绿 13/13；空选择补充红 12/13（unknown family undefined），绿 13/13；root 最终 QA | 通过 |
| CLI：真实 plan 交接，缺输入、冲突、漂移和越界拒绝 | root job-route.test.cjs 红 16 pass/2 fail（缺 handoff/未知 request action），最初绿 18/18；复核别名与特殊文件名分别复现失败，最终 19/19；QA | 通过 |
| workflow：复刻保留观察，不替换方向，兼容兄弟流程 | 子代理 workflow-next.test.cjs 红 18 pass/3 fail（已有页面/新项目均跳参考、缺具体指导），绿 21/21；root 相关联合检查及最终 QA | 通过；仅观察文档交付和指导，不自动验证动画理解 |
| 不增加并行 gate/receipt/schema/resolver，指南与动作对齐 | 源码与差异核查；只扩展现有 request 构造和 resolver、CLI、workflow 与指导；复核既有 scene/reconstruction 权限 | 通过；独立审阅发现的两处路径问题及一处审阅说明已处理 |
| 完成计划要求的仓检查 | QA、严格 OpenSpec、diff 检查 | 通过，包含 3 项跳过如实保留；无额外类型检查 |
| 后续两模型拆解和视觉结果观察 | 无新冻结版本或模型试跑 | 未验：另接同一徽章的新版本派发；制作模型限定 futureppo/grok-4.7、futureppo-qwen/qwen3.8-flash-next，关键视觉节点由用户判断 |

## 视频序列帧与动画理解现状（只读）

| 当前事实 | 实际依据 | 影响 |
| --- | --- | --- |
| 原片报告 1162×1162、31.158333 秒、r_frame_rate 240/1、无音轨 | [.design-pipeline/video-ab/evidence.json](../../../.design-pipeline/video-ab/evidence.json)，root 核对原记录 | 报告帧率不是当前派发的抽帧频率；没有据此计算或声称逐帧理解 |
| 当前评测台不自动抽原片或传 MP4，仅复制四张 PNG 与可选 poses.json；OMP 附加四张图片 | [component-eval.cjs](../../../scripts/component-eval.cjs) createRun/prepareAttempt，root 核对实际代码；子代理核对公开图片调用 | 模型获得正面、拆层、侧面及概览，主要依据静态画面推断。公开动作能证明图像输入/读取，不能证明供应商内部视频能力 |
| 概览图为 6×4 网格，23 个有效画面，无时间标签；原抽帧命令和图格→时间映射未找到 | root 实看 [contact-sheet.png](../../../.design-pipeline/video-ab/reference/contact-sheet.png)，历史 reference.md 只称均匀抽样 | 不能断言固定抽帧 fps，也不能用姿态表时间直接冒充图格时间；速度、起止和转折缺少可核对关系 |
| 姿态表是手写 25 个估计时间点，列为 seconds/rotationX/rotationY/rotationZ/separation/scale | [build.cjs](../../../.design-pipeline/video-ab/build.cjs) 6–21 行；root 核查 | 不是追踪或相机解算。当前输入缺列说明；Qwen 工具参考文档写成 26 行并猜列语义，未被参考阶段纠正 |
| 当前参考阶段只检查 reference.md 存在；四组试跑未进入 motion | component-eval.cjs 交付判定；既有 pilot 报告和公开记录 | 尚未验证动画理解或时间线保真，不能把参考文件交付视为理解正确 |
| film 门禁另有 scene 切换检测、10fps/160×90 灰度帧差和分镜中点抽帧 | [film-core.cjs](../../../skill/scripts/film-core.cjs) probe/detectCuts/motionProfile/contactSheet，root 核对 | 它们用于输出规格、运动/切换与截图证据，不自动解释每层运动、相机、遮挡或珐琅反射；当前 workbench 未调用这套原片理解器 |

最小后续方向：沿用既有 reference-evidence、scene、timeline 合同，为样帧保留来源视频摘要和实际时间戳，给姿态估计说明列语义与来源；再交“时间区间、部件、状态变化、遮挡、相机/物体区分、依据帧、置信度/未知”的观察记录供校对，快动作边界补邻近帧。本轮未实施视频抽帧、跟踪或动画理解的新工具，未扩大测试案例。

## 证据缺口

修复已在源码与隔离包入口验证，尚未替换运行中评测台的冻结快照。新模型能否按更细指导调用工具、校对参考并提升珐琅画质，要由新版本真实派发和用户观察回答。旧原始模型事件、作品、参考、快照和评分保持原样；本报告不含内部思维内容。

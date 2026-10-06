# 工具派发与任务拆解修复计划

状态与批准记录见本目录 README。本计划接续用户“Grok 4.7、Qwen 3.8 Flash Next 去做就行，在这之前先修工具这些问题，观察派发后拆解任务的问题”的要求；当前先交可审阅的修正方案，不启动新模型。

## 依据与现状

没有新增 SDD。依据项目 OpenSpec 的“提升 agent 审美与前端制作能力”目标、已有组件评测 SRS 的小任务要求、真实试跑报告及本轮调用链核查。继续使用同一工作副本、分支和 change；不改四份既有批准文档。

| 已复现断点 | 实际结果 | 修正目标 |
| --- | --- | --- |
| `web/quick/replicate` 忽略参考模式 | 没有 reference.md 也直接返回 build；UI 参考模式仍只有整块 work | 复刻先观察参考，制作指令以参考为准；普通 quick 不增加流程负担 |
| route 与工具链输入脱节 | route 返回命令/action，但 resolve 要求带真实 Stage 0 绑定的 typed JSON；模型拿 HTML、Markdown 或 route JSON 试错 | 从真实 job plan 与明确的技术选择生成现有 request.v1，提供可执行交接 |
| 图形任务漏选运行时仍 ready | 同一 graphics-runtime 任务省略 graphics 得到 ready、graphics:null、blockers:[]；显式 Three.js 则带出正确指南 | 缺必需图形选择时 blocked，并说明怎样补充；不替模型猜库 |
| 制作动作没有具体拆解约束 | UI work 和 web build 把完整实现交给模型，既有任务规范只说可独立验证 | 当前动作明确任务的参考来源、视觉目标、不变量、输入、修改范围、产物、实际检查和失败返回步骤 |

最近分步试跑还存在派发层问题：没有持久化 job plan、未提供规范工具链输入；灰模一次承担全部部件，参考阶段只检查文档存在。先修工具交接后再接评测台，不能把派发遗漏算成工具能力全部缺失。

## 工作模式与范围

按 tdd 先为已复现行为添加失败检查，再做最小修复。实现与相关指南一起更新；不增加新的门禁、收据、任务 schema、target resolver 或 policy digest。第一轮修复可执行入口及拆解指导，不声称已实现自动视觉部件规划或持续自我改进。

## 改哪些文件

| 文件 | 具体改法 |
| --- | --- |
| `skill/scripts/toolchain-core.cjs` | 在共享 resolver 中拒绝图形主知识缺 graphics 的 ready；支持已有 existing.graphics。增加小型请求构造函数，复用 validateJobPlan、validateRequest 和 bindJobPlan，从真实 plan 与显式选择生成现有 toolchain-request.v1，冲突不覆盖 |
| `skill/scripts/cli-core.cjs` | 沿现有 toolchain 入口增加 `request --plan job-plan.json --artifact stack-input.json --write --output toolchain-request.json`；复用已登记选项及路径边界。route 写出 plan 后给出交接动作与缺失输入说明，不改变冻结 plan 的 hash 计算 |
| `skill/scripts/workflows/web.cjs` | quick replicate 保留参考阶段；replicate 按参考制作，不要求另选替代概念；brief/freeform 保持既有顺序。build 明确按单个视觉目标拆任务及执行、对照、修正 |
| `skill/scripts/workflow-core.cjs` | UI replicate 同步保留参考观察，并返回适用的既有参考、场景与任务指导；普通 UI quick 保持兼容。不得在 next 中另猜 target 或复刻一套 resolver |
| `skill/references/workflow-web.md`、`skill/references/stages.md`、`skill/references/pipeline-reference.md`、`skill/SKILL.md` | 对齐 next/route 的职责与顺序，示范规范请求交接。Stage 4 tasks.md 沿用现有载体，以参考 region 或适用 scene node 拆解；每项只有一个可验证视觉目标，先结构/遮挡，后材质，再运动 |
| `tests/workflow-next.test.cjs`、`tests/toolchain-routing.test.cjs`、`tests/job-route.test.cjs` | 在已有文件追加必要回归，保留先前本地修改；不新增测试框架或另起整套评测 |

不通过 tasks.md 或 reference.md 文件存在就宣称观察或拆解已验证。现有 reference check 聚合灰模、几何和 reconciliation，不能直接塞进早期参考完成判定造成死锁；早期输出明确受限灰模工作，完整证据就绪后才放行相关精修。规范检查本身不证明像素理解正确。

本轮 reference.md 仅作为观察文档已交付的标识，缺失时 next 必须先返回参考工作。build/work 指导明确分开受限灰模与后续材质/精修，后者读取既有检查的完整结果；检查未就绪就返回对应补证据或返修步骤。此处修指导与现有检查的接续，不新增自动部件执行器，也不以文档存在代替验证。

## 验证与实施顺序

1. 先修图形选择漏检和 typed request 交接，再修 web/UI 参考模式与拆解指令，最后对齐指南。整个补丁作为一项工具修复，复用既有工作副本。
2. 共享 resolver 回归：图形主知识缺 graphics blocked；显式适配器及 existing.graphics 保持可用；普通 UI 无 graphics 仍按旧规则解析。
3. CLI 回归：真实持久化 plan + 显式 framework/graphics 能生成 request 并进入原 resolve；缺 framework、绑定冲突、plan 漂移或输出路径越界不得生成可执行请求。生成请求不代表依赖存在、probe 通过或视觉接受。
4. workflow 回归：web/UI quick replicate 不能跳观察；标准/full replicate 不强制替代概念；普通 quick 与非复刻概念选择保持；既有 interaction 失效规则及 film/edit 兄弟流程不退化。检查指导是否对应现有 reference/scene/task 合同，不制造“文档存在即完成”的新门禁。
5. 每片运行相关显式测试文件；完成后一次 `node scripts/qa.cjs`、严格 OpenSpec 校验和 diff 检查。现有三个相关测试文件已登记，不新增 manifest 或包资源项；无额外类型检查。

本轮改前检查：`node --test tests/workflow-next.test.cjs tests/job-route.test.cjs tests/toolchain-routing.test.cjs`，退出 0，44 通过、0 失败、0 跳过。另以当前代码在隔离临时目录/内存复现上述流程和漏选图形问题。既有检查通过不表示这些新问题已解决；红绿检查尚未开始。

## 后续观察与边界

补丁工程检查完成后，再准备新的冻结工具版本，接好同一徽章派发；制作模型限定 `futureppo/grok-4.7`、`futureppo-qwen/qwen3.8-flash-next`。观察模型能否交付具体子任务、按指令调用能力、发现并修正视觉差距，关键视觉节点仍由用户评价。模型重跑需接续明确范围，不能在本计划待审时启动。

保留旧作品、输入、快照、评分及模型记录；不修改模型默认配置、OMP 的循环检测或编辑接口，不静默切模型。Grok 参数遗漏和 thinking loop 是其他边界，不能宣称由本补丁解决。历史 accept 覆盖后续 reject 已复现，版本绑定仍需另行收敛，本次不重写验收体系。

不提交、推送、发布或安装，不扩展评测台界面或其他测试案例；不以工程通过冒充 Component Conformance 或 Visual Acceptance。

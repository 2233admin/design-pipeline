# 视觉细任务实际派发：实施计划

状态与批准记录见本目录 README。本轮修正的是工具的执行层；不是继续增加指导文字。没有新增 SDD；依据已认可 SRS D2、D3、D5、D6，以及本轮公开派发和源码核对。继续复用当前 change、工作副本与分支。

## 已确认的缺口

评测台的工具／直接组共用七个宏任务，工具差异主要在 guide。产品 `next` 仍返回整段 work/build，没有逐视觉目标推进。上一轮已批准补丁修交接、参考模式和拆解指导，明确没有实现部件执行器；工程回归通过不能证明这层已修好。

本轮的粒度标准是：一个参考目标的一项可观察属性能单独交付、对照和返修。不是固定要求任务数量。徽章中的外轮廓、厚度、倒角、层间遮挡可分别成为目标；通用产品不硬编码这些名称或数量。

## 最小执行闭环

1. 首次派发先让 agent 按实际参考提出细任务；工具检查来源、输入、依赖、修改范围、交付和检查是否明确。未提供有效计划时只返回补拆解的动作，不直接派发整块制作。不声称已能自动从像素产生正确任务。
2. 在既有 implementation 阶段内部复用 `design-plan.v1` 记录细任务。治理 phase registry 不变，不将自定义任务交给既有 `run` 冒充治理阶段。对新增可选任务字段做显式验证；引用真实 reference region 或明确声明的目标，不能假设存在 `scene.json.nodes`。
3. `next --change-root <dir> --plan <file>` 返回一个依赖满足的当前任务：参考、单项目标、允许修改范围、适用的已有能力指南／命令、输出、检查和失败返回。当前公开 next 尚不读取 native 状态，需要实际接线。
4. 为现有 `decide` 接入 native 分支，提交已有 artifact 元数据与适用检查证据。真实输出、任务定义、当前输入和上游摘要都匹配才记技术完成；失败继续返回当前任务，版本改变复用原有下游失效机制。文件存在、模型说完成或 metadata ready 单独均不放行。
5. 细任务进度只保存在原 native state 的明确业务 extension 中，更新走现有锁、CAS、事件事务。评测台读取并展示产品当前任务、派发、工具行动、产物和检查，不复制另一套子任务进度。人工视觉验收保持独立。

第一片仅打通“拆解 → 一个细任务 → 检查失败返修／有效证据推进”这一条链，再接同一徽章。参考时间映射、自动视频语义分析和更多测试案例不并入本片。

## 工作模式与文件改法

正常代码按 tdd，每片先红后绿；相关技能入口和指南按 skill-authoring 对齐。新增行为先补在本 change 的既有 design 与 workflow-guidance spec 中，不改变已批准计划和报告正文。

| 文件 | 改法 |
| --- | --- |
| `skill/scripts/plan-core.cjs` | 为 implementation 内部细任务增加可选字段验证，明确来源、单项目标、范围与适用检查；保持治理 registry 和普通既有 plan 兼容 |
| `skill/scripts/workflow-core.cjs` | 增加 native 细任务 next/decide 接续，校验当前输入、真实输出和检查；复用 artifact、失效及原有收据，保留 legacy 调用 |
| `skill/scripts/pipeline-state-core.cjs` | 为 advanceChange 增加一个明确业务 extension 的受验证更新入口；沿用锁、expectedSha256 和 state/event 提交，不开放任意 extension 替换 |
| `skill/scripts/cli-core.cjs` | 显式 change-root 时接 native 分支，复用已登记的 plan/artifact/choice 等选项；防止误初始化 legacy 状态和跨目录输入 |
| `scripts/component-eval.cjs` | 工具组消费产品公开入口的细任务；直接组自行组织制作。共同参考、最终目标和人工验收节点相同；旧七步运行与作品原样保留 |
| `scripts/component-eval.html` | 复用现有任务卡和事件区展示当前细任务及证据状态，不另做评测页面 |
| `skill/SKILL.md`、`skill/references/stages.md`、`skill/references/pipeline-reference.md` | 入口对齐实际拆解、单任务派发和完成提交；说明能力指南由当前任务选择，不宣称文字指导就是执行能力 |
| `tests/workflow-next.test.cjs`、`tests/pipeline-state.test.cjs`、`tests/component-eval.test.cjs` | 在现有测试文件验证整条公共接缝，不新增测试框架或案例项目 |
| 本 change 的 `design.md`、`tasks.md`、`specs/workflow-guidance/spec.md`、`README.md` | 记录本轮行为、实际状态与批准版本；既有 SRS、实施计划、基线和验证原文保持不动 |

不新增 gate、receipt schema、target resolver、policy digest、独立任务状态库或依赖。若实现中发现必须改其他 load-bearing 文件，先说明实际原因和范围，不默默扩展。

## 检查与有效性

相关显式测试先锁本轮起点；每片只运行受影响现有文件，完成后一次 `node scripts/qa.cjs`、严格 OpenSpec 校验和 diff 检查。无单独类型检查。必要边界：

- 无有效拆解时不能派发整块 build；一次返回一个任务，后续依赖未满足不得提前推进。
- 仅创建 index.html、缺检查、失败检查、使用旧输入／旧检查结果均不能完成当前任务；任务或上游改变使下游失效。
- native 状态和事件一致，旧 revision 写入拒绝；不另创建 legacy 子任务状态。
- 工具组实际消费产品接口，直接组没有取得工具任务计划；旧运行可继续读取。
- 保留已有运行检查与人工视觉接受的区别；不替用户打分。

工程检查通过后，只准备新工具冻结快照和同一徽章派发；真实制作仅用 Grok 4.7、Qwen 3.8 Flash Next，接续已有模型试跑范围，到几何人工验收节点停下。记录模型生成的拆解、实际行动和返修证据，由用户判断是否更好；不以任务数量或工具调用次数证明进步。

本计划当前只在本机、尚未提交，未实施、未跑新模型；不包含提交、推送、发布、安装或修改模型默认配置。

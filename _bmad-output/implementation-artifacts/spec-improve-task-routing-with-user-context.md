---
title: '统一任务派发路由与用户工作上下文'
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'bf44cdea998af5ac5b5ba6eefc96b22c3557f617'
context:
  - 'D:/projects/design-pipeline/CONTEXT.md'
  - 'D:/projects/design-pipeline/openspec/specs/design-pipeline/spec.md'

<frozen-after-approval reason="人类确认的目标；未经重新协商不得修改">

## Intent

**Problem:** 当前任务派发由多个局部路由器分别决定：CLI 会吞掉多余参数，中文请求经常无法识别，多个工具会同时成为候选，review/blocked 状态在下游丢失，执行 slice 的 owner 也没有绑定到已选路由。结果是输入越杂，输出越像“看似 ready、实际不能安全执行”。

**Approach:** 建立一条可追踪的路由链：先把混杂输入规范化为意图、能力、置信度和用户工作上下文，再选择唯一主路由并保留候选；所有 review/blocked/needs-clarification 状态向下游传递；执行计划必须验证 owner 来自主路由。用户建模只记录有限、可检查的工作偏好维度，不建立人格或隐藏画像。

## Boundaries & Constraints

**Always:** 拒绝未消费的多余位置参数；中英文同义输入走同一能力；低置信度或同分候选必须澄清；未验证、需授权或商业来源不能冒充 ready；`task > project > user > defaults` 解析上下文；用户上下文显式可审计、默认 shadow-only；方法论内核、质量门禁和项目约束不可被上下文覆盖。

**Ask First:** 若需要改变既有公开 schema 的必填字段或迁移现有 artifact 格式，先停下确认兼容策略。

**Never:** 不保存原始对话、秘密、人格/身份/诊断等隐含特征；不因“用户习惯”绕过安全、可访问性、许可证或证据门禁；不把所有匹配工具都当作执行 owner；不在本任务中重写整个 CLI 或引入新的外部依赖。

## I/O & Edge-Case Matrix

| 场景 | 输入 / 状态 | 预期行为 | 错误处理 |
|---|---|---|---|
| 中英文混合任务 | “检查可访问性和对比度”/“review contrast” | 得到同一主路由与能力集合 | 无匹配时 `needs-clarification` |
| 多余位置参数 | `doctor garbage --json` | 不执行命令 | 返回结构化 `UNKNOWN_ARGUMENT` |
| 同分路由 | 同时命中 prototype 与 new-experience | 不静默选路 | `ambiguous=true` 且列候选 |
| review 来源优先 | ready 与 commercial/review 候选同时存在 | ready/project-owned 优先；否则整体 review | 禁止伪装 ready |
| owner 越权 | execution slice 指向未被主路由授权的 owner | 计划不可执行 | `blocked` 并说明 owner 不匹配 |

</frozen-after-approval>

## Code Map

- `skill/scripts/cli-core.cjs` -- `dispatch`/`resolveCommand` 解析位置参数；当前只取前两个，需在共享入口拒绝未消费参数。
- `skill/scripts/prism-system-core.cjs` 与 `skill/references/prism-system/manifest.json` -- Prism 关键词路由；当前只做英文 substring 匹配，且同分仍返回 `ready`。
- `skill/scripts/design-system-catalog-core.cjs` -- `CAPABILITY_TERMS`/`decomposeCapabilities`；能力分解的中英文同义词入口。
- `skill/scripts/frontend-stack-core.cjs` -- `routeTools`/`resolveFrontendStack`；当前返回全部匹配工具，没有唯一主 owner。
- `skill/scripts/toolchain-core.cjs` -- `resolveToolchain`；需汇总 review/blockers 并保留主路由元数据。
- `skill/scripts/component-route-core.cjs` -- `candidateScore`/`implementationStatus`；当前能力分高于实现可用性，可能先选 review/commercial 来源。
- `skill/scripts/component-capability-core.cjs` -- `resolveComponentCapabilities`；当前选中 provider 的 review 状态不提升整体状态。
- `skill/scripts/execution-target-core.cjs` -- `validateSlices`/`resolveExecutionTarget`；当前 owner 只校验字符串，未绑定路由授权。
- `skill/scripts/adaptation-core.cjs` 与 `skill/references/adaptation.md` -- 复用现有有限维度、hash、scope、shadow-only 适配边界，不新增画像系统。
- `tests/*routing*.test.cjs`, `tests/component-capability.test.cjs`, `tests/prism-system.test.cjs` -- 现有 happy-path 回归面；新增中文、歧义、状态传播、参数拒绝和 owner 绑定用例。

## Tasks & Acceptance

**Execution:**
- [x] `skill/scripts/cli-core.cjs` -- 在统一 dispatch 入口拒绝多余 positionals 与非法 action，并保留 JSON 错误契约。
- [x] `skill/scripts/prism-system-core.cjs`、`skill/scripts/design-system-catalog-core.cjs` -- 增加中英文规范化/同义词，区分无匹配、低置信度和同分歧义。
- [x] `skill/scripts/frontend-stack-core.cjs`、`skill/scripts/toolchain-core.cjs` -- 选择唯一主路由，传播 review/blocked 状态和候选理由。
- [x] `skill/scripts/component-route-core.cjs`、`skill/scripts/component-capability-core.cjs` -- 将 ready、项目所有权、证据和许可证纳入排序与整体状态。
- [x] `skill/scripts/execution-target-core.cjs` -- 将执行 slice owner 与主路由/工具链绑定，拒绝越权 owner。
- [x] `skill/scripts/adaptation-core.cjs` 及必要的路由契约文件 -- 接入有限的用户工作上下文解析；只接受可审计维度，不改变方法论和门禁。
- [x] `tests/cli-routing.test.cjs`、相关 routing 测试 -- 覆盖矩阵和回归场景；不得削弱现有测试。

**Acceptance Criteria:**
- Given 一个中文或英文任务，when 进入任一路由入口，then 得到一致的规范化能力与唯一主路由或明确澄清状态。
- Given 一个 review、commercial、unverified 或 blocked 候选，when 参与路由，then 状态不会在 frontend → toolchain → execution 链路中降级为 ready。
- Given 多余参数、同分候选或未授权 owner，when 执行派发，then 系统 fail closed 并返回可行动的结构化原因。
- Given 用户只提供工作偏好信号，when 解析用户上下文，then 只生成有限维度的可审计 shadow-only 结果，不保存原始对话或隐含画像。

## Design Notes

路由结果需要把“选择谁”和“为什么能执行”分开：候选列表可多项，但 `primaryRoute` 只能一个；`status` 是所有下游门禁的上界，不允许子路由把 `review` 抬成 `ready`。用户上下文是路由输入的弱信号，不是权限或质量证据。

## Verification

**Commands:**
- `node --test tests/frontend-stack-routing.test.cjs tests/component-routing.test.cjs tests/component-capability.test.cjs tests/toolchain-routing.test.cjs tests/execution-target-routing.test.cjs tests/prism-system.test.cjs` -- 现有路由回归全部通过。
- `node --test tests/cli-routing.test.cjs` -- 新增 CLI 参数、中文/歧义和状态传播测试通过。
- `node skill/scripts/designer-pipeline.cjs doctor garbage --json` -- 返回失败结构，不输出 ready。

## Suggested Review Order

**路由入口与主路由选择**

- 统一入口拒绝未消费参数，避免脏输入静默落入错误命令。
  [`cli-core.cjs:1125`](../../skill/scripts/cli-core.cjs#L1125)

- 唯一主路由优先 ready/project-owned 来源，并保留可审计上下文。
  [`frontend-stack-core.cjs:94`](../../skill/scripts/frontend-stack-core.cjs#L94)

- 工具链透传主路由和有限用户上下文，保持后续执行可绑定。
  [`toolchain-core.cjs:178`](../../skill/scripts/toolchain-core.cjs#L178)

**候选状态与执行门禁**

- review 候选只保留审计信息，不生成可直接执行的 invocation。
  [`toolchain-core.cjs:100`](../../skill/scripts/toolchain-core.cjs#L100)

- 执行请求必须绑定工具链主路由及全部 slice owner。
  [`execution-target-core.cjs:160`](../../skill/scripts/execution-target-core.cjs#L160)

- component review 状态和候选说明进入正式输出契约。
  [`component-resolution.schema.json:7`](../../skill/references/component-resolution.schema.json#L7)

**契约与回归**

- 新增字段显式进入 frontend/toolchain schema，防止序列化后被严格校验拒绝。
  [`frontend-stack-decision.schema.json:7`](../../skill/references/frontend-stack-decision.schema.json#L7)

- 参数、上下文、owner 和 review 行为由路由回归测试固定。
  [`cli-routing.test.cjs:36`](../../tests/cli-routing.test.cjs#L36)

- 工具链级联验证上下文、主路由顺序和 review probe/invocation。
  [`toolchain-routing.test.cjs:29`](../../tests/toolchain-routing.test.cjs#L29)

---
title: 'Stage 0 作业计划绑定与交付形态一致性修复'
type: 'bugfix'
created: '2026-09-17'
status: 'done'
baseline_commit: 'e688ec8e03b5185122943adbc0ded79c69d43484'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 文档要求每次公开 toolchain resolution 都携带 Stage 0 作业计划的真实哈希绑定，但 `bindJobPlan` 在 `jobId`、`jobPlanSha256`、`jobPlanPath` 全缺时返回 `null`，toolchain 因而能在无路由计划时报告 `ready`。即使补上绑定，调用方仍可能先把“产品宣传视频”改写成“滚动叙事页面”，再生成一个表面合法的计划，造成交付形态洗白。

**Approach:** 将完整的 Stage 0 绑定改为公开 toolchain 解析的硬前置条件，并在计划中加入由原始 route query 确定性推导的 `deliverableForm`。toolchain request 必须携带同一形态且由其 brief 独立分类；缺失、部分存在、哈希不匹配、计划内容不合法或分类冲突都确定性阻断。迁移所有真实调用方和 fixture 到控制器生成的哈希绑定计划。补齐通用注册表的产品宣传关键词，使中英文产品视频请求先路由 `motion-graphics`，再由前端能力路由到既有 HyperFrames product-launch-video 合同，不为 OpenAlice 增加特例。

## Boundaries & Constraints

**Always:** `jobPlanSha256` 必须是实际 `job-plan.v1` 的哈希；请求中的 `jobId` 与计划一致；`jobPlanPath` 必须存在且由 CLI 读取；解析后的 toolchain plan 必须带同一哈希。计划必须保存原始 `query`，其 `planSha256` 必须覆盖该 query 与 `deliverableForm`。`deliverableForm` 至少使用 `product-launch-video`、`motion-graphics-video`、`scrollytelling-page`、`interactive-page`、`ui-motion` 的确定性枚举；toolchain request 的形态字段和 brief 分类必须与计划一致。缺失绑定、形态缺失、分类冲突或漂移必须返回确定性的错误或 `blocked`，不得 `ready`。保留现有 route、toolchain、execution 的 lineage 与哈希契约，并覆盖中英文产品宣传动画。

**Ask First:** 若发现既有公开调用方依赖无计划解析，或既有 caller 无法提供控制器生成的原始 query/形态绑定，停止并报告该调用方及迁移方案；不得自行恢复兼容旁路。

**Never:** 不修改 OpenAlice showcase；不新建平行 gate；不把 `jobId` 当作 toolchain `primaryRouteId`；不以 OpenAlice 特例、静默默认计划、宽松校验或删除断言来规避阻断；不归档活动 OpenSpec change；只在隔离 worktree 的隔离分支提交本修复；保持原始 dirty worktree 不变；排除所有无关变更。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 缺失绑定 | toolchain request 三个 job 字段全无 | 不得生成 ready plan | 返回稳定 missing Stage 0 binding 错误 |
| 部分绑定 | 仅 jobId、仅路径或仅哈希，或字段与计划不一致 | 不解析为 ready | 确定性拒绝并指出缺失/漂移 |
| 有效绑定 | 真实 job plan、匹配 SHA-256、可验证路径 | 计划 ready/blocked 仅由真实能力决定，且携带同一 jobPlanSha256 | N/A |
| 产品宣传 | 中英文 HTML 产品发布/展示宣传视频 | routeJob 为 motion-graphics，前端 tool route 包含 HyperFrames product-launch-video 合同 | 普通 UI 动效仍走普通 route |
| 形态冲突 | promo-video 计划 paired with scroll-page/interactive-page brief（中英文） | 不得生成 ready toolchain plan | 确定性 deliverable-form conflict 错误 |

</frozen-after-approval>

## Code Map

- `skill/scripts/job-route-core.cjs:101-220` -- 路由结果、计划体与 `bindJobPlan`；增加从原始 query 推导的确定性 `deliverableForm`，并让 query/form 进入计划哈希与绑定校验。
- `skill/references/job-route.schema.json:7-31`, `skill/references/job-plan.schema.json:7-31` -- 扩展 route/plan 的必需形态字段，保持 additionalProperties 与 hash 约束。
- `skill/scripts/toolchain-core.cjs:32-56,179-224` -- 请求校验、独立 brief 形态分类、绑定调用与结果投影；不得在缺失绑定或 video/page 冲突时报告 ready。
- `skill/references/toolchain-request.schema.json:6-32`, `skill/references/toolchain-plan.schema.json:6-38` -- toolchain request/plan 的形态字段契约。
- `skill/scripts/cli-core.cjs:834-843` -- 公共 `toolchain resolve|probe` 从 `jobPlanPath` 读取计划；迁移路径读取和错误封装。
- `skill/scripts/execution-target-core.cjs:149-184` -- 下游保持与 toolchain 的同一 `jobPlanSha256`，只修 callers/fixtures 必要兼容。
- `skill/references/job-registry.json:56-64` -- 通用 `motion-graphics` 注册项；增加产品宣传中英文关键词而非 OpenAlice 特例。
- `skill/references/frontend-stack-registry.json:144-153` -- 既有 HyperFrames capability route；补齐产品发布/展示与 HTML 视频关键词。
- `tests/job-route.test.cjs`, `tests/toolchain-routing.test.cjs`, `tests/hyperframes-routing.test.cjs`, `tests/skill-cli-handoff.test.cjs` -- 现有断言、CLI fixture 与真实 hash-bound plan 迁移位置；加入 query/form hash 与中英文冲突回归。
- `openspec/changes/<change-id>/proposal.md`, `design.md`, `tasks.md`, `specs/design-pipeline/spec.md` -- 本修复必须新增的通用 routing/toolchain OpenSpec 变更；不触碰 OpenAlice change。

## Tasks & Acceptance

**Execution:**
- [x] `skill/scripts/job-route-core.cjs` -- 让 `bindJobPlan` 对无绑定和所有部分绑定确定性失败，并保留计划内容/哈希/jobId 一致性校验 -- 消除无计划旁路。
- [x] `skill/references/job-route.schema.json`, `skill/references/job-plan.schema.json`, `skill/scripts/job-route-core.cjs` -- 为 route/plan 增加确定性 `deliverableForm`，保存原始 query 并覆盖 query/form 的计划哈希 -- 防止形态洗白和哈希脱钩。
- [x] `skill/references/toolchain-request.schema.json`, `skill/references/toolchain-plan.schema.json`, `skill/scripts/toolchain-core.cjs`, `skill/scripts/cli-core.cjs` -- 强制公开 toolchain resolution 使用真实计划，独立分类 brief 并拒绝 video/product-launch 与 scrollytelling/interactive-page 冲突 -- 防止 ready 结果脱离 Stage 0 或改写交付形态。
- [x] `skill/references/job-registry.json`, `skill/references/frontend-stack-registry.json` -- 注册通用中英文产品宣传词并复用 HyperFrames 路径 -- 修复产品视频路由，不增加 OpenAlice 分支。
- [x] `tests/job-route.test.cjs`, `tests/toolchain-routing.test.cjs`, `tests/hyperframes-routing.test.cjs`, `tests/skill-cli-handoff.test.cjs` -- 迁移 fixture 并加入缺失/部分/漂移绑定、query/form 哈希与中英文 promo-video/scroll-page 冲突回归 -- 防守可观察契约。
- [x] `openspec/changes/stage0-job-plan-binding/` -- 创建 proposal、design、tasks 与 `specs/design-pipeline/spec.md`，使用 ADDED/MODIFIED delta -- 记录通用 routing/toolchain 能力变更与 QA 门禁。
- [x] `scripts/qa.cjs` 与 OpenSpec 校验入口 -- 运行 focused tests、严格 OpenSpec validation、完整 QA -- 交付可复核证据。

**Acceptance Criteria:**
- Given toolchain request 没有任何 Stage 0 绑定字段，when 调用公开 `toolchain resolve`，then 返回确定性错误/blocked，绝不返回 ready。
- Given 绑定字段部分缺失、计划路径缺失、内容哈希漂移或 jobId 不匹配，when 解析 toolchain，then 拒绝该请求并说明根因。
- Given 有效 job plan 与匹配 SHA-256，when 解析 toolchain，then 输出只包含该计划的 `jobId` 与 `jobPlanSha256`，并保持 route/toolchain lineage。
- Given中英文产品发布宣传视频 HTML brief，when先执行 Stage 0 route 再解析 frontend stack，then route 为 `motion-graphics` 且 tool routes 包含既有 HyperFrames product-launch-video 合同；普通 UI hover 动效不命中该视频路由。
- Given 控制器生成的 route query 与 `deliverableForm: product-launch-video`，when toolchain brief 被改写为滚动叙事页面或 interactive page（中文或英文），then resolution 必须拒绝 video/product-launch 与 page 形态冲突，绝不返回 ready。
- Given job plan 的原始 query 或 deliverableForm 被改写但保留旧 `planSha256`，when 校验或绑定计划，then 必须拒绝哈希漂移；toolchain 只能接受控制器生成并通过完整哈希验证的计划。
- Given OpenSpec change、focused tests 与 QA 命令执行，when 使用声明的严格校验入口，then 全部通过且活动 OpenAlice change 未被修改或归档。

## Spec Change Log

## Design Notes

绑定强制化必须在 `bindJobPlan` 单一入口实现，避免 CLI、toolchain、execution 各自形成不一致的旁路；形态分类也必须由可复用的确定性分类器统一约束，但 route query 只应由控制器生成，不能由 agent 重新叙述。registry 只补充通用语义词，HyperFrames 的产品发布优先级继续由其既有合同定义。计划文件路径仍由公共 CLI 做 contained read，哈希验证仍由计划验证器完成。剩余信任边界是：若不可信 caller 在最初调用 route 前就谎报原始 query，系统无法从该 caller 自身恢复真实用户意图；因此控制器生成、保存并传递原始 query 的边界是必要前提，后续 toolchain 只能保证已绑定 query/form 之间的一致性，不能证明 caller 没有在边界外撒谎。

## Verification

**Commands:**
- `node --test tests/job-route.test.cjs tests/toolchain-routing.test.cjs tests/hyperframes-routing.test.cjs tests/skill-cli-handoff.test.cjs` -- 预期全部通过。
- `openspec validate stage0-job-plan-binding --type change --strict --no-interactive` -- 预期新增 change 的 delta 与格式通过。
- `node scripts/qa.cjs` -- 预期仓库声明的测试 manifest 与 QA 全部通过。

**Manual checks (if no CLI):**
- 检查中英文产品宣传 brief 的 route、HyperFrames route 与同一 jobPlanSha256，并确认无 OpenAlice 文件变更。


**Observed results (2026-09-17):**
- Focused specification command (the four named test files): 32 passed, 0 failed.
- Strict OpenSpec validation: valid.
- Full node scripts/qa.cjs: 668 tests / 82 files passed; installed CLI smoke 11 passed; reproducible packages and byte-identical repository status passed.
- cli-core.cjs remains intentionally unchanged: its existing contained plan-file read already enforces jobPlanPath file access, while the shared resolver now rejects missing bindings. execution-target-core.cjs remains unchanged: maintained fixtures now propagate the actual Stage 0 hash.
- OpenAlice showcase and its active change were not modified. Remaining trust boundary: the controller must supply the genuine original query; SHA-256 is integrity binding, not caller authentication.


**Step 4 review patch results (2026-09-17):**
- Narrowed product-video detection and registry keywords; page/dashboard product requests remain non-video while English/Chinese video variants retain motion-graphics/product-launch-video routing.
- Added deterministic rejection for missing, non-string, and blank route queries before classification.
- Documented all four mandatory Stage 0 binding fields and query/form consistency in `skill/references/stages.md`.
- Added route-form and stale referenced-plan regression coverage.
- Exact focused verification command: 32 passed, 0 failed.
- Architecture blocker regressions cover `product showcase animation`, `产品宣传展示动画`, and `产品宣传动画` with Stage 0 motion-graphics, product-launch-video, and HyperFrames alignment.



## Suggested Review Order

Review the current baseline-to-HEAD diff in this concern order:

1. **Classifier precedence:** Verify product video and animation phrases resolve to `product-launch-video`, while page/dashboard language alone remains a page/UI form.
   [Classifier and plan construction](../../skill/scripts/job-route-core.cjs#L79)
2. **Job keyword specificity:** Verify motion-graphics activation requires video-specific product wording rather than broad product showcase/demo/launch page terms.
   [Motion-graphics job registry](../../skill/references/job-registry.json#L60)
3. **HyperFrames matching:** Verify the existing HyperFrames route retains English/Chinese video and animation terms without page-only false positives.
   [HyperFrames frontend registry](../../skill/references/frontend-stack-registry.json#L147)
4. **Plan input integrity:** Verify ready plans reject missing, non-string, and blank route queries before classification and hashing.
   [Plan construction guard](../../skill/scripts/job-route-core.cjs#L186)
5. **Toolchain binding gate:** Verify all four Stage 0 fields, plan hashes, and independent brief/form consistency fail closed without a bypass.
   [Toolchain request validation](../../skill/scripts/toolchain-core.cjs#L32)
6. **Stale-file rejection:** Verify resolve and probe reject a referenced plan mutated after request creation.
   [Stale-plan handoff regression](../../tests/skill-cli-handoff.test.cjs#L94)
7. **Behavioral coverage:** Verify clarification output, page/hover negatives, and English/Chinese product-video positives at Stage 0.
   [Route behavior regressions](../../tests/job-route.test.cjs#L249)
8. **Operational contract:** Verify the Stage 0 workflow documents every required binding field and query/form consistency.
   [Stage 0 workflow reference](../../skill/references/stages.md#L19)

`status: done` records that implementation and verification are complete; no push or PR was performed.

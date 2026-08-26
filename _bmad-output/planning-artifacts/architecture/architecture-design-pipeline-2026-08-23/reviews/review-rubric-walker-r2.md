---
reviewer: BMAD Architecture rubric walker
target: ../ARCHITECTURE-SPINE.md
intent: Validate
round: 2
updated: 2026-08-23
verdict: conditional-pass
---

# Architecture Spine Rubric Review — R2

## Verdict

**CONDITIONAL PASS.**

上一轮的主要问题已经被正确吸收：`Brownfield Delivery Boundary` 明确区分“当前已有能力”和“架构义务”，AD-3/AD-5/AD-6 不再把尚未实现的 robots、URL 安全、realpath 防护和 Figma/Penpot importer 当成现状；AD-14 补齐了运行边界，AD-15 补齐了 capability truth gate。spine 可以进入 `bmad-spec`，但在把它标为 final 或开始实现切片前，仍需锁定下面 5 个中等级边界。

## Mechanical gate

`lint_spine.py --workspace architecture-design-pipeline-2026-08-23`：**通过，0 findings**。

- AD-1 至 AD-15 唯一且递增。
- 每个 AD 都有 `Binds`、`Prevents`、`Rule`。
- 没有模板占位符。
- Stack 版本/支持下限完整。

## Checklist assessment

### 1. Capability coverage

覆盖是完整的：UJ-1 至 UJ-3、FR-1 至 FR-10、SM-1 至 SM-5 都出现在 frontmatter 或 capability map 中。路由/交接能力的覆盖最强，AD-7 至 AD-10 与当前 `frontend-stack-core.cjs`、`toolchain-core.cjs` 的主 primary route、blocked/review 传播、hash/owner 绑定相符。

FR-5/FR-6 现在由 AD-6、AD-8、AD-15 共同约束，并在 Deferred 中明确 source-mode manifest/probe 仍由 bmad-spec 冻结；这比上一版只写“future provider adapters”更诚实。FR-7 仍只有“normalized artifact and receipt contracts”这一层级的描述，缺少 PRD 要求的决策语义，见 M-01。FR-9 已明确 deferred diff receipt，避免静默遗漏，但它仍是 MVP capability 的下游必做项，见 M-02。

### 2. AD executability

- **Pass:** AD-1、AD-2、AD-4、AD-7、AD-8、AD-9、AD-10、AD-11、AD-12、AD-13、AD-15。
- **Conditional:** AD-3、AD-5、AD-6、AD-14。它们的规则已经足够具体，且 brownfield section 明确当前代码尚未兑现这些义务；下一层必须把它们拆成可测试的 contracts/stories，而不能重新当作“已有能力”。

AD-12 的“domain status 与 process exit class 分离”也已与当前 CLI 的多状态现实对齐，并在 Deferred 明确 shared mapping table 尚未冻结，属于诚实的下游交接而不是架构冲突。

### 3. Deferred completeness

Deferred 已覆盖本 altitude 主要未决维度：Figma/Penpot mappings/importer/source modes，用户 profile 产品流，DesignMD completeness boundary，source lifecycle/diff，cache/observability，以及 CLI status/exit mapping。没有发现完全静默的主维度。

但 Deferred 中有两项不能无限后移：FR-7 的 normalized artifact envelope/decision semantics，以及 DesignMD v1 的最小 diff receipt。它们可以由 bmad-spec 冻结，不能等到“第二个 source”之后才决定。

### 4. Brownfield truthfulness

本轮基本通过。`Brownfield Delivery Boundary` 明确列出 robots、response-byte、URL/redirect safety、realpath checks、all-failure recovery、source-artifact hash propagation、executable-versus-agent readiness 和实际 importer 都是 obligation，不是现状。该声明与当前代码相符：`designmd-core.cjs` 目前仍主要提供 catalog、bounded traversal、atomic persistence 和 lexical content-path check；`adapter-core.cjs` 目前是 receipt/intake validation，不是 importer。

残余风险是 capability map 的 FR-3/FR-4 行仍写成笼统的“catalog validation and governance boundary”，而当前 DesignMD 代码的 license 是启发式字符串、status 默认 `reference-only`，尚没有独立的 DesignMD admission implementation。见 M-04。

### 5. Operational/environmental envelope

本轮已从缺失改为显式：AD-14 规定 network policy、budgets、timeout、user-agent、lock scope、output root、retention/recovery、sanitized diagnostics，以及 offline/policy-unavailable 的状态；Stack 也固定了 Node/uv/Skill+CLI/filesystem 形态。这满足“不能静默跳过 operational dimension”的 checklist 要求。

仍缺少面向实现的一组默认值和环境决策：支持的 OS/安装形态、默认 budgets、锁竞争行为、snapshot retention 默认策略、日志/receipt 清理策略，以及 `partial`/`blocked` 下的恢复命令行为。见 M-03。它们适合在 bmad-spec 锁定，不需要引入 daemon 或云服务。

## Findings

### M-01 — FR-7 的归一化决策语义仍未冻结

**Severity:** medium  
**Evidence:** PRD FR-7（`prd.md:162-169`）要求 reference/adopt/substitute/custom 决策、确定性结果和不确定性保留；spine capability map（`ARCHITECTURE-SPINE.md:202-212`）只写“normalized artifact and receipt contracts”，AD-6 规定 normalized mappings，但没有定义 canonical artifact envelope、decision owner、uncertainty/unknown 表示或这些决策如何影响 admission/route。

**Impact:** DesignMD 内容、Figma/Penpot 导出、网页提取、DESIGN.md、tokens 和 UI IR 的下游实现仍可能各自发明输入结构。

**Disposition:** **Defer to bmad-spec, but close before stories.** 冻结 provider-neutral normalized artifact、来源/证据引用、unknown/confidence 语义、reference/adopt/substitute/custom 枚举及其 route/admission effect；具体 Figma/Penpot 字段映射可以继续留在 Deferred。

### M-02 — FR-9 diff receipt 被明确 deferred，但 PRD 把它列为 MVP capability

**Severity:** medium  
**Evidence:** PRD FR-9（`prd.md:187-194`）要求识别新增、变更、消失和失败条目，并阻止 stale 条目继续 ready；spine Deferred（`ARCHITECTURE-SPINE.md:214-223`）把“added/changed/disappeared/stale states, retention, eviction”推迟到第二个 source 后，同时只要求 DesignMD 在 bmad-spec 指定 first diff receipt。

**Impact:** Capability map 虽覆盖 FR-9，但当前架构还没有最小的 changed/disappeared/stale 状态或 receipt 归属，可能导致实现者只做快照替换而漏掉 PRD 的可解释变化记录。

**Disposition:** **Defer only the generic multi-source lifecycle; decide DesignMD v1 now.** bmad-spec 至少冻结 DesignMD 的 previous snapshot hash、entry identity、added/changed/disappeared/failed 分类、stale admission effect 和 deterministic diff receipt。跨 source retention/eviction 可继续后移。

### M-03 — AD-14 已覆盖 operational dimension，但缺少可执行默认值

**Severity:** medium  
**Evidence:** AD-14（`ARCHITECTURE-SPINE.md:123-127`）列出了 network policy、budget、timeout、user-agent、lock、output root、retention/recovery 和 diagnostics；Stack（`:160-168`）固定 runtime，但没有默认 budgets、OS/安装支持矩阵、lock contention 行为、retention/cleanup 默认值或 offline recovery command。当前 `designmd-sync.cjs:17-21` 仍只把 errors 映射为 `blocked`/exit 2，不能体现完整 operational matrix。

**Impact:** 两个 source adapter 仍可能对超时、锁、保留快照和恢复动作做出不同选择，运行边界虽被宣布但尚未完全可执行。

**Disposition:** **Defer to bmad-spec with normative defaults.** 固定 Node/OS 支持、默认 page/concurrency/timeout/retry/bytes、单写锁策略、retention 默认值、日志与 receipt 清理边界，以及 `offline/blocked/partial/recovered` 的命令和 exit mapping。保持 local Skill + CLI，不引入服务化运行时。

### M-04 — FR-3/FR-4 的 brownfield 归属仍可能让人误以为 DesignMD governance 已完成

**Severity:** medium  
**Evidence:** capability map（`ARCHITECTURE-SPINE.md:206-208`）把 provenance/license/admission 放在“catalog validation and governance boundary”；当前 `designmd-core.cjs:98-123` 是 license 文本启发式抽取并固定 `status: reference-only`，而结构化 license/security/admission 规则主要存在于 `adapter-core.cjs:112-152`，两者尚未形成 DesignMD entry 的 admission path。

**Impact:** 下一层实现可能跳过 DesignMD 专属的 inspect/route blocker，而把“有 license 字符串”误读为 license verification。该风险不推翻 spine，但需要更清晰的 ownership。

**Disposition:** **Clarify in bmad-spec.** 明确 DesignMD catalog 的 admission schema、`unknown/verified/unsafe/reference-only/blocked` 的关系、license evidence 来源，以及 catalog entry 进入 route 前调用哪个 governance contract。保留 heuristic license 只能作为候选信号，不能作为 verified。

### M-05 — FR-6 已有 Deferred 归属，但 capability map 仍未把 probe 与 importer 分开

**Severity:** medium  
**Evidence:** FR-5/FR-6 共用 map 行（`ARCHITECTURE-SPINE.md:208`）；AD-15 已要求 declared probe、input format、lifecycle、evidence、fallback，Deferred（`:218`）也要求 bmad-spec 定义 source-mode manifest/probe，但结构化 map 尚未区分“probe 可用”与“import implementation complete”。当前 `adapter-core.cjs:16-33` 的 registry lifecycle probe 与 `validateDesignToolReceipt`（`:89-109`）是两条不同契约。

**Impact:** capability discovery 可能被误报为 import readiness，尤其是 Figma/Penpot 只有 registry/receipt validator 时。

**Disposition:** **Clarify in bmad-spec, no spine redesign required.** 将 probe result、importer capability、receipt validation、fallback 四者分成独立 capability rows/statuses；`probe available` 不得推出 `import ready`，与 AD-15 保持一致。

## Final handoff judgment

这版 spine 已经通过“是否诚实反映 brownfield”的主要门槛，也补齐了上一轮缺失的 operational 和 capability-truth 方向。可以继续 `bmad-spec`；在 spec 中优先关闭 M-01、M-02、M-03，M-04/M-05 作为 schema/ownership clarification 一并收敛。当前不建议直接把 spine 标为 final 或据此并行拆分 importer、normalizer、sync diff 三组实现而不共享这些 contracts。

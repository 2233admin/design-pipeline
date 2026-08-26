---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-design-pipeline-2026-08-23/prd.md
  - _bmad-output/planning-artifacts/prds/prd-design-pipeline-2026-08-23/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-design-pipeline-2026-08-23/ARCHITECTURE-SPINE.md
---

# design-pipeline - Epic Breakdown

## Overview

本文件先完成需求盘点，后续步骤再把需求拆成按用户价值可独立验收的 Epic 和 Story。当前不包含 UX Design contract；本项目继续遵守本地 Skill + CLI + 文件工件边界。

## Requirements Inventory

### Functional Requirements

- **FR-1: 同步资源源。** 维护者可以通过本地 CLI 指定 Resource Source 并同步可发现资源；支持 DesignMD 的 skill、template、example、guide、tool 五类条目，保存稳定 id、kind、标题、描述、URL、来源 URL、本地内容路径和 inert 内容；同步限制页数、并发、超时，按稳定 id 去重。
- **FR-2: 记录同步状态。** 每次同步记录抓取页数、条目数、错误列表和 `ready`、`partial`、`blocked` 状态；资源缺口阻止全量 ready，但不删除上一份有效快照；5xx 有限重试且错误定位到具体 URL。
- **FR-3: 来源与 contentSha256 绑定。** 每条 Resource Entry 保存 `contentSha256`；本地内容篡改时 verify 失败；来源、revision 或 digest 变化标记为 changed；search、inspect、route 可回到来源和本地路径。
- **FR-4: 许可证与安全准入。** 系统区分已验证、未知和不允许的来源；未知许可证可索引为 `reference-only`，但不能自动安装、执行或成为默认实现权威；远程执行提示、脚本、命令和未声明网络行为保持 inert，并进入 `review-required` 或 `blocked`。
- **FR-5: 本地设计工件导入。** 用户可以提交 JSON、SVG、PNG、tokens、组件清单和其他声明支持的本地导出物；系统拒绝 root 外路径、不可解析文件、未知格式和 SHA-256 不匹配输入；导入结果包含 source artifact、`sourceSha256`、provider、operation、availability、mappings、editable、evidence。
- **FR-6: 设计工具能力探测。** 用户可以只读查看 Design Tool 当前环境的版本、来源、能力和 host-dependent 状态；不触发安装或远端修改；不可用工具必须有 DESIGN.md、tokens、UI IR 或截图等降级路径。
- **FR-7: 设计知识归一化。** 系统把 Local Snapshot 和 Design Tool 输入映射为视觉风格、tokens、组件能力、动效、布局和工具能力；不直接覆盖 DESIGN.md、MOTION.md 或现有组件，必须产生 `reference-only`、`adopt`、`substitute` 或 `custom` 决策；结果保留来源和不确定性并保持确定性。
- **FR-8: 路由与交接。** Agent 通过 Skill + CLI 搜索并选择 Pipeline Route；公共入口一致；toolchain plan、execution request、routeId、slice owner、输入/资源 hash 和 plan hash 相互绑定；owner、hash、blocked 状态不一致时拒绝交接；不需要 MCP Service，CLI 输出为稳定 JSON contract。
- **FR-9: 可重复同步。** 维护者可重复同步并识别新增、变更、消失和失败条目；相同来源/内容生成稳定 id、排序和 hash；失败保留上一份有效快照；过时条目不得继续获得 ready 资格。
- **FR-10: 可解释的恢复。** 错误输出包含 URL、失败原因和建议动作；verify 区分内容篡改、来源缺失、抓取缺口和本地文件缺失；失败不执行远端内容，不修改项目依赖或远端设计工具。

### NonFunctional Requirements

- **NFR-1 — Inert content:** HTML、Markdown、prompt、命令和脚本默认 inert，不在同步阶段执行。
- **NFR-2 — Credential governance:** 远程凭据不得写入快照、日志、URL 或 Evidence Receipt；Host-dependent 工具必须显式声明凭据要求。
- **NFR-3 — Root containment:** 项目路径、输出路径和证据路径必须保持在 `--root` 内，并拒绝 traversal、symlink/junction escape 和非文件目标。
- **NFR-4 — Snapshot provenance:** 每份快照保留来源、抓取时间、revision（若有）、许可证状态和 `contentSha256`。
- **NFR-5 — Determinism:** 相同来源、内容和选项生成稳定排序、稳定 id 和稳定 SHA-256 digest。
- **NFR-6 — Failure visibility:** 网络失败、5xx、超时和内容变化必须是可见状态，不得静默 ready；失败保留 last-known-good。
- **NFR-7 — No side effects:** 同步和 verify 不得修改目标项目依赖、远端设计文件或 OpenSpec 历史。
- **NFR-8 — Bounded sync:** 默认同步使用有限并发；并发、页数、响应大小、超时和重试均有上限。
- **NFR-9 — Offline search:** 搜索 Local Snapshot 不依赖网络，常规查询在本地完成。
- **NFR-10 — Size observability:** 单个资源内容和整体快照大小需要在输出中可观测；大资源应通过独立 content path 保存。
- **NFR-11 — Versioned delivery contract:** CLI 输出使用版本化 JSON envelope，退出类区分 success、blocked 和 invalid。
- **NFR-12 — Public surface consistency:** Skill 文档、公共 help、CLI dispatch 和测试必须保持入口一致。
- **NFR-13 — Tool Connector boundary:** Tool Connector 是内部管线能力，不得被文档描述为 MCP Service；本地 Skill + CLI + 文件工件是 v1 运行边界。

### Additional Requirements

- Architecture 采用 invariant-first 分层管线和 ports-and-adapters 边界：ingestion → normalized artifact → governance → adaptive routing → toolchain → execution/evidence。
- 所有外部资源默认 reference-only；DesignMD 一方页面可成为条目，外部工具链接默认保留为 inert reference，不递归抓取供应商。
- DesignMD 同步必须使用 HTML、sitemap、llms/llms-full 发现，并记录 sourceId、sourceUrl、provenance、license/status、`contentSha256`、errors、previousSnapshotHash 和 diff receipt。
- diff receipt 至少包含 added、changed、disappeared、failed、stale；disappeared/stale 不得继续被准入为 ready。
- receipt 必须携带 provider、operation、source mode、producer/version、source SHA-256、normalized mappings、editable、fidelity/loss、evidence 和 status；v1 source mode 固定为 `local-file`，其他模式只保留为后续契约扩展，不得标记为 ready。
- Figma 与 Penpot 原始输入格式保持 provider-specific；v1 只接收用户本地 JSON/SVG/PNG/tokens 导出物；`.penpot` archive 及 archive member 处理属于后续扩展，不得在 v1 标记为 ready。
- Design Artifact 必须保留 source identity、semantic elements/roles、tokens/style、logical mappings、editable、fidelity/loss、admission 和 evidence；provider raw object 不进入路由层。
- 每个 route plan 只有一个 primaryRouteId；显式能力/关键词优先于泛化路由；route、toolchain、execution 绑定 owner、inputArtifacts、resource ids、admission statuses 和 hashes。
- agent-owned/manual 只能产生显式 Skill action 和 evidence checkpoint，不能生成 executable ready。
- source/artifact/route/execution 状态所有权分离；adaptation 为 versioned atomic state + append-like history，不能修改 Kernel 或 gates。
- offline 模式禁止网络；fixture 模式只允许测试本地 host；external-read 必须显式启用并 fail closed。
- 交付必须包含 URL safety、snapshot recovery、path safety、import、routing、status 和 context 的 hermetic verification slices。

### UX Design Requirements

未提供 UX Design contract，因此本轮没有可抽取的 UX-DR。CLI/JSON 输出的可解释状态属于 FR/NFR 和 Architecture contract，不另建 UX 需求。

### FR Coverage Map

FR-1: Epic 1 - 同步 DesignMD 资源并建立稳定本地目录
FR-2: Epic 1 - 记录 ready、partial、blocked 状态并保留 last-known-good
FR-3: Epic 1 - 绑定来源、revision、内容 hash 并支持 verify
FR-4: Epic 1 - 执行许可证、安全和 reference-only 准入
FR-5: Epic 2 - 导入并校验 Figma、Penpot 和通用本地设计工件
FR-6: Epic 2 - 探测设计工具能力并提供降级路径
FR-7: Epic 3 - 将资源和工具输入归一化为 Design Artifact 与采用决策
FR-8: Epic 4 - 选择唯一主路由并完成 Skill → CLI → toolchain/execution 交接
FR-9: Epic 1 - 识别新增、变更、消失、失败和过时条目
FR-10: Epic 1 - 输出可解释恢复结果并阻止远端执行或项目副作用

## Epic List

### Epic 1: 可靠同步并审计设计资源

维护者可以同步 DesignMD，获得可搜索、可验证、带来源和 hash 的本地资源目录；抓取失败不会破坏上一份有效快照。
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-9, FR-10
**Natural dependency:** 可独立交付；后续 Epic 使用其快照和准入状态。

### Epic 2: 把设计工具导出物变成可验证输入

用户可以提交 Figma、Penpot 或通用本地导出物，得到安全校验、receipt、能力探测和明确的降级路径。
**FRs covered:** FR-5, FR-6
**Natural dependency:** 可独立使用 fixture 和本地文件交付；后续 Epic 消费其 receipt 和 Design Artifact。

### Epic 3: 把多来源知识归一化为设计方案

用户可以将资源站内容和设计工具输入转化为 DESIGN.md、tokens、UI IR、组件能力等 Design Artifact，并明确 `reference-only`、`adopt`、`substitute`、`custom` 决策。
**FRs covered:** FR-7
**Natural dependency:** 依赖 Epic 1/2 提供的本地输入契约，但可以用受控 fixture 独立验收。

### Epic 4: 让 Agent 安全选择并交付实现路线

Agent 可以根据需求、项目上下文和准入状态选择唯一主路由，并将结果可靠交给 Skill → CLI → toolchain/execution。
**FRs covered:** FR-8
**Natural dependency:** 消费前面 Epic 的快照、Design Artifact 和 receipt；独立验收 route owner、hash、状态传播和 handoff 拒绝条件。

## Epic 1: 可靠同步并审计设计资源

维护者可以同步 DesignMD，获得可搜索、可验证、带来源和 hash 的本地资源目录；抓取失败不会破坏上一份有效快照。

### Story 1.1: 建立受边界约束的 DesignMD 首次同步

As a 设计管线维护者,
I want 通过本地 CLI 同步 DesignMD 的可发现资源,
So that 我可以获得一个可搜索、可追溯且不会执行远程内容的本地资源目录。

**FRs addressed:** FR-1, FR-2

**Acceptance Criteria:**

**Given** 项目已安装 Design Pipeline，且输出目录位于项目根目录内
**When** 维护者执行 DesignMD sync
**Then** 系统通过 HTML、sitemap、llms/llms-full 等入口发现资源，并识别 `skill`、`template`、`example`、`guide`、`tool` 五类条目
**And** 输出使用确定性的 Resource Snapshot schema，条目统一使用 `contentSha256` 字段，并包含稳定 id、kind、标题、描述、来源 URL、本地 contentPath、license/status 和 provenance

**Given** 页面存在重复链接或同一稳定资源被多个入口发现
**When** 同步完成
**Then** 只生成一个条目，并保持稳定排序和稳定 hash

**Given** 抓取过程中遇到 robots 禁止、超时、5xx 或响应大小超限
**When** 同步继续处理其他页面
**Then** 结果明确记录 URL 级错误和同步状态，不得报告为全量 `ready`
**And** URL userinfo、敏感 query、private/loopback/link-local/metadata 目标和未经重新校验的 redirect 均被拒绝，响应体不超过声明的 byte limit

**Given** 同步保存了远程 HTML、Markdown、prompt 或脚本内容
**When** 本地快照写入完成
**Then** 内容仅作为 inert 文件保存，不触发执行、安装、依赖修改或远端工具调用

### Story 1.2: 验证来源、许可证、路径与内容完整性

As a 设计管线维护者,
I want 验证资源的来源、许可证、路径和内容 hash,
So that 不可信或被篡改的内容不会影响后续实现路由。

**FRs addressed:** FR-3, FR-4

**Acceptance Criteria:**

**Given** 本地快照包含 Resource Entry
**When** 执行 `designmd verify`
**Then** 系统校验来源、content hash、contentPath 和本地文件存在性，并输出稳定 JSON 结果

**Given** 本地内容被修改、删除或 SHA-256 digest 不匹配
**When** 执行验证或 inspect
**Then** 条目标记为 `invalid` 或 `blocked`，不得继续作为 `ready` 路由输入

**Given** contentPath、artifact 或 evidence 路径包含绝对路径、`..`、symlink 或 junction 越界
**When** 系统读取或写入该路径
**Then** 操作被拒绝并返回 `invalid`，不得执行越界读取

**Given** 资源许可证未知、来源不完整或内容包含远程执行提示
**When** 系统评估资源准入
**Then** 资源可以保留为 `reference-only` 或 `review-required`，但不能自动安装、执行或成为默认实现权威
**And** `search`、`inspect` 和 `route` 都保留该 admission 状态，不得只在 `verify` 命令中阻断

### Story 1.3: 输出可解释状态并恢复 last-known-good 快照

As a 设计管线维护者,
I want 在同步失败或部分成功时获得明确状态并保留上一份有效快照,
So that 我可以知道下一步动作，而不会因为一次网络故障丢失可用资源。

**FRs addressed:** FR-2, FR-10

**Acceptance Criteria:**

**Given** 已存在一份有效本地快照
**When** 新一轮同步出现部分失败或全部页面失败
**Then** 系统保留原快照不变，并返回 `partial` 或 `blocked` 状态

**Given** 同步候选正在写入或验证
**When** 写入、解析或校验中断
**Then** 不发布半成品快照，上一份有效快照继续可读

**Given** 这是首次同步且所有页面均失败
**When** 同步结束
**Then** 系统返回稳定的 `blocked` recovery envelope，不抛出未分类异常，也不生成伪造的空 `ready` 快照

**Given** 同步发生失败或恢复
**When** CLI 输出结果
**Then** envelope 包含失败 URL、原因、重试结果、`preserved`、`previousSnapshotHash` 和建议动作

**Given** `verify` 发现资源错误
**When** CLI 返回 JSON 和进程退出结果
**Then** 二者状态一致，不得出现 JSON 显示 `ready` 而退出码表示 blocked 的情况
**And** domain status 与 process exit class 使用同一张版本化映射表

### Story 1.4: 识别快照变化并阻断过时资源

As a 设计管线维护者,
I want 重复同步时看到新增、变更、消失、失败和过时资源,
So that 旧内容不会悄悄继续影响实现。

**FRs addressed:** FR-3, FR-9

**Acceptance Criteria:**

**Given** 已存在上一份有效快照
**When** 新同步完成并进行比较
**Then** 系统生成包含 `added`、`changed`、`disappeared`、`failed`、`stale` 的 diff receipt，并记录前后 snapshot hash

**Given** 资源从新快照中消失或无法重新验证
**When** 系统完成 diff
**Then** 条目标记为 `disappeared` 或 `stale`，不得进入后续 ready route

**Given** 连续两次同步输入完全一致
**When** 系统生成 diff receipt
**Then** 结果为空变化集，并保持稳定排序和确定性 hash

**Given** 新快照中的资源内容、来源 revision 或许可证状态与上一份不同
**When** 系统生成 diff receipt 并更新准入
**Then** 资源进入 `changed`，旧 `contentSha256`、当前 `contentSha256`、前后 snapshot hash 和变化原因均可追溯

**Given** 资源从新快照中消失、抓取失败或无法重新验证
**When** 系统完成 diff 和 route admission
**Then** 资源进入 `disappeared`、`failed` 或 `stale`，并被禁止进入 `ready` route，直到新鲜有效记录重新通过准入

## Epic 2: 把设计工具导出物变成可验证输入

用户可以提交 Figma、Penpot 或通用本地导出物，得到安全校验、receipt、能力探测和明确的降级路径。

### Story 2.1: 接收并验证本地设计导出物

As a 前端实现者,
I want 提交本地设计导出文件,
So that 管线可以在安全边界内确认文件来源、格式和完整性。

**FRs addressed:** FR-5

**Acceptance Criteria:**

**Given** 用户提交 JSON、SVG、PNG、tokens 或组件清单
**When** 执行本地设计工件 intake
**Then** 系统校验 `source.root`、文件类型、文件存在性、regular-file 属性和 `source.sha256`

**Given** 文件路径越出 root、包含 traversal、symlink/junction 或 SHA-256 digest 不匹配
**When** 执行 intake
**Then** 操作返回 `invalid`，不读取、不写入、不生成有效 receipt

**Given** 输入格式已声明但当前 adapter 不支持
**When** 执行 intake
**Then** 系统返回明确的 `blocked` 或 `review-required` 状态，并说明支持的 fallback

**Given** 输入通过安全和完整性校验
**When** 生成 receipt
**Then** receipt 包含 `provider`、`operation`、`source.mode`、`source.artifact`、`source.sha256`、`producer.version`、`availability`、`mappings`、`editable`、`fidelity.losses`、`evidence` 和 `status`

### Story 2.2: 支持 Figma 本地导出 receipt

As a 使用 Figma 的前端实现者,
I want 将 Figma 的本地导出物交给管线,
So that 实现者可以获得带来源和保真度说明的 Figma 设计输入。

**FRs addressed:** FR-5

**Acceptance Criteria:**

**Given** 用户提供符合已声明 source mode 的 Figma 本地导出物
**When** 执行 Figma intake
**Then** 系统识别 provider 为 `figma`，记录 producer/version 和 source.sha256，并生成符合通用 receipt contract 的结果

**Given** Figma 导出物包含可识别的组件、tokens、布局或资源映射
**When** 生成 receipt
**Then** mappings 记录来源位置、目标语义和 evidence；不可编辑或无法映射的内容进入 `fidelity.losses`

**Given** Figma 输入需要 API、登录或远端文件写回
**When** 执行本地导入
**Then** 管线不自动调用远端 API、不获取凭据、不修改远端文件，并返回明确的 fallback 或 blocked 状态

**Given** Figma 文件被篡改、格式损坏或 source hash 不匹配
**When** 执行 intake 或 receipt-check
**Then** 操作返回 `invalid`，不得生成可用于 route 的有效 receipt

### Story 2.3: 支持 Penpot 本地导出 receipt

As a 使用 Penpot 的前端实现者,
I want 将 Penpot 的本地导出物交给管线,
So that 实现者可以获得带来源、版本和保真度说明的 Penpot 设计输入。

**FRs addressed:** FR-5

**Acceptance Criteria:**

**Given** 用户提供 Penpot 的声明支持格式
**When** 执行 Penpot intake
**Then** 系统识别 provider 为 `penpot`，记录 source mode、producer/version、source.sha256，并生成通用 receipt

**Given** 输入是 `.penpot` archive 或其他 v1 未声明格式
**When** 执行 Penpot intake
**Then** 系统返回 `blocked` 或 `review-required`，说明 v1 只接受 JSON、SVG、PNG、tokens 本地导出物，不解包、不读取 archive member

**Given** Penpot 导出物包含组件、布局、资产或 tokens 映射
**When** 生成 receipt
**Then** mappings、editable、fidelity.losses 和 evidence 明确记录可复用内容及无法保真的部分，不假设 Figma 原始格式兼容

**Given** Penpot 文件损坏、版本不支持或 source hash 不匹配
**When** 执行 intake 或 receipt-check
**Then** 操作返回 `invalid` 或 `blocked`，不得生成可用于 route 的有效 receipt

### Story 2.4: 探测工具能力并提供降级路径

As a Agent 操作者,
I want 只读查看设计工具在当前环境中的能力和 fallback,
So that 我可以选择真实可用的路线，而不会触发安装、登录或远端修改。

**FRs addressed:** FR-6

**Acceptance Criteria:**

**Given** 当前环境存在 Figma、Penpot 或其他声明的 Design Tool provider
**When** 执行 capability probe
**Then** 系统返回 provider、version、availability、capabilities、credential requirement、source modes、fallback 和 evidence

**Given** 工具需要凭据、Host 或远端 API 才能使用
**When** 执行 probe
**Then** probe 只读，不获取或持久化凭据，不调用远端写回，并明确标记 host-dependent

**Given** 设计工具不可用或 importer 尚未完成
**When** Agent 请求该能力
**Then** 系统返回 `review-required` 或 `blocked`，并提供 DESIGN.md、tokens、UI IR、截图或 `reference-only` 等可验证 fallback

**Given** capability 没有真实输入格式、生命周期、证据检查点或 fallback
**When** 系统汇总 readiness
**Then** 能力不得标记为 executable `ready`

## Epic 3: 把多来源知识归一化为设计方案

用户可以将资源站内容和设计工具输入转化为带来源、语义和保真度说明的 Design Artifact，并明确采用决策。

### Story 3.1: 生成确定性的 Design Artifact

As a 前端实现者,
I want 将资源和工具 receipt 归一化为 Design Artifact,
So that 实现者可以消费统一的设计约束而不依赖供应商原始对象模型。

**FRs addressed:** FR-7

**Acceptance Criteria:**

**Given** 输入通过资源准入或 design-tool receipt 校验
**When** 执行 artifact normalization
**Then** 输出包含 source entry/artifact identity、provider、source mode、admission status、semantic elements/roles、tokens/style、logical mappings、editable、fidelity.losses 和 evidence

**Given** 相同输入、相同项目上下文和相同选项
**When** 重复执行 normalization
**Then** 输出保持确定性排序、稳定 hash 和一致的缺失字段结果

**Given** provider 原始数据无法映射为统一语义
**When** 生成 Design Artifact
**Then** 缺失内容记录为 explicit loss 或 unknown，不伪造默认值，也不把 provider raw object 泄漏到 route contract

### Story 3.2: 管理 reference/adopt/substitute/custom 决策

As a 设计负责人,
I want 对资源进入项目的方式做出明确决策,
So that 参考资料不会未经审查直接覆盖项目设计约束。

**FRs addressed:** FR-4, FR-7

**Acceptance Criteria:**

**Given** Resource Entry 或 Design Artifact 已完成来源、许可证和安全评估
**When** 用户或 Agent 选择采用方式
**Then** 系统只接受 `reference-only`、`adopt`、`substitute` 或 `custom` 等明确决策，并记录决策依据、上下文和证据

**Given** 许可证未知、来源不完整、内容不安全或项目约束冲突
**When** 请求 `adopt` 或默认实现权威
**Then** 系统阻断或要求 `review-required`，不自动覆盖 DESIGN.md、MOTION.md、tokens 或现有组件

**Given** 用户选择 `substitute` 或 `custom`
**When** 生成决策记录
**Then** 原始来源、替代原因、适配差异和后续验证要求仍然可追溯

### Story 3.3: 生成可消费的设计实现工件

As a 实现者,
I want 从归一化结果获得 DESIGN.md、MOTION.md、tokens、UI IR 或组件映射,
So that 我可以把设计判断交给组件、设计系统和执行流程。

**FRs addressed:** FR-7

**Acceptance Criteria:**

**Given** Design Artifact 已有有效来源、admission、mapping 和 evidence
**When** 请求生成实现工件
**Then** 系统只生成声明支持的输出类型，并在每个输出中保留输入 hash、来源和 fidelity/loss

**Given** 输入只有截图或缺少可编辑映射
**When** 请求生成可编辑实现工件
**Then** 系统可以生成视觉 reference，但必须标记 `review-required`、`fidelity-mismatch` 或 `blocked`，不能声称完成可编辑交接

**Given** 输出工件写入项目目录
**When** 完成生成
**Then** 路径通过 containment 校验，不覆盖现有工件，且生成结果可被后续 verify 和 route 读取

## Epic 4: 让 Agent 安全选择并交付实现路线

Agent 可以根据需求、项目上下文和准入状态选择唯一主路由，并将结果可靠交给 Skill → CLI → toolchain/execution。

### Story 4.1: 根据上下文选择唯一主路由

As a Agent 操作者,
I want 根据任务、项目、用户协作偏好和可用能力选择路线,
So that 管线能给出可解释且符合约束的下一步动作。

**FRs addressed:** FR-8

**Acceptance Criteria:**

**Given** 同时存在 task、project、user 和 defaults context
**When** 系统解析 routing context
**Then** 按 `task > project > user > defaults` 生效，并保留覆盖关系和来源

**Given** 用户明确指定能力或关键词命中具体 provider route
**When** 系统生成 route plan
**Then** 具体能力 route 优先于泛化 route，并且只产生一个 `primaryRouteId`

**Given** 资源、工具或 Design Artifact 状态为 `reference-only`、`review-required`、`blocked`、`stale` 或 `fidelity-mismatch`
**When** 系统评估 route
**Then** 路由保留该状态并生成 `review-required`/fallback plan，不得静默升级为 executable `ready`

### Story 4.2: 绑定 route、toolchain 和 execution 的 owner/hash

As a 实现者,
I want 接收绑定输入和 owner 的 toolchain plan,
So that 执行不会消费过期资源或错误路由。

**FRs addressed:** FR-8

**Acceptance Criteria:**

**Given** route plan 已选出 primary route
**When** 生成 toolchain plan 和 execution request
**Then** 两者绑定 primaryRouteId、primaryOwner、alternatives、inputArtifacts、resourceEntryIds、admissionStatuses、sourceArtifactHashes 和 planSha256

**Given** 任意输入 artifact、resource、owner、route 或 plan hash 在交接前发生变化
**When** toolchain 或 execution 校验 handoff
**Then** 操作返回明确的 mismatch/blocked 错误，不执行后续命令

**Given** slice owner 被替换或 route plan 缺少唯一 primary
**When** 生成或验证执行请求
**Then** 请求被拒绝，并输出原 owner、当前 owner 和修复动作

### Story 4.3: 完成 Skill → CLI → toolchain 的可审计交接

As a Agent 操作者,
I want 通过稳定的 Skill 和 CLI 将计划交给执行或人工审查,
So that 每次交接都有一致状态、证据和失败原因。

**FRs addressed:** FR-8, FR-10

**Acceptance Criteria:**

**Given** Skill 文档、CLI help、dispatch 和 toolchain contract 都声明同一公共入口
**When** Agent 发起 handoff
**Then** CLI 接收稳定参数并输出版本化 JSON envelope，入口名称和参数含义一致

**Given** primary route 存在真实 executable lifecycle、证据检查点和 fallback
**When** handoff 通过 owner/hash/admission 校验
**Then** route 可以进入 `ready` execution，并记录生命周期、输入 hash 和 evidence

**Given** primary route 是 agent-owned、manual、`review-required` 或 blocked
**When** Agent 发起 handoff
**Then** 系统返回对应非 ready 状态、Skill action 和 evidence checkpoint，不生成可执行命令

**Given** CLI、toolchain 或 execution 任一层返回失败
**When** 交接结束
**Then** JSON status、process exit class、owner、plan hash 和下一动作保持一致，且不会静默降级为成功

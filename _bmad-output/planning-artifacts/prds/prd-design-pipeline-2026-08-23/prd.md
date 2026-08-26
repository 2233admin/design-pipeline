---
title: Design Pipeline 多来源设计工具与资源站支持
status: final
created: 2026-08-23
updated: 2026-08-24
---

# PRD: Design Pipeline 多来源设计工具与资源站支持

## 0. Document Purpose

本文档定义 Design Pipeline 如何接入 DesignMD 等资源站，以及 Figma、Penpot 等设计工具，形成可追溯的本地设计输入、设计知识、实现路由和验证证据链。本文档面向产品负责人、设计管线维护者、架构和实现人员，作为后续 UX、架构和故事拆分的上游依据。实现技术、具体脚本组织和第三方 API 细节放入配套 addendum，不改变本文档中的能力边界。

本产品是本地优先的设计管线，不是 MCP 服务。v1 的 Design Tool 输入只通过本地导出物进入管线；未来受控 Host 输入必须明确授权。所有可用于实现的结果必须落成带来源和 SHA-256 digest 的本地工件。

当前基线已经具备本地 Skill + CLI 交接、DesignMD 资源站同步、设计系统/组件/工具链路由，以及 plan hash 和 slice owner 校验。本 PRD 的新增范围是把这些能力统一为多来源设计输入契约，并补齐 Figma、Penpot 和其他设计工具的本地导入边界。

## 1. Vision

Design Pipeline 让用户能够把分散在资源站、设计工具和项目仓库中的设计知识，转化为可检索、可审计、可路由的本地设计输入。用户不需要在每次实现前重新解释视觉方向、组件行为和工具选择，管线会把这些输入归一化为 DESIGN.md、MOTION.md、tokens、UI IR、组件能力和证据工件。

核心价值不是“连接更多工具”，而是让不同来源的设计信息在进入实现前经过同一套来源、许可证、安全、版本和适配性判断。一个资源可以被发现，但只有通过管线准入后才可以影响实现；一个工具可以被支持，但支持必须对应可验证的输入/输出契约，不意味着远程执行或 MCP 暴露。

## 2. Target User

### 2.1 Jobs To Be Done

- 作为设计管线维护者，我希望一次同步 DesignMD 等 Resource Source，就能获得分类、来源、许可证和内容 SHA-256 digest，避免手工复制和来源丢失。
- 作为前端实现者，我希望把 Figma、Penpot 或网页提取结果导入为本地设计工件，然后直接进入设计系统、组件和执行路由。
- 作为设计负责人，我希望知道一个设计建议来自哪里、何时抓取、是否可用、是否需要审核，以及它最终影响了哪次实现。
- 作为 Agent 操作者，我希望通过 Skill + CLI 使用管线，而不需要配置 MCP 服务或把远程工具作为隐式运行时依赖。
- 作为维护者，我希望资源站内容变化、抓取失败、许可证不明或工具版本漂移时，管线明确阻断或降级，而不是静默继续。

### 2.2 Non-Users (v1)

- 需要 Design Pipeline 作为通用 MCP Server 的用户。
- 需要管线自动替用户登录 Figma、Penpot、Webflow 或其他 SaaS 并修改远端设计文件的用户。
- 只需要临时复制一段灵感文字、不需要本地记录或验证的用户。
- 需要管线自动安装任意第三方 Skill、npm 包、浏览器插件或远程 CLI 的用户。

### 2.3 Key User Journeys

- **UJ-1. 林默同步 DesignMD 并获得可审计的本地资源目录。**
  - **Persona + context:** 林默维护一个本地设计管线，想让团队使用 DesignMD 的 Skill、模板、案例、指南和工具信息。
  - **Entry state:** 仓库已安装 Design Pipeline，但没有最新的 DesignMD 本地快照。
  - **Path:** 林默运行同步命令；管线抓取 Resource Source 索引和资源页；按资源类型归类并保存本地内容；记录来源 URL、许可证、抓取时间、SHA-256 digest 和错误；林默按 kind 或 query 搜索结果。
  - **Climax:** 他能看到一个资源是 `reference-only`、需要审核还是可以进入后续路由，并能定位到本地快照。
  - **Resolution:** 本地目录可被 Agent 和 CLI 重复读取；下次同步只需比较变化并重新验证。
  - **Edge case:** 某些页面返回 5xx 或许可证未知时，快照保留已成功内容，但同步状态为 blocked，不得报告为全量 ready。

- **UJ-2. 赵宁把设计工具导出物交给管线。**
  - **Persona + context:** 赵宁使用 Figma 或 Penpot 完成页面设计，需要让实现者获得可执行的设计约束，而不是只看一张截图。
  - **Entry state:** 赵宁拥有本地 JSON、SVG、PNG、tokens 或工具导出包；远端 API 不属于 v1，未来受控 Host 输入必须另行显式授权。
  - **Path:** 她提交导出物；管线检查路径、文件类型、来源和 SHA-256 digest；提取 tokens、组件、布局和证据映射；生成 DESIGN.md 或 UI IR，并记录 Evidence Receipt；若证据不足，则输出 blocked 状态和缺口。
  - **Climax:** 实现者得到绑定到原始导出物的设计工件和清晰的差异/缺口，而不是一条无法复核的“设计已导入”结论。
  - **Resolution:** 工件进入设计系统和执行路由，或以 blocked 状态等待补充证据。
  - **Edge case:** 只有截图、没有可编辑映射或来源 SHA-256 digest 时，管线可以保留视觉参考，但不能声称完成可编辑设计交接。

- **UJ-3. 陈凯让 Agent 根据用户需求选择资源和工具路线。**
  - **Persona + context:** 陈凯需要实现一个带数据表格、筛选和动效的 React 页面，既有项目约束，也有用户指定的视觉方向。
  - **Entry state:** Skill 已激活，CLI 可用，本地资源快照和项目工件存在。
  - **Path:** Agent 通过 Skill 读取需求；CLI 搜索本地资源；管线按能力、平台、项目现状、许可证和证据完整性排序；生成 toolchain plan 和 execution request；每个 slice 绑定明确 owner。
  - **Climax:** Agent 收到一条可执行的本地路线，且不会把只适合作为参考的资源站内容误当成实现源。
  - **Resolution:** 实现和验证沿同一条 route 完成；owner、plan hash 和 receipt 可被后续复核。
  - **Edge case:** Skill 文档与 CLI 公共入口不一致、plan hash 不一致或 slice owner 被替换时，管线拒绝交接并输出具体原因。

## 3. Glossary

- **Design Pipeline** — 本项目的本地优先设计工作流，负责设计输入、知识归一化、路由、实现交接和验证证据。
- **Resource Source** — 提供设计 Skill、模板、案例、指南或工具信息的资源站或上游仓库；正文统一使用此术语。
- **Resource Entry** — Resource Source 中可以被索引和检索的单条资源。
- **Local Snapshot** — Resource Entry 的本地内容、来源、版本、许可证、抓取状态和 `contentSha256` 的固定副本。
- **Design Tool** — 产生或消费设计工件的工具，例如 Figma、Penpot、网页提取器或设计系统工具。
- **Host（宿主环境）** — 提供 Design Tool 版本、凭据或本地能力的外部运行环境；v1 不依赖 Host 进行远端 API 调用。
- **Tool Connector** — Design Pipeline 内部用于读取、检查或转换 Design Tool 工件的本地连接器，不是 MCP Server，也不向外提供远程工具协议。
- **Design Artifact** — DESIGN.md、MOTION.md、tokens、UI IR、组件能力、截图或其他可被管线消费的本地工件。
- **Pipeline Route** — 根据能力、平台、项目状态、来源可信度和工具生命周期选出的处理路径。
- **Evidence Receipt** — 记录输入/输出工件、SHA-256 字段、工具版本、操作、状态和证据链接的结构化记录；design-tool receipt 是它的一个 provider-specific subtype。
- **MCP Service** — 本产品明确不提供的远程工具服务形态；它不是 Tool Connector 的同义词。
- **reference-only** — 只能作为搜索和设计判断参考，不能直接作为实现权威或自动安装来源的状态。
- **blocked** — 由于来源、许可证、安全、完整性、工具可用性或证据缺口，当前操作不得宣称 ready 的状态。
- **状态值约定** — sync status 使用 `ready`、`partial`、`blocked`；admission decision 使用 `reference-only`、`adopt`、`substitute`、`custom`、`blocked`；receipt validity 使用 `valid`、`invalid`；tool availability 使用 `available`、`unavailable`、`host-dependent`；需要人工判断时使用 `review-required`。

## 4. Features

### 4.1 Resource Source Synchronization

**Description:** Design Pipeline 可以同步一个 Resource Source 的索引和资源页，识别 Skill、template、example、guide、tool 五类 Resource Entry，保存为 Local Snapshot。同步必须有边界、有重试、有去重和有失败状态。实现 UJ-1。

**Functional Requirements:**

#### FR-1: 同步 Resource Source

维护者可以通过本地 CLI 指定 Resource Source 并同步其可发现资源。

**Consequences (testable):**
- 系统支持 DesignMD 的五类 Resource Entry，并为每条记录稳定 id、kind、标题、描述、URL、来源 URL 和本地内容路径。
- 系统限制抓取页数、并发数和超时；同一稳定 id 只产生一个本地条目。
- 抓取成功的内容可以写入 Local Snapshot；远程页面内容保持 inert，不作为脚本执行。

#### FR-2: 记录同步状态

维护者可以知道本次同步状态是否为 `ready`、`partial` 或 `blocked`。

**Consequences (testable):**
- 每次同步记录抓取页数、条目数、错误列表和同步状态。
- 任一资源抓取缺口会阻止全量 ready，但不会删除上一份有效 Local Snapshot。
- 同步对 5xx 具备有限重试；达到重试上限后错误可定位到具体 URL。

### 4.2 Resource Provenance and Admission

**Description:** 每个 Resource Entry 在影响 Pipeline Route 前必须经过来源、许可证、内容完整性和安全边界判断。实现 UJ-1、UJ-3。

**Functional Requirements:**

#### FR-3: 来源与 contentSha256 绑定

系统可以验证 Local Snapshot 与抓取内容的对应关系。

**Consequences (testable):**
- 每条 Resource Entry 保存 `contentSha256`；本地内容被修改后 `verify` 失败。
- 变更后的来源、revision 或 `contentSha256` 会被标记为 changed，而不是继续使用旧的 ready 状态。
- Search、inspect 和 route 输出必须能回到 Resource Source 和本地路径。

#### FR-4: 许可证与安全准入

系统可以区分已验证、未知和不允许的来源状态。

**Consequences (testable):**
- 许可证未知的 Resource Entry 可以被索引为 `reference-only`，但不能自动安装、执行或成为默认实现权威。
- 包含远程执行提示、脚本、命令或未声明网络行为的内容保持 inert，并进入 `review-required` 或 `blocked` 状态。
- 许可证、版本和来源缺口会出现在 inspect 和 route 的阻断原因中。

### 4.3 Design Tool Import

**Description:** Design Pipeline v1 通过用户提供的本地导出物接收 Design Tool 结果，优先支持 Figma、Penpot 和通用设计工件；远端 API、登录和云端写回不属于 v1。实现 UJ-2。

**Functional Requirements:**

#### FR-5: 本地设计工件导入

用户可以提交 JSON、SVG、PNG、tokens、组件清单和其他声明支持的导出物。

**Consequences (testable):**
- 系统拒绝 root 外路径、不可解析文件、未知格式和 SHA-256 不匹配的输入。
- 导入结果至少包含 source artifact、`sourceSha256`、provider、operation、availability、mappings、editable 和 evidence 字段。
- 只有具备可编辑映射和证据的输入才能产生 valid 的 Evidence Receipt。

#### FR-6: 设计工具能力探测

用户可以看到 Design Tool 在当前环境中的可用能力，而不触发安装或远端修改。

**Consequences (testable):**
- Figma、Penpot 等工具可声明为 host-dependent；本地导出路径在没有凭据时仍可用。
- 探测操作是 read-only，并记录版本、来源和 capability。
- 不可用工具必须提供降级路径，例如 DESIGN.md、tokens、UI IR 或截图证据。

#### v1 Design Tool Support Matrix

| Provider | Accepted source mode | Accepted v1 formats | Evidence and boundary |
| --- | --- | --- | --- |
| Figma | `local-file` | JSON、SVG、PNG、tokens | 生成 Evidence Receipt；不调用远端 API、不登录、不写回 |
| Penpot | `local-file` | JSON、SVG、PNG、tokens | 复用 Evidence Receipt；provider mapping 和 fidelity 在下游规格中冻结 |
| Other Design Tool | `local-file` when a fixture exists | 仅声明并验证过的格式 | 未完成可验证生命周期时只能是 `reference-only`、`review-required` 或 `blocked` |

### 4.4 Design Artifact Normalization

**Description:** 系统把 Local Snapshot 和 Design Tool 导入物归一化为 Design Artifact。实现 UJ-2、UJ-3。

**Functional Requirements:**

#### FR-7: 设计知识归一化

系统可以把资源和导入物映射到视觉风格、tokens、组件能力、动效、布局和工具能力。

**Consequences (testable):**
- Resource Entry 不会直接替换项目 DESIGN.md、MOTION.md 或现有组件；必须产生明确的 `reference-only`、`adopt`、`substitute` 或 `custom` 决策。
- 同一输入在相同项目上下文下生成确定性结果。
- 归一化结果保留原始来源和不确定性，不把推断内容伪装成事实。

### 4.5 Pipeline Route and Handoff

**Description:** 系统根据用户需求和项目上下文选择 Pipeline Route，并把已准入的 Design Artifact 交给实现阶段。实现 UJ-3。

#### FR-8: 路由与交接

Agent 可以通过 Skill + CLI 搜索并选择 Pipeline Route，再把结果交给实现阶段。

**Consequences (testable):**
- 公共 CLI 与 Skill 文档中的入口保持一致。
- toolchain plan、execution request、routeId、slice owner 和 plan hash 必须相互绑定。
- route owner 被替换、plan hash 不一致或资源状态为 blocked 时，execution route 拒绝交接。
- 任何交接不需要 MCP Service；CLI 输出必须是稳定 JSON contract。

### 4.6 Snapshot Maintenance and Recovery

**Description:** Local Snapshot 可以重复同步、验证、恢复和淘汰，不因一次网络失败破坏上一份有效内容。实现 UJ-1、UJ-3。

**Functional Requirements:**

#### FR-9: 可重复同步

维护者可以重复运行同步并识别新增、变更、消失和失败的 Resource Entry。

**Consequences (testable):**
- 同一来源和相同内容生成相同条目 SHA-256 digest 与稳定排序。
- 同步失败时保留上一份有效快照，并将本次状态标记为 blocked 或 partial。
- 过时条目不得自动继续获得 ready 资格。

#### FR-10: 可解释的恢复

维护者可以从同步结果定位下一个动作。

**Consequences (testable):**
- 错误输出包含 URL、失败原因和建议动作。
- verify 能区分内容篡改、来源缺失、抓取缺口和本地文件缺失。
- 失败不会执行远端内容，也不会修改项目依赖或远程设计工具。

## 5. Non-Goals (Explicit)

- 不提供 MCP Service，不实现 MCP tool discovery、MCP transport 或远程工具代理。
- 不自动登录、修改或发布到 Figma、Penpot、Webflow、Framer 或其他远端设计工具。
- 不把资源站的所有内容默认提升为项目实现权威。
- 不自动执行远程 SKILL.md、prompt、脚本、npm 包、浏览器插件或命令。
- 不绕过许可证、版权、品牌使用和第三方服务条款。
- 不在 v1 实现所有设计工具的双向实时协作和实时同步。

## 6. MVP Scope

### 6.1 In Scope

- DesignMD 五类资源的本地同步、分类、快照、`contentSha256`、搜索、inspect 和 verify。
- 受限并发、有限重试、稳定 id 去重、抓取错误和 blocked 状态。
- Figma、Penpot 和通用本地设计工件的导入契约。
- 设计工具 receipt、来源、许可证、安全和证据字段。
- Skill + CLI → local snapshot → toolchain/execution route 的交接测试。
- `reference-only`、adopt、substitute、custom 等准入状态。
- 与现有 OpenSpec、DESIGN.md、MOTION.md、design-system、prism、toolchain 和 execution 流程的兼容。

### 6.2 Out of Scope for MVP

- Figma/Penpot 远端双向写回；需要单独的授权、审计和变更冲突方案。
- 不自动 hydrate 任何未验证许可证资源的源码；先保留来源信息，并将内容标记为 `reference-only`。
- DesignMD 之外资源站的通用爬虫平台；v1 先抽象 Resource Source 接口并接入一个真实源。
- 后台定时任务和云端同步服务；先支持 CLI 触发的可重复同步。
- MCP Service 和 MCP transport。

## 7. Cross-Cutting NFRs

### 7.1 Safety and Data Governance

- **NFR-1:** 所有抓取内容默认 inert；HTML、Markdown、prompt、命令和脚本不在同步阶段执行。
- **NFR-2:** 远程凭据不写入快照、日志、URL 或 Evidence Receipt；Host-dependent 工具必须显式声明凭据要求。
- **NFR-3:** 项目路径、输出路径和证据路径必须保持在 `--root` 内。
- **NFR-4:** 每份快照保留来源、抓取时间、revision（若有）、许可证状态和 `contentSha256`。

### 7.2 Determinism and Reliability

- **NFR-5:** 相同来源、相同内容和相同选项生成稳定排序、稳定 id 和稳定 SHA-256 digest。
- **NFR-6:** 网络失败、5xx、超时和内容变化必须是可见状态，不得静默 ready。
- **NFR-7:** 同步和 verify 不得修改目标项目依赖、远端设计文件或 OpenSpec 历史。

### 7.3 Performance

- **NFR-8:** 默认同步使用有限并发；并发、页数、超时和重试均有上限。
- **NFR-9:** 搜索 Local Snapshot 不依赖网络，常规查询在本地完成。
- **NFR-10:** 单个资源内容和整体快照大小需要在输出中可观测；大资源应通过独立 content path 保存。

### 7.4 Public Surface and Compatibility

- **NFR-11:** CLI 输出使用版本化 JSON envelope，退出码区分 success、blocked 和 invalid。
- **NFR-12:** Skill 文档、公共 help、CLI dispatch 和测试必须保持入口一致。
- **NFR-13:** Tool Connector 是内部管线能力，不得被文档描述为 MCP Service。

## 8. Success Metrics

**Primary**

- **SM-1:** DesignMD 全量同步在一次正常网络运行中覆盖所有可发现 Resource Entry，验证 0 个未解释抓取错误。验证 FR-1、FR-2、FR-9。
- **SM-2:** 100% 进入 route 的 Resource Entry 都能回溯到来源 URL、本地路径和 `contentSha256`。验证 FR-3、FR-7、FR-8。
- **SM-3:** 100% 的 Skill → CLI → toolchain/execution 交接测试能拒绝 SHA-256 漂移和错误 owner。验证 FR-8、FR-10。

**Secondary**

- **SM-4:** Figma、Penpot 和通用本地导出物至少各有一条可验证的导入路径。验证 FR-5、FR-6。
- **SM-5:** 资源同步失败不会破坏上一份有效 Local Snapshot。验证 FR-2、FR-9。

**Counter-metrics (do not optimize)**

- **SM-C1:** 不以同步条目数量最大化为目标；条目数增长不能以许可证、安全、来源和验证质量下降为代价。
- **SM-C2:** 不以支持的 Design Tool 数量最大化为目标；没有可验证生命周期和降级路径的工具不得标记为 ready。

## 9. Decisions and Deferred Mechanisms

1. **MVP 不自动 hydrate 上游 Skill 源码。** DesignMD v1 只内化页面、元数据、来源和 `contentSha256`；源码安装必须走单独显式、许可证绑定的流程。
2. **Figma/Penpot v1 只接受本地导出物。** 首批格式为 JSON/SVG/PNG/tokens，不接远端 API、不登录、不写回云端文件。
3. **首个外部设计工具连接器优先实现 Figma 本地导出。** Penpot 同属 v1 本地导出支持范围，但 provider mapping 和 fidelity threshold 属于下游实现规格；网页提取沿用现有管线。
4. Resource Source 的同步预算先使用管线默认边界；多源独立预算在实际出现隔离需求后再增加。
5. 默认仍为 `reference-only`；任何 `adopt` 候选都必须显式选择，并通过来源、许可证、安全、版本和项目适配门禁。

## 10. Assumptions Index

- `[ASSUMPTION: Fast path]` 本 PRD 按 Fast path 初稿处理，因为当前已明确产品边界和实现上下文；用户可以在 review 时补充未覆盖的商业或团队约束。
- `[ASSUMPTION: Local-first]` v1 的主要消费方式是本地 Skill + CLI + 文件工件，不依赖 MCP Service 或云端同步。
- `[ASSUMPTION: Export-first]` Figma/Penpot v1 先支持本地导出物；远端 API 和写回明确不属于 v1。

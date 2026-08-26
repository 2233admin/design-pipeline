---
id: SPEC-design-pipeline
companions:
  - implementation-contract.md
  - ../../planning-artifacts/architecture/architecture-design-pipeline-2026-08-23/ARCHITECTURE-SPINE.md
  - ../../../CONTEXT.md
sources:
  - ../../planning-artifacts/prds/prd-design-pipeline-2026-08-23/prd.md
---

> **Canonical contract.** 本 SPEC 与 companions 是 Design Pipeline 后续实现、测试和验证必须遵守的完整契约。

# Design Pipeline 多来源设计输入规格

## Why

这是一个“痛点 + 愿景”规格：设计管线目前能路由和交接，但资源站、设计工具导出物、用户/项目上下文和执行证据还没有统一的本地契约。维护者需要可审计的资源快照，实现者需要可验证的设计工件，Agent 需要不会静默降级或绕过准入的路由；现在必须把这些输入收敛为同一条 Skill + CLI 本地管线。

## Capabilities

- **CAP-1**
  - **intent:** 维护者可以同步 DesignMD 的可发现一方资源并获得稳定分类、来源、内容和同步状态。
  - **success:** 五类资源可被搜索和 inspect；页数、并发、超时、重试、去重和 URL 级错误均可验证，部分结果不会伪装成全量 ready。

- **CAP-2**
  - **intent:** 系统可以把资源来源、许可证、安全、内容 hash 和 admission 状态绑定到本地条目。
  - **success:** 未知或不安全资源保持 `reference-only`、`review` 或 `blocked`，不能成为默认实现权威、自动安装源或执行输入。

- **CAP-3**
  - **intent:** 用户可以提交声明支持的 Figma、Penpot 或通用本地设计导出物。
  - **success:** 输入经过根目录、格式、文件和字节 hash 校验并生成 provider-neutral receipt；receipt 校验存在不等于 importer 已完成。

- **CAP-4**
  - **intent:** 系统可以把资源和工具输入归一化为保留语义、来源、映射、可编辑性和保真损失的 Design Artifact。
  - **success:** 缺失语义被显式记录，provider 原始模型不泄漏到路由层，重复输入和上下文产生确定性结果。

- **CAP-5**
  - **intent:** 系统可以只读探测工具和能力在当前环境中的版本、输入模式、生命周期、可用性和 fallback。
  - **success:** 只有具备经测试的真实 executable lifecycle、证据检查点和 fallback 的能力才能标记 `ready`；agent-owned、manual、reference-only 和未验证能力保持非 ready 状态。

- **CAP-6**
  - **intent:** Agent 可以依据需求、项目上下文和准入状态选择唯一 primary route，并完成 Skill → CLI → toolchain/execution 交接。
  - **success:** routeId、owner、输入/资源 hash 和 plan hash 全链路绑定；hash 漂移、owner 替换或 blocked 输入会拒绝交接，且不需要 MCP Service。

- **CAP-7**
  - **intent:** 系统可以使用有限的任务、项目、用户协作上下文改善能力选择和交接。
  - **success:** 上下文按 `task > project > user > defaults` 生效，可审计且 shadow-only；不保存原始对话、秘密或敏感人格推断，也不能覆盖 Kernel、项目约束或安全 gates。

- **CAP-8**
  - **intent:** 维护者可以重复同步快照并识别新增、变更、消失、失败和过时条目，在失败时恢复上一份有效快照。
  - **success:** diff receipt 包含前后 snapshot hash 和各类变化；全失败、部分失败和恢复均返回稳定 envelope，stale/disappeared 条目不能继续获得 ready 资格。

## Constraints

- 产品是本地优先的 Skill + CLI + 文件系统，不是 MCP 服务；网络只作为可选读取输入，不能成为执行运行时依赖。
- 远程 HTML、Markdown、prompt、脚本、命令、npm 包和插件默认 inert；不自动 hydrate、安装、执行或绕过许可证与服务条款。
- 外部抓取必须执行 robots、公开目标与重定向校验、凭据和敏感 query 过滤，以及响应大小、页数、并发、超时和重试上限；策略不可用时只能 `blocked` 或 `partial`。
- Catalog contentPath、artifact 和 evidence 路径必须声明基准并通过 realpath containment；拒绝 traversal、绝对路径、symlink/junction escape 和非文件目标。
- 快照候选必须先验证再原子发布；失败保留 last-known-good。JSON envelope、hash、排序、时间戳和 domain-status/exit-class 映射必须确定性且版本化。
- `ready` 只表示存在经测试的可执行生命周期；`review`、`blocked`、`invalid`、`fidelity-mismatch`、`agent-owned`、`manual` 和 `reference-only` 不能隐式升级或降级。
- 上下文优先级固定为 `task > project > user > defaults`；Methodology Kernel、项目约束、许可证和安全 gates 不可被适应策略覆盖。
- 支持 Node.js 22+；Python 只由 BMAD 技能通过 uv 运行；v1 不做 Figma/Penpot/API 登录、远端写回、后台调度或云端同步。

## Non-goals

- 不提供 MCP Service、MCP transport 或远程工具代理。
- 不自动登录、修改或发布到 Figma、Penpot、Webflow、Framer 或其他远端设计工具。
- 不把资源站全部内容默认提升为项目实现权威，也不自动执行或安装任意第三方 Skill、包、插件或命令。
- v1 不实现所有设计工具的双向实时协作、实时同步或云端后台同步。
- 不把用户协作上下文扩展为人格诊断、行为画像或原始会话档案。

## Success signal

在本地 fixture 和受控网络测试中，用户可以完成“DesignMD 同步 → 准入/verify → 本地设计工件 receipt → 唯一路由 → toolchain/execution”，所有结果都能回到来源 URL、文件路径、内容 hash、owner 和 plan hash；任一安全、许可、完整性或生命周期缺口都会明确阻断，并保留上一份有效快照。

## Assumptions

- v1 的 DesignMD 完整性是完整发现一方目录页面并保留受治理的外部引用，不递归抓取每个外部工具供应商。
- Figma/Penpot v1 固定走 `local-file` export-first 路线；受控 plugin-export、安全本地 archive 和远端 API 不是 v1 ready 能力，后续扩展需另行定义。
- 当前 receipt、路由、原子快照和部分 handoff 校验是 brownfield 基线；安全抓取、完整 importer、全链路 source hash 和 ready lifecycle 仍需交付。

## Open Questions

- Figma/Penpot 各 provider 的字段映射、fidelity threshold 和可编辑边界如何在下游规格中冻结？
- response-byte cap、lock timeout、retention 和 retry budget 的默认数值与 source 配置边界是什么？
- 公共 CLI 的 domain status 与 process exit class 的最终映射表及旧命令兼容策略是什么？
- agent-owned/manual route 的 Skill action、evidence checkpoint 和用户确认边界如何定义？
- DesignMD diff receipt 的 revision、stale 保留期限和 route admission 阻断规则是否按资源 kind 区分？

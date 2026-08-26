# Addendum: 多来源设计输入的实现边界

本文档保存 PRD 不应承载的机制细节和已讨论的替代方案。它不替代 PRD 中的功能要求。

## 已确认的机制边界

- 运行形态是本地 `SKILL + CLI + 文件工件`。Skill 负责激活任务并编排任务意图，CLI 负责稳定 dispatch，脚本负责同步、归一化、校验和路由。
- DesignMD 同步器使用站点索引和页面链接发现 Resource Entry，保存 inert 内容快照、来源 URL、外部来源链接、许可证信号和 `contentSha256`。
- 同步器使用有限并发、有限重试、稳定 id 去重和 blocked 状态。同步缺口不能被报告成全量 ready。
- Design Tool 导入在 v1 只接收本地导出物。未来若支持受控 Host，必须显式凭据和可验证 Evidence Receipt；不因为工具存在 API 就自动调用 API。
- PRD 的 `sourceSha256` 在嵌套 Evidence Receipt 中表示为 `source.sha256`；二者都是输入工件字节的 SHA-256 digest，不是两套完整性字段。
- 资源搜索结果默认是 `reference-only`。进入 `adopt`、`substitute` 或 `custom` 决策前必须经过项目上下文、来源和许可证判断。

## 路由映射

| FR/UJ | 输入 | 默认管线落点 | 可用结果 |
| --- | --- | --- | --- |
| FR-7 / UJ-3 | Skill | capability / Prism route | Skill sequence、reference-only、review-required |
| FR-7 / UJ-3 | Template | design-system route | tokens、component candidates、template reference |
| FR-7 / UJ-3 | Example | style-signal / reference-only route | visual direction、anti-pattern、reference evidence |
| FR-7 / UJ-3 | Guide | local knowledge reference | decision guidance、implementation checklist |
| FR-6 / FR-8 / UJ-3 | Tool / CLI | toolchain route | probe、plan、degradation、Evidence Receipt |
| FR-5 / FR-7 / UJ-2 | Figma/Penpot export | design artifact intake | DESIGN.md、tokens、UI IR、component mappings |

## 明确不采用的方案

### 不做 MCP Server

MCP 会使读者把本地设计管线误解为远程工具服务，并引入 transport、credential 和 Host 生命周期。当前需求是让 Agent 通过 Skill 激活后把任务投递给本地 CLI，所以 MCP 不是必要依赖。

### 不把 Resource Source 内容直接写入全局 Agent 指令

Resource Source 内容保持在 Local Snapshot 和项目级 Design Artifact 中。直接追加到全局指令会造成来源污染、难以回滚和跨项目上下文污染。

### 不默认 hydrate 所有上游源码

目录页可以自动抓取和内化；上游源码、插件、npm 包和远端命令必须额外通过许可证、revision、权限和安全准入。否则只保留来源和 `reference-only` 内容。

## 已确认的下游实现细节

- Figma/Penpot v1 已确定只支持用户导出 JSON/SVG/PNG/tokens，暂不接远端 API；具体 provider mapping 和 fidelity threshold 由下游规格冻结。
- 已验证许可证的 Skill 源码 hydrate 不属于 MVP，后续必须通过显式、许可证绑定的独立流程。
- 首个外部设计工具连接器优先实现 Figma 本地导出；Penpot 同属 v1 本地导出支持范围，但 provider mapping 和 fidelity threshold 由下游规格冻结，网页提取继续使用现有管线。

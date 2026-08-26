# PRD Prose Review Final R2

## Verdict

NEEDS REVISION

## Scope

Reviewed `prd.md` and `addendum.md` with `skill:bmad-review lenses=prose`.

This document exists to help product owners, design pipeline maintainers, architects, and implementers agree on the v1 boundary for multi-source design inputs and carry that boundary into architecture, specs, epics, stories, and tests.

Exact word counts from `word_metrics.py`: `prd.md` 5,123 words; `addendum.md` 735 words; combined 5,858 words.

Preserve: mixed Chinese/English for product terms, field names, CLI terms, and status literals; local-first / non-MCP / export-first language; direct testable requirement style.

## Findings

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | `prd.md:53`: `是否使用远端 API 是显式选择。` Evidence conflict: `prd.md:134`, `prd.md:294`, `prd.md:303`, `addendum.md:10`, and `addendum.md:40` all say v1 only accepts local exports and does not use remote APIs. | `赵宁拥有本地 JSON、SVG、PNG、tokens 或工具导出包；远端 API 不属于 v1，未来受控 Host 输入必须另行显式授权。` | Removes a v1 boundary contradiction. Current wording can be read as “remote API is available in this journey if explicitly selected,” which conflicts with the confirmed local-file-only decision. |
| prose | `prd.md:161`: `Penpot ... provider mapping 和 fidelity 在下游规格中冻结`; `prd.md:294`: `Figma/Penpot v1 只接受本地导出物`; `prd.md:295`: `Penpot 后续复用 Evidence Receipt 契约`; `addendum.md:42`: `Penpot 复用 Evidence Receipt 契约`. | `首个外部设计工具连接器优先实现 Figma 本地导出；Penpot 同属 v1 本地导出支持范围，但 provider mapping 和 fidelity threshold 由下游规格冻结。` | Clarifies that Penpot is in v1 scope but lower implementation priority. `后续复用` currently sounds like Penpot is deferred out of v1, which conflicts with the support matrix and decision 2. |
| prose | Status-like values are spread across domains without a canonical state set: `reference-only` / `blocked` in `prd.md:79-80`; `ready` / `changed` in `prd.md:120`; `审核` / `blocked` in `prd.md:129`; `valid` in `prd.md:145`; `reference、review 或 blocked` in `prd.md:162`; `reference、adopt、substitute 或 custom` in `prd.md:175`; `partial` in `prd.md:205`; `success、blocked 和 invalid` in `prd.md:269`; `reference、review` in `addendum.md:17`. | Add one canonical “状态值” note, or define by domain at first use: sync status `ready` / `partial` / `blocked`; admission decision `reference-only` / `adopt` / `substitute` / `custom` / `blocked`; receipt validity `valid` / `invalid`; tool availability `available` / `unavailable` / `host-dependent`. Replace bare `reference` with `reference-only` when it means that state, and use `review-required` only if it is a real state. | Prevents downstream specs from inventing incompatible enums. This is the largest remaining prose risk because the same English words are used as status values, decisions, route outputs, and ordinary adjectives. |
| prose | `prd.md:54`: `生成 DESIGN.md、UI IR 或 Evidence Receipt`; `prd.md:77`: Evidence Receipt records input/output artifacts; `prd.md:145`: valid Evidence Receipt requires editable mappings and evidence. | `生成 DESIGN.md 或 UI IR，并记录 Evidence Receipt；若证据不足，则输出 blocked 状态和缺口。` | Makes Evidence Receipt a receipt for the operation, not an alternative output to the design artifact. The current `或` can lead implementers to produce only a receipt and skip normalized artifacts, or to treat receipts as peer design artifacts. |
| prose | `prd.md:28` and `prd.md:46` use `内容 SHA-256 digest`; `prd.md:54` and `prd.md:57` use `来源 SHA-256 digest`; `prd.md:119` and `prd.md:144` define `contentSha256` and `sourceSha256`; `prd.md:204` introduces `条目 hash`; `prd.md:257` uses generic `SHA-256 digest`. | For Resource Entry text, use `contentSha256` after the first “内容 SHA-256 digest” mention. For Design Tool imports, use `sourceSha256`. Change `条目 hash` to `条目 SHA-256 digest` or explicitly define it if it differs from `contentSha256`. | The field split is conceptually correct, but the narrative still blurs content digest, source artifact digest, and entry hash. This can cause schema drift between resource snapshots and design-tool receipts. |
| prose | `prd.md:95`: `URL、来源 URL`; `addendum.md:8`: `来源 URL、外部来源链接`. | `资源 URL、来源页面 URL（若不同）、外部来源链接（若有）和本地内容路径`. | Distinguishes the indexed resource URL from its source page and any external upstream link. Current wording gives two or three URL concepts without enough labels to implement the fields consistently. |
| prose | `prd.md:14`: `未来受控 Host`; `prd.md:152`: `host-dependent`; `prd.md:251`: `Host-dependent`; `addendum.md:10`: `受控 Host`; `addendum.md:28`: `host 生命周期`. | First occurrence: `宿主环境（Host）`; state literal: ``host-dependent``. Example: `未来受控宿主环境（Host）输入必须明确授权。` | Host is not in the glossary, and the text alternates between Chinese modifiers and English status casing. Defining it once keeps “future controlled host,” “host-dependent tool,” and “host lifecycle” from reading like separate concepts. |
| prose | `addendum.md:7`: `Skill 负责激活和编排意图`; `addendum.md:28`: `MCP 会把本地设计管线误化为远程工具服务`; `addendum.md:32`: `跨项目串味`. | `Skill 负责激活任务并编排任务意图`; `MCP 会使读者把本地设计管线误解为远程工具服务`; `跨项目上下文污染`. | Fixes three Chinese phrasing issues that impede a formal PRD/addendum read. `误化` is unnatural, `串味` is too colloquial for the surrounding technical tone, and `编排意图` lacks a clear object. |
| prose | `prd.md:241`: `任何未验证许可证资源的源码自动 hydrate；先保留来源和参考内容。`; `addendum.md:36`: `否则只保留来源和 reference-only 内容。` | `不自动 hydrate 任何未验证许可证资源的源码；先保留来源信息，并将内容标记为 reference-only。` | Clarifies the object being retained and keeps `reference-only` as a state, not a kind of content. This also removes the sentence-fragment feel in the MVP out-of-scope list. |

## Clean Evidence

- `Resource Source`, `Resource Entry`, `Local Snapshot`, `Design Tool`, `Tool Connector`, `Design Artifact`, `Pipeline Route`, and `Evidence Receipt` are now used consistently enough as primary glossary terms across both files.
- The core decisions do not conflict on the big product boundary: local-first, not an MCP Service, inert remote content, no automatic remote execution, no automatic Figma/Penpot writeback, and explicit admission before route impact.
- The `contentSha256` / `sourceSha256` split is directionally sound; the remaining issue is wording precision around generic SHA-256 mentions, not the underlying field model.

## PASS Criteria for Next Round

PASS when the report findings above are resolved or explicitly accepted as intentional wording, especially the v1 remote API sentence, Penpot priority wording, and canonical status value set.

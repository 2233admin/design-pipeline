# Editorial Structure Review — Design Pipeline 多来源设计工具与资源站支持

Purpose read: this document exists to help pipeline owners and downstream architecture/story workflows decide what multi-source design inputs the product supports and what it refuses to do.

Chosen structure model: Strategic/Context (Pyramid), with a capability-spec spine for the FRs.

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | §0 + §1 — purpose, vision, and current baseline | PRESERVE | The baseline is now placed before the feature detail, which prevents readers from mistaking the PRD for a greenfield MCP integration. |
| structure | §4.1–§4.5 — five feature groups | PRESERVE | The grouping is MECE enough for a chain-top PRD: source sync, admission, tool import, routing, and maintenance. |
| structure | §5 Non-Goals and §6.2 Out of Scope | PRESERVE | They overlap in topic but serve different readers: §5 defines identity boundaries; §6.2 defines MVP deferrals. |
| structure | §9 Open Questions | QUESTION | The questions are useful, but mark §9.1, §9.2, and §9.5 as architecture-blocking so they cannot disappear into backlog grooming. |

Summary: 4 structural recommendations, 0-cut reduction. The document is about 4,786 words; cutting the non-goal and addendum boundaries would reduce clarity more than length. The main structural action is to surface the three architecture-blocking decisions, not to shorten the PRD.

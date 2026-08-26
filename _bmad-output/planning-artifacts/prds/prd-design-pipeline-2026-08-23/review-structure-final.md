# BMAD Review — Structure Lens

## Verdict

**NEEDS REVISION**

## Review scope

- Reviewed: `prd.md` and `addendum.md`
- Lens: `structure` only
- Scope: document hierarchy, FR/UJ/SM/NFR organization, cross-references, and downstream usability
- Original size: PRD 4,932 words; addendum 682 words; combined 5,614 words
- Structure model: **Strategic/Context (Pyramid)** for the PRD, with a **Reference/Database** companion shape for the addendum
- Content and product decisions were treated as fixed; findings concern only organization and handoff clarity

## Purpose read

These documents exist to help product owners, pipeline maintainers, architects, and implementers decide the supported design-input boundary and derive an unambiguous Architecture, SPEC, Epic, Story, and test plan.

## Findings

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | `prd.md §9 Decisions and Remaining Questions`; `addendum.md §当前待决机制` | **MERGE** the three confirmed decisions into one canonical `Decisions` section; rename the PRD heading to `Decisions`; either remove the duplicate addendum section or replace it with only genuinely unresolved items carrying IDs. | The same Figma/Penpot export, hydrate, and connector-priority decisions are presented as confirmed in the PRD but pending in the addendum. Downstream SPEC still exposes related open questions while `epics.md` treats them as settled. This creates competing sources of truth. Removing the duplicated addendum section saves approximately 98 words. |
| structure | `prd.md §7.1–§7.4 Cross-Cutting NFRs` | **CONDENSE** the existing NFR bullets into stable IDs (`NFR-1` … `NFR-10`) or a numbered cross-cutting requirements table, then reference those IDs from Epics, Stories, Architecture, and tests. | The PRD has no NFR identifiers, while downstream `epics.md` invents `NFR1`–`NFR10`. A consumer cannot reliably trace a downstream constraint back to a source requirement. The change is format-only and should have approximately zero net word impact. |
| structure | `prd.md §4.4 Design Artifact Normalization and Routing` containing both `FR-7` and `FR-8` | **SPLIT** into separate feature groups: `Design Artifact Normalization` for FR-7 and `Routing and Handoff` for FR-8; keep the shared dependency explicit. | FR-7 and FR-8 have different owners, inputs, outputs, and downstream Epics, but the current heading makes them one capability. Splitting the section makes extraction into Epic 3 versus Epic 4 deterministic without changing requirements. Word impact is approximately neutral. |
| structure | `prd.md FR-5`, `§6.1`, `§9.2–§9.3`; `addendum.md §已确认的机制边界` and `§当前待决机制` | **MOVE** the scattered provider/source-mode/format statements into one compact v1 support matrix: provider, accepted source mode, accepted format, output contract, and non-ready fallback. | “JSON/SVG/PNG/tokens”, `local-file`, `controlled-plugin-export`, and `safe-local-archive` are distributed across sections and are not consistently presented as scope versus future mechanism. A single matrix prevents Story and test authors from interpreting “other declared supported exports” differently. Estimated addition: 40–60 words, mostly replacing repeated prose. |
| structure | `addendum.md §路由映射` | **MOVE** the mechanism-level route table to Architecture/SPEC, or retain it here only with explicit `FR`, `UJ`, and glossary anchors for every route term. | The table introduces `Prism route`, `style-signal`, `design-system route`, and `toolchain route` without stable source IDs or glossary definitions. It is therefore neither a self-contained reference nor a reliable PRD traceability map. Moving the 89-word table downstream preserves detail while keeping the PRD pair at product-boundary level. |

## What to preserve

- Preserve the current top-level order: purpose/boundary → vision/users → journeys → glossary → FRs → non-goals/MVP → NFRs → metrics → decisions/assumptions. It fits the Strategic/Context model and gives downstream readers the needed context before detail.
- Preserve the separation between `Non-Goals` and `Out of Scope for MVP`; they serve different purposes when the headings explicitly say identity boundary versus delivery deferral.
- Preserve the UJ, FR, and SM identifiers and the inline links already present. The missing piece is a compact canonical cross-reference view, not a renumbering exercise.

## Summary

Five structural recommendations. If accepted, approximately 98 duplicate words can be removed from the addendum and approximately 40–60 words added for the support matrix; the remaining changes are moves, renames, or IDs. Estimated net change: **about 0–40 words added**, or **0.0%–0.7%** of the 5,614-word combined source. No length target was provided. The main trade-off is a small amount of tabular scaffolding in exchange for one source of truth and deterministic downstream extraction.

No source document was modified by this review.

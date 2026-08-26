# Structure Review Final R2

**Verdict: NEEDS REVISION**

This document set exists to help product, architecture, and implementation owners preserve one stable contract from PRD to addendum to epics/story acceptance criteria.

Review lens: `bmad-review` / `structure`  
Structure model: Strategic/Context (Pyramid)  
Reader type: humans  
Scope: `prd.md`, `addendum.md`, `epics.md` only  
Standing context: no `project-context.md` file was found for the configured persistent-facts glob.  
Word metrics: `prd.md` 5,123 words; `addendum.md` 735 words; `epics.md` 6,125 words; total 11,983 words.

## Gate Check

| Check | Result | Evidence |
| --- | --- | --- |
| Decisions / assumptions / open items consistency | PASS | PRD decisions freeze local-first, export-first, no MCP, reference-only defaults, and deferred provider mapping at `prd.md:291-303`; addendum repeats the same mechanism boundaries at `addendum.md:5-11` and downstream-detail boundary at `addendum.md:38-42`. No contradictory open item/TBD was found in the reviewed files. |
| FR stable numbering | NEEDS REVISION | PRD defines anchors as `FR-1` ... `FR-10` at `prd.md:90-208`, while epics rewrites them as `FR1` ... `FR10` in inventory, coverage map, epic coverage, and story coverage at `epics.md:19-28`, `epics.md:67-76`, `epics.md:83-101`, `epics.md:114-456`. |
| NFR stable numbering | NEEDS REVISION | PRD `NFR-1` means inert fetched content at `prd.md:250`; epics `NFR-1` means local-first / no MCP at `epics.md:32`. PRD `NFR-2` means credential handling at `prd.md:251`; epics `NFR-2` combines inert execution, hydrate/install, licensing, and credentials at `epics.md:33`. This is semantic renumbering, not just expanded detail. |
| Figma / Penpot support matrix | NEEDS REVISION | PRD matrix freezes Figma and Penpot v1 formats as JSON/SVG/PNG/tokens at `prd.md:156-162`; addendum confirms the same at `addendum.md:40`. Epics introduces `.penpot` archive / archive-member handling at `epics.md:53` and `epics.md:294-296` without updating the matrix or marking it as future-only. |
| Addendum routing FR/UJ anchors | PASS | Every routing row uses existing PRD anchors: `FR-7 / UJ-3`, `FR-6 / FR-8 / UJ-3`, and `FR-5 / FR-7 / UJ-2` at `addendum.md:15-22`; those anchors exist in PRD at `prd.md:51-65`, `prd.md:147-183`. |
| Downstream contract consistency | NEEDS REVISION | The NFR anchor drift above makes epics' downstream requirement inventory unsafe as a contract. FR-5 also names `sourceSha256` in PRD at `prd.md:144`, while epics stories require nested `source.sha256` at `epics.md:240` and `epics.md:252`; no mapping states these are the same field. |

## Findings

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | `prd.md:90-208` uses `FR-1` ... `FR-10`; `epics.md:19-28`, `epics.md:67-76`, and story blocks use `FR1` ... `FR10`. | **MERGE anchor style:** use `FR-1` ... `FR-10` everywhere, including epics inventory, coverage map, `FRs covered`, and `FRs addressed`. | Fixes broken downstream FR anchors. Word impact: near-neutral, mostly hyphen insertion. |
| structure | PRD NFR definitions at `prd.md:250-271` and epics NFR inventory at `epics.md:32-44`. | **MOVE / RENUMBER:** keep PRD NFR IDs immutable in epics. If epics needs extra architecture-derived NFRs such as network safety, path safety, context governance, or runtime baseline, add them as new IDs or mark them as architecture constraints without reusing PRD IDs. | Prevents NFR-1/NFR-2 consumers from testing the wrong requirement. Word impact: moderate rewrite of ~589-word epics NFR inventory; no expected reduction. |
| structure | PRD/addendum freeze Penpot v1 formats to JSON/SVG/PNG/tokens at `prd.md:160-161` and `addendum.md:40`; epics adds `.penpot`/archive behavior at `epics.md:53`, `epics.md:294-296`. | **QUESTION / DECIDE:** either add Penpot archive to the PRD support matrix and addendum boundary, or move archive handling out of v1 epics as a future/downstream-only detail. | Removes a silent scope expansion in Story 2.3. Word impact: +10 to +30 words if matrix is updated, or -40 to -60 words if archive AC is deferred. |
| structure | PRD FR-5 requires `sourceSha256` at `prd.md:144`; epics requires `source.sha256` at `epics.md:240`, `epics.md:252`, `epics.md:292`. | **MERGE field contract:** choose one canonical receipt field shape, or add an explicit alias/mapping note in PRD/addendum before epics consumes the nested form. | Prevents implementers from producing two incompatible receipt schemas. Word impact: +15 to +25 words. |
| structure | `addendum.md:15-22` route mapping. | **PRESERVE:** keep the addendum route mapping as-is once FR hyphen style is normalized. The rows point to valid UJ/FR anchors and do not introduce an extra route contract. | No change needed. Word impact: 0. |

## Required Fixes Before PASS

1. Normalize FR anchors to the PRD form `FR-#` across `epics.md`.
2. Restore NFR IDs to the PRD meanings, or move extra architecture/runtime constraints under separate non-PRD IDs.
3. Resolve Penpot archive support as either v1 matrix scope or deferred scope.
4. Canonicalize the FR-5 receipt hash field as either `sourceSha256` or `source.sha256`.

After those four fixes, the structure should pass: the decisions, assumptions, no-MCP boundary, addendum route anchors, UJ coverage, and epic grouping are otherwise coherent.

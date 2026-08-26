# Final Prose Review R3

Verdict: **NEEDS REVISION**

This document set exists to help product, architecture, and implementation owners preserve the v1 local-first design-input contract across PRD, addendum, and epic/story handoff. Review lens: `bmad-review` / `prose`.

## Scope and Evidence

- Reviewed files:
  - `prd.md` (5,232 words)
  - `addendum.md` (803 words)
  - `_bmad-output/planning-artifacts/epics.md` (5,969 words)
- Persistent context: no `project-context.md` files were present under the project root.
- Requested checks: `local-file` v1 boundary, Penpot priority, state value convention, and `Resource Source` / `Evidence Receipt` / `SHA-256` / `Host` terminology.

## Gate Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `local-file` v1 boundary | PASS | PRD states v1 Design Tool input only enters through local exports and excludes remote API/login/writeback (`prd.md:14`, `prd.md:136`, `prd.md:162-164`, `prd.md:296`, `prd.md:305`). Addendum repeats local exports only and separates future controlled Host support (`addendum.md:10`, `addendum.md:41`). Epics fix v1 source mode as `local-file` and keep other modes as future extensions (`epics.md:52-53`). |
| Penpot priority and scope | PASS | PRD gives Figma and Penpot both v1 local-file support while explicitly making the first external connector Figma local export and freezing Penpot mapping/fidelity downstream (`prd.md:162-163`, `prd.md:296-297`). Addendum repeats the same priority split (`addendum.md:41`, `addendum.md:43`). Epics give Penpot its own receipt story and forbid `.penpot` archive readiness in v1 (`epics.md:280-304`). |
| State value convention | NEEDS REVISION | PRD defines canonical values in `prd.md:82`, but several passages use non-canonical labels or prose substitutes: `完整/部分/blocked` (`prd.md:103`, `epics.md:20`, `epics.md:68`), `审核或 blocked 状态` (`prd.md:131`), `review` (`addendum.md:18`, `epics.md:296`). |
| `Resource Source` terminology | PASS | The glossary defines `Resource Source` (`prd.md:70`) and the body consistently uses it for upstream resource providers and sync contracts (`prd.md:86-94`, `prd.md:123`, `addendum.md:31-33`, `epics.md:19`, `epics.md:49-50`). |
| `Evidence Receipt` terminology | PASS | The glossary defines `Evidence Receipt` as a structured record and design-tool subtype (`prd.md:78`). PRD/addendum/epics consistently use it for import evidence and handoff receipts (`prd.md:54`, `prd.md:147`, `prd.md:253`, `addendum.md:10-11`, `epics.md:52`, `epics.md:252`). |
| `SHA-256` / digest terminology | PASS | PRD consistently distinguishes `contentSha256` for Resource Entry / Local Snapshot and `sourceSha256` for imported design artifacts (`prd.md:72`, `prd.md:116-122`, `prd.md:145-146`). Addendum explicitly maps `sourceSha256` to `source.sha256` inside nested receipts (`addendum.md:11`). Epics use `contentSha256` and `source.sha256` in the corresponding stories (`epics.md:121`, `epics.md:240`, `epics.md:252`). |
| `Host` terminology | PASS | PRD defines Host as the external runtime environment and says v1 does not depend on Host remote API calls (`prd.md:74`). Addendum limits future controlled Host support to explicit credentials and verifiable receipt (`addendum.md:10`, `addendum.md:29`). Epics keep capability probe read-only and mark Host-dependent tools without triggering credential capture or writeback (`epics.md:33`, `epics.md:320-322`). |

## Findings

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | `prd.md:103`: "维护者可以知道本次同步是否完整、部分成功或 blocked。"<br>`epics.md:20`: "完整/部分/blocked 状态"<br>`epics.md:68`: "记录完整、partial、blocked 状态" | Use canonical status tokens throughout: "`ready`、`partial` 或 `blocked`". Example: "维护者可以知道本次同步状态是否为 `ready`、`partial` 或 `blocked`。" | Replaces prose synonyms with the defined sync status values from `prd.md:82`; prevents implementation/test authors from treating "完整" or "部分成功" as separate states. |
| prose | `prd.md:131`: "并进入审核或 blocked 状态。" | "并进入 `review-required` 或 `blocked` 状态。" | Aligns the prose with the glossary's human-review state value (`prd.md:82`) and the epic wording (`epics.md:22`, `epics.md:160`). |
| prose | `addendum.md:18`: "Skill sequence、reference-only、review"<br>`epics.md:296`: "系统返回 `blocked` 或 `review`" | "`Skill sequence`、`reference-only`、`review-required`"<br>"系统返回 `blocked` 或 `review-required`" | Removes the undefined `review` value and uses the canonical `review-required` state from `prd.md:82`; this is especially important because `epics.md:296` is acceptance-criteria language. |

## Clean Areas

No prose blockers found for the `local-file` v1 boundary, Penpot priority/scope, Resource Source naming, Evidence Receipt naming, SHA-256 field distinction, or Host boundary wording. Those areas are ready once the state-value wording above is normalized.

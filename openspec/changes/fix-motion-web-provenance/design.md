# Provenance owner correction design

## What was wrong

`2233admin/motion-web` is a fork/alias GitHub identity, not the canonical authored repository that was
actually inspected and pinned at commit `5f4e40f1253e11e28850d08dce28b9b7e4320115`. The canonical GitHub
identity for that fixed commit is `feitangyuan/motion-web`
(`_bmad-output/research/motion-web-approach-analysis.md`, section "来源、版本和授权核对"). Two capability
artifacts already carry the corrected owner; one registry file and one test still carry the stale owner:

| File | Field | Current | Correct |
| --- | --- | --- | --- |
| `skill/references/motion-first-capability.md` frontmatter | `sourceMeta.url` | `https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115` | already correct |
| `openspec/changes/extend-motion-first-capability/reference-boundary.md` | `Source` | `https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115` | already correct |
| `skill/references/motion-primitives.json` primitive `response.spring-settle` | `provenance.source` | `https://github.com/2233admin/motion-web` | `https://github.com/feitangyuan/motion-web` |
| `skill/references/motion-primitives.json` primitive `continuity.shared-anchor` | `provenance.source` | `https://github.com/2233admin/motion-web` | `https://github.com/feitangyuan/motion-web` |
| `tests/animation-opportunity-reference.test.cjs:45` | expected owner | `https://github.com/2233admin/motion-web` | `https://github.com/feitangyuan/motion-web` |

`provenance.source` in `motion-primitives.json` records the repository root identity, not a specific
audited file. It therefore takes the root URL (no `/tree/<sha>` suffix), consistent with the other
`provenance.source` entry already in the same file (`transform.orbit` → `https://github.com/cilvia333/WebMotionTable`,
a root URL). `sourceMeta.url` in `motion-first-capability.md` and reference-boundary `Source` keep their
existing `/tree/<sha>` form because those fields cite the exact reviewed tree, not just the owner — both
forms are correct for their own field's purpose and are not being unified.

## Why an independent change

`openspec/changes/integrate-product-animation` (CERE-482) is already `status: done`; behavior changes —
including provenance corrections — must not be folded into a shipped change. `openspec/changes/extend-motion-first-capability`
is the change that introduced the two mis-owned `motion-primitives.json` entries and the stale test
assertion; this change fixes that regression as its own auditable unit, with its own proposal, spec
delta, and task list, so the correction has independent lineage instead of silently mutating another
change's already-approved diff.

## Reference-boundary documents already correct

`skill/references/motion-first-capability.md` and `openspec/changes/extend-motion-first-capability/reference-boundary.md`
were found, on inspection, to already carry the canonical `feitangyuan` URL. This change does not alter
their content; it formally adopts them into a governed spec delta (they were previously untracked and not
owned by any change's lifecycle) and records that no further edit to those two files is required.

## Documentation corrections

- `_bmad-output/research/motion-web-approach-analysis.md:5` — research date corrected to `2026-09-18`
  (the date this correction was authored and verified), replacing the stale `2026-03-09`.
- `_bmad-output/research/motion-web-approach-analysis.md:210` — the paragraph asserting
  "`sourceMeta.url` 指向 `https://github.com/2233admin/motion-web` … 未来维护时应修正" is stale: the
  capability/reference-boundary files it warns about are already correct, and the remaining
  `motion-primitives.json`/test drift is now closed by this change. The paragraph is rewritten to state
  that `2233admin` is a fork/alias, `feitangyuan` is the canonical authored source, and the correction is
  now governed by `fix-motion-web-provenance`.
- `openspec/changes/integrate-product-animation/qa.md` — the pre-motion-web-rework sections (`方向样片的真实观看门槛`,
  covering `sample-approved`/`sample-v1-overlap`/`sample-v2-panel-rejected`, and the `Review 修复：原生控件与交互边界`
  / `契约、范围与集成` sections describing the superseded panel-choreography integration) gain explicit
  "历史/已被下方 `## 2026-09-17 motion-web 研究与证据血缘重做` 段落取代" framing in their headings/lead-ins.
  No historical content, SHA, warning count, or screenshot reference is deleted or altered — only the
  reading boundary is clarified so historical evidence (e.g. MP4 SHA `f258e41…`, the `content_overlap`
  warnings, `native-*-mobile.png` captures) is never mistaken for the current motion-web rework's state.

## Not doing

Not touching `reviewedRevision`, `reviewedContentHash`, `license`, `codeCopied`, or any `/tree/<sha>`
audit citation link. Not touching experiment target runtime/output. Not deleting any historical QA
evidence.

# Fix motion-web provenance tasks

- [x] Correct `provenance.source` for `response.spring-settle` and `continuity.shared-anchor` in
      `skill/references/motion-primitives.json` from `https://github.com/2233admin/motion-web` to
      `https://github.com/feitangyuan/motion-web`. Do not touch `transform.orbit`'s unrelated provenance
      or any `revision`/hash field (this registry has none to change).
- [x] Update the expected owner in `tests/animation-opportunity-reference.test.cjs:45` to
      `https://github.com/feitangyuan/motion-web`.
- [x] Confirm (no edit needed) `tests/source-governance.test.cjs` already asserts the canonical
      `sourceMeta.url`/`reviewedRevision`/`reviewedContentHash`/license/`codeCopied` fields for
      `skill/references/motion-first-capability.md`; record this change as the formal owner of that
      file's spec delta.
- [x] Formally adopt `skill/references/motion-first-capability.md` and
      `openspec/changes/extend-motion-first-capability/reference-boundary.md` into this change's spec
      delta lifecycle without editing their content (already canonical).
- [x] Correct `_bmad-output/research/motion-web-approach-analysis.md:5` research date to `2026-09-18`.
- [x] Rewrite `_bmad-output/research/motion-web-approach-analysis.md:210` to state the owner has been
      corrected by this change instead of describing it as a future TODO.
- [x] Add historical/superseded framing to `openspec/changes/integrate-product-animation/qa.md`'s
      `方向样片的真实观看门槛` (sample-approved) and `Review 修复：原生控件与交互边界` /
      `契约、范围与集成` sections without deleting any historical content, SHA, warning, or screenshot
      reference.
- [x] Run `node --test tests/source-governance.test.cjs tests/animation-opportunity-reference.test.cjs`.
- [ ] Pass `node scripts/qa.cjs` (parent-owned repository-wide completion gate; the recorded
      post-patch run failed).
- [x] Run `openspec validate fix-motion-web-provenance --strict`.

`experiments/openalice-product-animation/` target runtime/output, frozen baseline, and
`integrate-product-animation`'s technical conclusions/evidence values are not touched by this change.

## Focused verification evidence

- 2026-09-19 — `node --test tests/source-governance.test.cjs tests/animation-opportunity-reference.test.cjs`
  exited 0: 5 tests passed, 0 failed.
- 2026-09-19 — `openspec validate fix-motion-web-provenance --strict` exited 0: the change is valid.
- Recorded post-patch root `node scripts/qa.cjs`, run by the coordinator: exit 1 / 53.185s
  (`artifact://1503`), 711 tests / 710 pass / 1 fail. `tests/animation-verification.test.cjs:222`
  reports `ReferenceError: startFixtureServer is not defined`. The 11 installed-CLI checks
  passed separately; QA status stayed byte-identical. This is not a root QA pass.
- Prior manifest audit also found existing `mengto-skills.test.cjs` missing from coverage; this
  unchanged prior-audit finding is not a second observed failure from that run. Both issues
  are outside this approved provenance slice and are preserved, not suppressed.
- Repository-wide completion remains blocked for the recorded coordinator run. The focused
  Task 4 evidence does not imply overall CERE-482 completion or Visual Acceptance.

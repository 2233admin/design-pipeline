# Upstream review verification

Recorded on 2026-10-14 for synchronization of `origin/main` into `fix/ui-audit-review-round3`. The reviewed range starts at `8b6a417ea06a2f9ef9d8de0995dad8d0f0097e26` and ends at upstream `35f6141e74eb5f4931a749b21d1ee1fa3b715413`. Two independent reviews covered documented standards and OpenSpec/correctness.

The tested fixed implementation is commit `a5905344bbaa5973844cd12f0faa231ae011233c`, tree `b54128061133e3bb6a3762cb155a47bb37ce9d6f`. Its tracked bytes were held unchanged during full QA. This record and subsequent checklist updates are documentation-only; they do not attribute historical runs to an inferred revision.

## Findings and decisions

- In-flow generated text on its own fill skipped positioned paint from host descendants. `fix-generated-text-descendant-occlusion` extends the existing paint check to that case, preserving conservative host geometry and ordinary-text behavior.
- The structure-cut predicate accepted strong negative correlation and exact boundary values despite its strict `r² < 0.5` requirement. Both strict correlation bounds now apply; timing and preceding-step calmness are unchanged.
- The archived tracking specification still required full-lens centroid acceptance while its design and runtime intentionally checked camera projection before artistic lens effects. This active followup explicitly retains camera-stage acceptance, separately reports LED/full-lens displacement, and retains full-lens determinism. Consolidated and archived specs were not manually edited; the archive lifecycle will apply the delta.
- Historical tracking full-QA records lacked an implementation SHA/tree. Their original revision was not recoverable from those records and was not guessed. The fresh revision-bound full QA below supplies current integration evidence.

## Runtime and regression evidence

A throwaway smoke exercised actual `auditPage` in Chrome and `structureCut`. Against the original local working tree (HEAD `8b6a417` plus its pre-existing uncommitted tracking-film work), `r = -0.9` produced a structural cut and an in-flow white-on-dark marker under a painted child produced no contrast finding. Against the fixed checkout, the cut was absent, the covered marker was indeterminate, and the unobscured control remained measurable. The before-run is not attributed to the committed `8b6a417` tree alone.

The focused film/HUD checks passed, including real ffmpeg decoding of a lossless contrast inversion and the existing dark-cut/dissolve/whip cases. Initial audit regression additions exposed two fixture mistakes: midpoint hit testing outside a short pseudo surface, and expecting aggregate indeterminacy on a fixture that deliberately also fails contrast. Controls now fill the host surface so their paint-order assertion is measurable; the incidental aggregate assertion was removed. The final generated-text regression passed. Full QA exercised all affected audit/CLI/film suites together.

Real CLI smoke also exercised standard web intake, rejection as a project rule, rejection of anti-goals on a correction, acceptance of confirmed playback with two repeatable anti-goals, persistence of all three project rules, and transition to reference. A fresh `film scaffold --template tracking-hud` built 12 shots / 180 frames / 6 seconds and sound. Its three default implicit-lock warnings remained reported.

Hardware tracking HUD probe passed all determinism, label, marker, glyph and page-error checks (DPR 1, ANGLE D3D11, RTX 4070 Ti):

| Measurement | Result |
| --- | --- |
| Identical sampled frames across seek orders and a second browser | 36 / 36 |
| Labels | 215 |
| Markers / worst camera error | 168 / 0.199 px |
| Glyphs / worst camera error | 120 / 0.407 px |
| Worst LED centroid shift, reported only | 6.137 px |
| Worst full-lens centroid shift, reported only | 29.414 px |

The probe establishes camera-projection conformance and sampled seek/cross-process determinism, not full-lens alignment acceptance or byte-identical encoded renders. No new film render or visual acceptance was claimed.

## Frozen-tree checks

- `npm test` with scratch environment variables directed to an existing D: scratch directory: 1480 repository tests, 1476 passed, 0 failed, 4 skipped; 136 files. Installed-package public CLI smoke: 12/12. Hermetic packaging, unchanged repository status, and both browser-tool self-tests passed.
- `npm run specs:check`: 27 passed, 0 failed. Existing archive-order INFO messages remain; no change was archived here.
- Each new followup passed standalone strict OpenSpec validation.
- `git diff --check` passed before the implementation commit.

## Scope and limits

The original checkout's film, motion-recipe and transition-rule work was excluded from the tested integration commit. Those uncommitted changes are separate work, not review-fix publication. Gate/probe results do not grant creative or visual acceptance. Conservative host-box approximation can still report indeterminacy when exact in-flow glyph overlap cannot be established.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; tracked in 2233admin/design-pipeline#193.
- [ ] 1.2 `npm exec -- openspec validate film-gate-reference-compare --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `film-core.cjs`: validate `referenceAnalysis` shape (path, sha256) in the storyboard check.
- [ ] 2.2 `reference-video-core.cjs` or a new helper in the film evidence path: cut pairing, per-shot motion, sound sync, with the tolerances in design.md.
- [ ] 2.3 `cli-core.cjs` `verify film-render`: run the comparison when `referenceAnalysis` is declared; keep exit codes (0 passed, 2 gate failed, 1 contract error).

## 3. Tests and docs

- [ ] 3.1 Tests for each scenario in the spec, including hash mismatch and pending analysis; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/workflow-film.md`: the new field, its meaning, and the structural-only wording.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Against KATANA PV 40s (expect a cut-count gap near 30 vs 90 and a shifted segment order) and the 100s shot-by-shot version (expect cut offsets within 1 frame).
- [ ] 4.2 Storyboard without `referenceAnalysis` gives the same result as before.
- [ ] 4.3 `npm test` green.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Relates to #215.
- [x] 1.2 `npm exec -- openspec validate film-compare-review --strict` and `npm run specs:check`.

## 2. Behaviour (after film-gate-reference-compare)

- [ ] 2.1 `film-compare-core.cjs`: page generation (design.md 1–4), `compare.json` binding (design.md 5).
- [ ] 2.2 Proof video and sidecar (design.md 6).
- [ ] 2.3 `cli-core.cjs`: `film compare` and `film proof`, `--project-root`, `--video` (default the draft render); usage lines; exit codes 0/1.
- [ ] 2.4 `workflows/film.cjs`: review precondition and ask text in replicate mode with `referenceAnalysis`.

## 3. Tests and docs

- [ ] 3.1 Tests for each scenario, including a browser test that steps three frames and compares the shown frame with FFmpeg's decode; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/workflow-film.md`: the page, the proof, what they do not claim.
- [ ] 3.3 CHANGELOG; `THIRD_PARTY_NOTICES.md` concept credit to motion2code at `0f00328`.

## 4. Verification

- [ ] 4.1 KATANA PV 100s shot-by-shot: page opens from disk, worst-pair markers jump to the listed times, proof video plays in a phone browser.
- [ ] 4.2 `npm test` green.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Relates to #192.
- [x] 1.2 `npm exec -- openspec validate reference-cut-sheet --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `film-core.cjs`: `cuts` shape, vocabulary, contiguity, beat containment, described-cut checks.
- [x] 2.2 `film-core.cjs`: parity section (alignment, motion class, sound onsets, missing and extra) and `parityStrict`.
- [x] 2.3 `cli-core.cjs`: `referenceCuts` joins gate evidence inputs.
- [x] 2.4 `film-cut-core.cjs`: render sheet, `--from-reference` seeding, refusal rules.
- [x] 2.5 `cli-core.cjs`: `film cut-sheet`, `--from-reference` in `KNOWN_OPTIONS`, help text.

## 3. Docs and tests

- [ ] 3.1 Get one real production cut sheet from the user and confirm the column order and the vocabulary enums before freezing them.
- [x] 3.2 `skill/references` film docs (`workflow-film.md`): cut fields and vocabulary; shot-for-shot work uses `--shots` then `film cut-sheet --from-reference`.
- [x] 3.3 Tests (registered in `scripts/test-manifest.json`) for every scenario above; new skill files listed in `package-resources.json`.
- [ ] 3.4 `npm test`.
- [ ] 3.5 Run on `.design-pipeline/kurumi`: seed 90 cuts, fill from `storyboard.json`, render the sheet, run parity against the reference itself (expect zero findings).

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Relates to #215.
- [x] 1.2 `npm exec -- openspec validate film-vector-rebuild --strict` and `npm run specs:check`.

## 2. Behaviour (after film-gate-reference-compare)

- [ ] 2.1 Determinism check (design.md 1) using the composition capture and `__timelines` seek.
- [ ] 2.2 Embedding check (design.md 2) and `storyboard.rendering.assets` validation.
- [ ] 2.3 `storyboard.reference.text` validation and `text-mismatch` (design.md 3).
- [ ] 2.4 `duration-compressed` against the bound reference analysis.
- [ ] 2.5 `reference analyze-video --palette` (design.md 4); flag registered.

## 3. Tests and docs

- [ ] 3.1 Fixture compositions for each scenario; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/film-vector-rebuild.md` in our own words, linked from `workflow-film.md` and the tool index; `THIRD_PARTY_NOTICES.md` concept credit to motion2code at `0f00328`.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Rebuild one motion2code gallery clip (downloaded on demand, not committed) end to end; frame pairs reviewed worst-first.
- [ ] 4.2 `npm test` green.

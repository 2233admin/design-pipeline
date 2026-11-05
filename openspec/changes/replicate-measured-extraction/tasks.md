# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta, rewritten to extend `reference extract` from `reference-palette-extract` (PR #251).
- [x] 1.2 `npm exec -- openspec validate replicate-measured-extraction --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 Archive `reference-palette-extract` first; credit design-extract `d2c28da` in `THIRD_PARTY_NOTICES.md` as a method source.
- [ ] 2.2 `reference-extract-core.cjs`: extend `measureStyles` with radii, shadows, transitions, animations and `getAnimations()`; analysis for them; `tokens.dtcg.json`; MOTION.md draft section.
- [ ] 2.3 `cli-core.cjs`: `--path` on `reference extract` (contained), repeatable `--width/--height`, help.
- [ ] 2.4 `workflows/replicate.cjs`: reference step runs it for live-page/HTML references; confirmation shows measured vs chosen and binds `extraction.json`.
- [ ] 2.5 `foundation check`: `token-not-measured` with tolerances (design.md 5) and the Source Decisions `added:` list.

## 3. Tests and docs

- [ ] 3.1 Extend `tests/reference-extract.test.cjs` and its fixtures with a transition, radii, shadows, a local `--path` page and a check that the existing fields are unchanged.
- [ ] 3.2 `references/workflow-web.md` and `references/design-md.md`: measured vs observed values, how to declare an addition.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on one KATANAview reference page; compare measured tokens with the current DESIGN.md and list mismatches.
- [ ] 4.2 `npm test` green.

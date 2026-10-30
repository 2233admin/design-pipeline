# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate refresh-upstream-snapshots --strict` and `npm run specs:check`.

## 2. Refreshes

- [ ] 2.1 `interface-discipline` → jakubkrehel/skills `592aedc`: importer, manifest, notices; replace citations of deleted `better-colors/accessibility-contrast.md`, `color-conversion.md`, `gamut-and-tailwind.md` in `references/ui-craft-sources.md` and `package-resources.json`; check `UC-*` and `audit.*` anchors.
- [ ] 2.2 `good-css` → `92d436b`: importer, manifest, notices; `references/good-css.md` container rule; `tools/good-css/build-study.cjs` still builds 47 pages.
- [ ] 2.3 `cinetic` → `ecfa660`: importer, manifest, notices; update each number in `references/film-methods.md` taken from cinetic (word budgets, BPM, beats per 30 s, typing rate, hold rule, bans).
- [ ] 2.4 `12-principles-of-animation`: `upstreamStatus: removed` at `e1df385` in the manifest, copy upstream `LICENSE` from `e1df385`, notices wording.
- [ ] 2.5 impeccable: new marker in `companion-capabilities.json` from current SKILL.src.md, command map in `impeccable-product-design.json` (24 commands, `craft` deprecated), `impeccable-contract.md`, `reviewedRevision` `02523aec`.
- [ ] 2.6 `THIRD_PARTY_NOTICES.md`: shadcn reviewed commit `993eb2c` in both places.
- [ ] 2.7 HyperFrames: `evals/cases/package.json` to `0.8.137`; notice commit to the `v0.8.137` tag's commit.

## 3. Verification

- [ ] 3.1 `npm run sources:check`, `npm run capabilities:check`, `npm test` green.
- [ ] 3.2 `grep -r "0.73" skill/` finds no contrast rule.
- [ ] 3.3 CHANGELOG entry.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate taste-skill-v2 --strict` and `npm run specs:check`.

## 2. Vendor

- [ ] 2.1 Extend `scripts/import-taste-skill.cjs` to three sources; import taste-skill `12af471f627f866411b4bd785b19646d3672784c`, taste-skill-classics `5e08c9383dc4ad7fc0df70e1ac8cfa09ec356305`, imagegen-skills `beb16b0d0f4dae9a6f5cb04ea41e97b93a54ab8e`; delete the pre-v2 snapshot.
- [ ] 2.2 Manifest, `THIRD_PARTY_NOTICES.md`, `package-resources.json`; binaries over 1 MB through `sources fetch`.

## 3. Guide and tools

- [ ] 3.1 Rewrite `references/taste-skill.md` routing (design.md 1; spec scenarios).
- [ ] 3.2 `taste inspect` and `taste draw` CLI wrappers (design.md 2-3); flags registered; help.
- [ ] 3.3 Style roulette: `taste draw` pool, `roulette/taste-draw` label and ledger entry.
- [ ] 3.4 `assets.mjs` use recorded with licence and credit in the asset manifest.
- [ ] 3.5 Inspect report and ledger entry record target digest and source commit; stale reports are labelled.

## 4. Verification

- [ ] 4.1 `tests/taste-skill.test.cjs` updated for three sources; `npm run sources:check`.
- [ ] 4.2 Run `taste inspect` on one KATANAview page and one golden UI case; attach the reports.
- [ ] 4.3 `npm test` green; CHANGELOG entry.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate replicate-measured-extraction --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 Vendor the listed design-extract files at `d2c28da` unmodified with LICENSE; `THIRD_PARTY_NOTICES.md`, vendor manifest, `package-resources.json`.
- [ ] 2.2 `reference-extract-core.cjs`: collector (`page.evaluate`), dynamic import of the extractors, `extraction.json` and `tokens.dtcg.json`.
- [ ] 2.3 `cli-core.cjs`: `reference extract` action, flags registered, help.
- [ ] 2.4 `workflows/replicate.cjs`: reference step runs it for live-page/HTML references; confirmation shows measured vs chosen and binds `extraction.json`.
- [ ] 2.5 `foundation check`: `token-not-measured` with tolerances (design.md 4) and the Source Decisions `added:` list.

## 3. Tests and docs

- [ ] 3.1 Fixture page with known colours, type scale, spacing and a transition; tests for each scenario and the collector-shape contract test; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/workflow-web.md` and `references/design-md.md`: measured vs observed values, how to declare an addition.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Run on one KATANAview reference page; compare measured tokens with the current DESIGN.md and list mismatches.
- [ ] 4.2 `npm test` green.

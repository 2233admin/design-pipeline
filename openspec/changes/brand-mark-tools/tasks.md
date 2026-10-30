# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate brand-mark-tools --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `skill/tools/brand-mark/audit.cjs`: path tokenizer, the ported checks and score (design.md 1-2).
- [ ] 2.2 `sheet.cjs` and `export.cjs` through the existing capture and PNG codec.
- [ ] 2.3 CLI wiring (`brand-mark audit|sheet|export`), flags registered, help.
- [ ] 2.4 `skill/tools/README.md` row, `references/feature-routes.md` routing, `package-resources.json`, `THIRD_PARTY_NOTICES.md`.
- [ ] 2.5 Short method guide `skill/tools/brand-mark/README.md` in our own words (mark types, one idea, 16 px first, owner chooses on the sheet).

## 3. Tests and docs

- [ ] 3.1 SVG fixtures for each finding code and each scenario; register in `scripts/test-manifest.json`.
- [ ] 3.2 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 Audit and sheet the KATANA mark; check the 16 px proof by eye.
- [ ] 4.2 `npm test` green.

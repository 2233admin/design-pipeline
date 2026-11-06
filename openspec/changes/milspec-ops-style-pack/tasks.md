# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #319.
- [x] 1.2 `npm exec -- openspec validate milspec-ops-style-pack --strict` and `npm run specs:check`.

## 2. Pack and templates

- [x] 2.1 `styles/milspec-ops/style.json`: font roles through the catalog, grammar with the reference's numbers, materials and recipes, motion, checks with the 64 px guidance and the case's traps, provenance, examples.
- [x] 2.2 `layouts-ops.cjs` and five template folders (manifest, default render, spec.md); `bank.cjs` registry.

## 3. Docs and tests

- [x] 3.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 3.2 `tests/template-milspec-ops.test.cjs` (registered in `scripts/test-manifest.json`); counts in `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`.
- [x] 3.3 Focused tests (template bank, style packs, game packs, milspec-ops, distill), then `npm test`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #316.
- [x] 1.2 `npm exec -- openspec validate lattice-dossier-style-pack --strict` and `npm run specs:check`.

## 2. Pack and templates

- [x] 2.1 `styles/lattice-dossier/style.json`: font roles through the catalog, grammar with the measured numbers, materials and recipes, motion, checks with the 64 px guidance and the case's traps, provenance, examples.
- [x] 2.2 `layouts-lattice.cjs` and five template folders (manifest, default render, spec.md); `bank.cjs` registry.

## 3. Docs and tests

- [x] 3.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 3.2 `tests/template-lattice-dossier.test.cjs` (registered in `scripts/test-manifest.json`); counts in `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`; distill nearest list.
- [x] 3.3 Focused tests, then `npm test`.
- [x] 3.4 Font-deterministic tests: OFL subset fixtures + `--font-dir`, rail line positioned from the rendering family (as #323).

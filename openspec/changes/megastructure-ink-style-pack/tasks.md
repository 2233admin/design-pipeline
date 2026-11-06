# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #330.
- [x] 1.2 `npm exec -- openspec validate megastructure-ink-style-pack --strict` and `npm run specs:check`.

## 2. Pack and templates

- [x] 2.1 `styles/megastructure-ink/style.json`: font roles through the catalog, grammar with the measured numbers, materials and recipes, motion, checks with the 64 px and no-figure guidance and the case's traps, provenance, examples.
- [x] 2.2 `layouts-ink.cjs` and five template folders (manifest, default render, spec.md); `bank.cjs` registry.

## 3. Example kit

- [x] 3.1 `examples/megastructure-ink-kit`: design-system package (26 components, cover, fonts), DESIGN.md, MOTION.md, GRAMMAR.md, README.md, generator.
- [x] 3.2 Pages: gallery, seven-screen site with `?slot=1`, descent HUD, survey terminal; task sheets and layer contracts.

## 4. Docs and tests

- [x] 4.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased], `THIRD_PARTY_NOTICES.md`.
- [x] 4.2 `tests/template-megastructure-ink.test.cjs` and `tests/megastructure-ink-kit.test.cjs` (registered in `scripts/test-manifest.json`), fixtures in `tests/fixtures/megastructure-ink`; counts in `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`.
- [x] 4.3 Focused tests, then `npm test`.

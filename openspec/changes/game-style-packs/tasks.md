# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #308.
- [x] 1.2 `npm exec -- openspec validate game-style-packs --strict` and `npm run specs:check`.

## 2. Packs and templates

- [x] 2.1 Six `styles/<id>/style.json` with font roles resolvable through the catalog, grammar, materials and recipes, motion, checks with the 64 px guidance, provenance and examples.
- [x] 2.2 `layout-kit.cjs` and six `layouts-<pack>.cjs`; 18 template folders (manifest, default render, spec.md).
- [x] 2.3 `bank.cjs`: layout registry, `italic`, `filter`, lettering `shadow`, `labelAt`, placeholder label colour.

## 3. Checks

- [x] 3.1 `measure.cjs`: every path command (curves by control points, arcs by end points).
- [x] 3.2 `page-check.cjs`: `data-chk` path groups measured as lettering; stroked glyphs in the ink shots.
- [x] 3.3 `cli-core.cjs`: the `--root` fix in containment errors; help lists the new families.

## 4. Docs and tests

- [x] 4.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 4.2 `tests/template-game-packs.test.cjs` (registered in `scripts/test-manifest.json`); counts in `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`.
- [x] 4.3 Focused tests (template bank, style packs, game packs, materials), then `npm test`.

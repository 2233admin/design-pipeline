# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #288; stacked on #271.
- [x] 1.2 `npm exec -- openspec validate template-style-packs --strict` and `npm run specs:check`.

## 2. Style packs and templates

- [x] 2.1 `styles/arknights-endfield/style.json` and `styles/shinbo/style.json`; manifests name their style; font roles in the style.
- [x] 2.2 `layouts-shinbo.cjs` and 11 template folders (manifest, default render, spec.md).
- [x] 2.3 `bank.cjs`: styles, roles, whole-string coverage with `--font-dir`, collage and derived slots, rhythm and glyph rules.

## 3. Checks

- [x] 3.1 `coverage.cjs`: cmap reader (TTF, OTF, TTC, WOFF) and `registerProvider` for the font catalog (#286).
- [x] 3.2 `page-check.cjs`: ink overlap, off-canvas, collage alpha, contrast with the text hidden, glyph coverage; fixes.
- [x] 3.3 `cli-core.cjs`: `--browser`, `--font-dir`, `list --style`, HTML and hand-written SVG in `template check`, merged report.

## 4. Fixtures, docs and tests

- [x] 4.1 `tests/fixtures/style-pack-shinbo/`: first pass and final pages, subset OFL fonts with licences, CC0 collage, provenance.csv.
- [x] 4.2 `tests/template-style-pack.test.cjs` (registered in `scripts/test-manifest.json`) and `tests/template-bank.test.cjs` updated.
- [x] 4.3 `skill/references/template-bank.md`, `package-resources.json`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` [Unreleased].
- [x] 4.4 Focused tests, then `npm test`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #335.
- [x] 1.2 `npm exec -- openspec validate atomic-age-style-pack --strict` and `npm run specs:check`.

## 2. Pack, templates and face widths

- [x] 2.1 `styles/atomic-age/style.json`, `layouts-atomic.cjs`, ten template folders; `bank.cjs` registry.
- [x] 2.2 `measure.registerMeasuredFace`, `coverage.readFontAdvances`, `@font-face` file reading in `readSlots`; `Doc.text` wraps with an embedded face.
- [x] 2.3 OFL subset fixtures and provenance under `tests/fixtures/atomic-age/`.

## 3. Example kit

- [x] 3.1 Materials: NASA period imagery added and processed (duotone, halftone, photocopy), papers and printed flats generated; records in `art/materials-licenses.json`, `art/provenance.json`.
- [x] 3.2 `build/` (data, static and browser builds), `renders/`, `sheet.html`, `site/` (1440 and 390, `?slot=1`), fonts, art tasks, README, GRAMMAR.md.

## 4. Docs and tests

- [x] 4.1 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased], `THIRD_PARTY_NOTICES.md`, CLI help family list.
- [x] 4.2 `tests/template-atomic-age.test.cjs`, `tests/atomic-age-kit.test.cjs` (registered); pack lists and template count.
- [x] 4.3 Focused tests, then `npm test`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #261.
- [x] 1.2 `npm exec -- openspec validate template-bank --strict` and `npm run specs:check`.

## 2. Bank

- [x] 2.1 `lettering.cjs`: port of `lettering.py`; path data compared glyph by glyph against the Python output.
- [x] 2.2 `layouts.cjs`: the nine layouts from `build.py`, with text boxes, figure and crop zones, shared lines.
- [x] 2.3 `templates/<id>/manifest.json`, `template.svg` (default render) and `spec.md` (measured basis).
- [x] 2.4 `bank.cjs` / `measure.cjs`: parameters and seeds, render, and the measured check with a fix per finding.
- [x] 2.5 `cli-core.cjs`: `template list|render|check`, new flags in `KNOWN_OPTIONS` / `REPEATABLE_OPTIONS`, help, one-operand dispatch, `--png` through `capture-composition.cjs`.

## 3. Docs and tests

- [x] 3.1 `skill/references/template-bank.md`, one routing line each in `SKILL.md` and `capability-routing.md`.
- [x] 3.2 `docs/research/`: study, provenance CSV, ignoredone research, ablation candidates (linked from #260).
- [x] 3.3 `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` [Unreleased], `package-resources.json`.
- [x] 3.4 `tests/template-bank.test.cjs` (registered in `scripts/test-manifest.json`): every template at every size passes; overflow, figure zone, contrast, size, accent, crop and alignment failures with fixes; lettering widths; seeds; usage errors exit 1.
- [x] 3.5 `npm test` (after the review fixes): 1801 tests, 1792 pass, 8 skipped, 1 fail (the known, unrelated ff-tracking-hud ffmpeg test: `Option not found` on this host); browser self-tests 13/13.
- [x] 3.6 Review fixes (#271 review): measured width tables and the browser calibration test; pixel-sampled contrast on real images, `--tone`, `contrast-unverified`; `unsupported-geometry`; five new glyphs and `lettering-fallback`; check before `--png`; seed wording; grouped help.

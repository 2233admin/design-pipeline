# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #293; stacked on #291.
- [x] 1.2 `npm exec -- openspec validate reference-distill --strict` and `npm run specs:check`.

## 2. Measurement and draft

- [x] 2.1 `reference-measure.cjs`: ffmpeg decoding, the study's OKLab, balance, symmetry, whitespace and spectrum features, annotation box features, stroke contrast and weight of text crops.
- [x] 2.2 `distill.cjs`: board and annotations, distributions and thresholds, pooled palette, archetypes with nearest template or skeleton, font roles with the catalog hook, draft style, comparison, report, ablation variants and distance.
- [x] 2.3 `bank.cjs`: `validateStyle` (shared by `loadStyle` and drafts) with `checks.measured`.
- [x] 2.4 `cli-core.cjs`: `template distill`, `--images`, `--annotations`, `--compare`, `--ablate`; ablation renders through `templatePng`.

## 3. Verification

- [x] 3.1 Port parity against the study's `features.py` on 10 study images (recorded in design.md).
- [x] 3.2 Acceptance runs on the Arknights / Endfield study board (63 design references; 13 outfit KVs) and the Nocturne Corridor board (18 finals), with comparison and ablation (recorded in design.md; images stay local).
- [x] 3.3 `tests/template-distill.test.cjs` with generated fixtures (registered in `scripts/test-manifest.json`).
- [x] 3.4 `skill/references/template-bank.md`, `package-resources.json`, `CHANGELOG.md` [Unreleased].
- [x] 3.5 Focused tests, `template-bank` and `template-style-pack` tests, then `npm test`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate procedural-materials --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `texture-stats.cjs`: band spectrum, quantiles, orientation, laid-line peak, halftone screen statistics, distances and yardstick assessment.
- [x] 2.2 Fetch six CC0 / public-domain samples with `materials fetch` (one IIIF region), build `references/material-calibration.json` with `scripts/build-material-calibration.cjs`.
- [x] 2.3 `procedural.cjs`: paper, halftone, print, architecture and motif generators; woodcut, halftone, papercut, photocopy and duotone effects; all seeded.
- [x] 2.4 `material-core.cjs`: generate (with similarity), replay, process, measure (with `--name` calibration), profiles, check findings, fetch region; CLI actions, help and `--generator --seed --reference`.
- [x] 2.5 Guides: `assets-audio.md` make-material section, `design-sources.md` rows and region note, `references/material-capture.md`; `package-resources.json`.

## 3. Verification

- [x] 3.1 `tests/procedural-materials.test.cjs` (reproducibility of every generator and effect, profile provenance, spectrum match within 2 dB, faint paper rejected, screen recovery, ink flat vs held-out scan, vanishing-point residual, papercut layering, replay/tamper, lineage, owner calibration, unlike-reference exit) in `scripts/test-manifest.json`; region test in `tests/materials.test.cjs`.
- [x] 3.2 Existing focused checks: `tests/materials.test.cjs`, `tests/art-motion-assets-audio.test.cjs`, `tests/film-edit.test.cjs`.
- [x] 3.3 Before/after on the 夜想回廊 poster and 14 cards (design.md, acceptance).
- [x] 3.4 Repository QA: `npm test`.
- [x] 3.5 CHANGELOG entry.

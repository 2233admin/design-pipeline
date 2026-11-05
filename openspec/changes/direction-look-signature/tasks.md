# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #247.
- [x] 1.2 `npm exec -- openspec validate direction-look-signature --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `capture-composition.cjs` extract: text `align` and `fill`, top-level `media`.
- [x] 2.2 `appearance-ledger-core.cjs`: `appearance.signature` from elements and from source; `recentLooks`, `describeLook`, `lookOverlap`.
- [x] 2.3 `workflows/directions.cjs`: `recentLooks` on the run action and owner ask; per-version `look` and `repeatsRecent`.
- [x] 2.4 `direction-preview.md` ledger section; CHANGELOG [Unreleased].

## 3. Verification

- [x] 3.1 `tests/look-signature.test.cjs` (synthetic rules, five real pages in headless Chromium, delivery entry, direction ask, broken ledger), registered in `scripts/test-manifest.json`.
- [x] 3.2 Focused: `tests/directions-three-sources.test.cjs`, `tests/direction-preview.test.cjs`, composition tests.
- [x] 3.3 Repository QA: `npm test`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #241.
- [x] 1.2 `npm exec -- openspec validate measured-spec-drift --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `built-style-drift-core.cjs`: DESIGN.md token reading, local CIEDE2000, comparison, coverage, in-page measurement and capture; `capture-built-styles.cjs` kernel.
- [x] 2.2 `check-spec-reconciliation.cjs` reviews `built-styles.json` into `specDrift.measured` with the new reasons and warnings.
- [x] 2.3 `cli-core.cjs`: `reconciliation measure`; `reconciliation check` and the `reference check` fold pass `--project-root` and `--design-foundation`.

## 3. Documentation and tests

- [x] 3.1 `stages.md`, `design-spec.md`, CLI help, CHANGELOG; package resources.
- [x] 3.2 `tests/measured-spec-drift.test.cjs` (Sharma pairs, tokens, comparison, gate lineage, and real headless Chromium pages: on-token, drifted, missing font, refusals) registered in the manifest; existing reconciliation tests (`round-two-findings`, `carried-forward-defects`) and full `npm test`.

## 4. Review fixes

- [x] 4.1 Fonts compared by the rendered family, `first` kept for unloaded token fonts.
- [x] 4.2 Root canvas out of the area denominator; loud rule (CIEDE2000 > 10 on a control, the background, or 3+ elements) with rationale in design.md.
- [x] 4.3 Covering rows match whole comma-separated family entries and normalised hex.
- [x] 4.4 Partial opacity composited; `scope` records what is not measured (design.md, stages.md).
- [x] 4.5 Loaded local files (fonts, CSS) hashed into `lineage`; a swapped font file is stale.
- [x] 4.6 `measure` reports `applicable` and a note on a change without a reference.

## 5. Follow-up

- [ ] 5.1 Dedupe the CIEDE2000 helper with PR #251's `deltaE2000` once both are on main.

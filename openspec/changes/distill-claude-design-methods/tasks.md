# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md (sources, gap analysis, decisions) and the `design-pipeline` spec delta; GitHub #254.
- [x] 1.2 `npm exec -- openspec validate distill-claude-design-methods --strict` and `npm run specs:check`.

## 2. Checks

- [x] 2.1 `design-system-package-core.cjs`: `roleTokenFindings` (`on-token-unmeasured`, `focus-ring-unmeasured`, `focus-ring-floor`) and `coverFindings` (`cover-picture`, `cover-gradient`, `cover-motion`, `cover-responsive`), each finding with a fix, in a separate function after the existing checks.
- [x] 2.2 `tests/design-system-package.test.cjs` covers both (already in `scripts/test-manifest.json`).

## 3. Guides

- [x] 3.1 `design-system-package.md`: inventory first, small first system, role colours, failing source pairs, accessibility-ask definitions, cover rules.
- [x] 3.2 `editable-pptx-html.md`: Deck craft 1–9; `capability-routing.md` row.
- [x] 3.3 `xy-charting.md`: Dashboard And Chart Composition, routed from `graphics-runtime-routing.md` and `stages.md`.
- [x] 3.4 `direction-preview.md`: how versions are put to the owner.
- [x] 3.5 `workflow-film.md` review: frames to judge, feed safe zones, stranger test, three-round stop.
- [x] 3.6 `THIRD_PARTY_NOTICES.md` and CHANGELOG `[Unreleased]`.

## 4. Verification

- [x] 4.1 Focused: `tests/design-system-package.test.cjs`.
- [ ] 4.2 `npm test` (repository QA) green locally and in CI.

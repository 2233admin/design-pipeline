# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #355.
- [x] 1.2 `npm exec -- openspec validate motion-performance-audit --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `interaction-audit.cjs`: `audit.motion-properties` appended to `AUDIT_CODES`; `MOTION_PROPERTIES` exported; `auditPass("audit")` carries it as `pass.motion`.
- [x] 2.2 `auditPage`: timed transitions from computed style (elements, `::before`, `::after`), held animations, the four findings, the loading-indicator exemption and the fix texts.

## 3. Tests and docs

- [x] 3.1 `tests/interaction-audit.test.cjs`: contract (23 codes, the property lists, the pass), a failing page and its repair for each finding, the untriggered and zero-duration transitions, the paused, observed, skipped and `role="status"` loops, `not-applicable` on a page without motion, a result without the code; `tests/fixtures/ui-audit/violating.html` fails the code at both viewports.
- [x] 3.2 `ui-craft-sources.md` (measured-audit row, `UC-42` to `UC-44`, key `FMP`), `ui-rule-coverage.json` (17 rows), `ibelick-ui-skills.md`, `workflow-web.md`, `animation-opportunity-and-review.md`, `docs/features.md`, CHANGELOG.
- [x] 3.3 `tests/ui-rule-coverage.test.cjs` (no row pending on #355) and `tests/ui-craft-sources.test.cjs` (`UC-44`, key `FMP`).

## 4. Verification

- [x] 4.1 `node --test tests/interaction-audit.test.cjs tests/ui-rule-coverage.test.cjs tests/ui-craft-sources.test.cjs`.
- [x] 4.2 `npm test` on Windows: 2190 of 2206 repository tests pass, 10 skip, 6 fail in `atomic-age-kit`, `browser-locate`, `measured-spec-drift` (2), `template-distill` and `template-style-pack`; none of them reads a file this change touches. Five fail the same way at the base commit `438b4654` (Windows fonts and path separators); the `browser-locate` one is a profile collision under the QA's concurrency and passes alone. Browser-tool self-tests 13 of 13.

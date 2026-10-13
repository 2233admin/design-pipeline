# Tasks

## 1. Audit Engine

- [x] 1.1 Add `skill/scripts/interaction-audit.cjs`: the self-contained in-page audit function, check codes and option normalization adapted from lintapple with its MIT header.
- [x] 1.2 Add violating, clean and undeclared fixtures and `tests/interaction-audit.test.cjs`.

## 2. Integration

- [x] 2.1 Accept and validate `kind: "audit"` probes in `interaction-probe.v1`; run them per viewport in the capture kernel; report findings and coverage through `verify interaction`; add the audit branch to `interactionResultFailure`.
- [x] 2.2 Require an audit probe in the web `probe` stage and update `workflow-web.md`.
- [x] 2.3 Record rendered-dependency and token-source lineage in the `interaction` gate; treat missing or changed lineage as stale.
- [x] 2.4 Register the new module and test in `package-resources.json` and `scripts/test-manifest.json`.

## 3. Rules And Notices

- [x] 3.1 Rewrite `ui-craft-sources.md` as the rule index with audit codes, the `UC-` review checklist, conflict resolutions and provenance.
- [x] 3.2 Add the lintapple notice, the changelog entry and the README and skill-index pointers.

## 4. Verification

- [x] 4.1 Focused tests for the audit engine, probe validation, web stage and gate lineage.
- [x] 4.2 `npm run specs:check`.
- [x] 4.3 `npm test`.
- [x] 4.4 Smoke: a fixture web project runs `next` and `verify interaction` with an audit probe; the violating page fails with named findings, the clean page passes, and editing its stylesheet reopens `probe`.

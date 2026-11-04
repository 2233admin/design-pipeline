# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate audit-long-content-stress --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `interaction-stress.cjs`: `stress` contract, in-page `applyStress` and `classifyClipping`, per-viewport `summarizeStress`, `stressCoverageFailure` (design.md 1-9).
- [x] 2.2 Hooks: `PROBE_KEYS`, validation and `summarizeAudit` option in `interaction-audit.cjs`; `recordStress` in `interaction-capture-core.cjs`; stress flag and native completion in `interaction-core.cjs`.

## 3. Tests and docs

- [x] 3.1 `tests/interaction-stress.test.cjs` with `tests/fixtures/ui-stress/` fragile and robust pages: contract, summary, completion, both viewports, scope and scale, CLI exit codes 2/0/1; registered in `scripts/test-manifest.json`.
- [x] 3.2 `worst-case-content.md` (citing the pass as state evidence, limits), `workflow-web.md` (the field), `package-resources.json`, `THIRD_PARTY_NOTICES.md`, CHANGELOG.

## 4. Verification

- [x] 4.1 Existing focused checks: `tests/interaction-audit.test.cjs`, `interaction-evaluate`, `interaction-cli`, `interaction-capture`.
- [x] 4.2 Repository QA: `npm test`.

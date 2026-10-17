## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta; Relates to #147.
- [x] 1.2 `openspec validate fix-ui-workflow-friction --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `workflows/ui.cjs`: ui intake questions, the direction stage and the owner's pick.
- [x] 2.2 `workflow-core.cjs`: ui stages, `decide --stage concept` for ui, receipt written after the
  state is saved.
- [x] 2.3 `cli-core.cjs` relative `--project-root` error; `motion-foundation-core.cjs` source-decisions error.

## 3. Tests and docs

- [x] 3.1 `tests/workflow-ui.test.cjs`; the ui walk and the full-tier OpenSpec test pass the direction stage.
- [x] 3.2 `direction-preview.md`, package resources, CHANGELOG.

## 4. Verification

- [ ] 4.1 `npm test` green in CI.

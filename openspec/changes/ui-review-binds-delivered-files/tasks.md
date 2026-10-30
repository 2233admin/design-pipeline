# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Relates to #182.
- [x] 1.2 `npm exec -- openspec validate ui-review-binds-delivered-files --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `workflow-core.cjs` deliver stage: require and hash `--file` for ui; write `deliveredFiles` and `deliveryInputHashes`.
- [ ] 2.2 `workflows/shared.cjs`: `reviewInputHashes` and `deliveryRecorded` for ui; the earlier-version message lists changed files.
- [ ] 2.3 `cli-core.cjs`: repeatable `--file` on `decide`; help text.
- [ ] 2.4 `workflows/ui.cjs`: the returned deliver command carries `--file index.html` when it exists.

## 3. Tests and docs

- [ ] 3.1 Contract tests for each scenario (the changed-page test fails before the fix); register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/stages.md` and `docs/features.md`: ui delivery names its files.
- [ ] 3.3 CHANGELOG entry marked BREAKING.

## 4. Verification

- [ ] 4.1 Re-run the reproduction in #182; the last `next` returns the review, not `done`.
- [ ] 4.2 `npm test` green.

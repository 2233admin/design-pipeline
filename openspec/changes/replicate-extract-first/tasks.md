# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` and `web-workflow` spec deltas; Closes #164.
- [x] 1.2 `npm exec -- openspec validate replicate-extract-first --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `workflows/replicate.cjs`: reference text, `extract` stage, findings, confirmation record, clone verdict.
- [x] 2.2 Wire `extract` into the ui and web replicate stages, `decide --stage extract`, roles and CLI help.
- [x] 2.3 Bind the extraction digest in the web description approval, the interaction pass, the ui delivery and review.
- [x] 2.4 Consult the clone manifest at the web probe and delivery.
- [x] 2.5 Delete `--mode freeform`; accept `--answer default` at web intake.
- [x] 2.6 Route keywords and the `SKILL.md` route row.

## 3. Docs and tests

- [x] 3.1 `workflow-web.md`, `stages.md`, `pipeline-reference.md`, `website-cloning.md`, `docs/features.md`, `SKILL.md`, eval README.
- [x] 3.2 `tests/workflow-replicate.test.cjs` in `scripts/test-manifest.json`; update the replicate and freeform expectations in the existing workflow tests.
- [x] 3.3 `replicate.cjs` in `skill/references/package-resources.json`.

## 4. Verification

- [x] 4.1 `node --test` on `tests/workflow-replicate.test.cjs`, `workflow-next`, `workflow-action-commands`, `workflow-components`, `job-route`, `product-source-workflow`, `reference-analysis-entry`.
- [x] 4.2 `npm run specs:check` and `node scripts/qa.cjs`, comparing failures with the environment baseline on main.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate ui-multi-screen-flow --strict` and `npm run specs:check`.

## 2. Behaviour (after ui-review-binds-delivered-files)

- [ ] 2.1 `flow.v1` schema and validator.
- [ ] 2.2 `workflows/ui.cjs`: intake offers a flow. `workflow-core.cjs` `codeStages.work.action`: the ui deliver command lists every screen and `flow.html` as `--file`.
- [ ] 2.3 `flow-core.cjs`: `flow.html` generator and `verify flow` (design.md 2, 4) using `capture-interaction.cjs` and the composition gate.
- [ ] 2.4 CLI wiring and help.

## 3. Tests and docs

- [ ] 3.1 Fixture flows: multi-file, single-page `data-screen`, broken trigger, orphan; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/stages.md`, `docs/features.md`.
- [ ] 3.3 CHANGELOG entry.

## 4. Verification

- [ ] 4.1 A three-screen KATANAview settings flow end to end, reviewed on `flow.html`.
- [ ] 4.2 `npm test` green.

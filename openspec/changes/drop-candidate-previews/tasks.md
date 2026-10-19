# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; Closes #174.
- [x] 1.2 `npm exec -- openspec validate drop-candidate-previews --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `direction-preview-core.cjs`: required means three sources; delete the two-to-four rule and `threeSources`.
- [x] 2.2 `workflows/directions.cjs`: delete the no-cards special case.

## 3. Docs and tests

- [x] 3.1 `direction-preview.md`, `stages.md`, `workflow-web.md`, `pipeline-reference.md`, CHANGELOG.
- [x] 3.2 `directions-three-sources.test.cjs`: a plain candidate receipt is rejected, a waiver passes.

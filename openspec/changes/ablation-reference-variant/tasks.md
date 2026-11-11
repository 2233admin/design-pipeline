# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta; Closes #372.
- [x] 1.2 `npm exec -- openspec validate ablation-reference-variant --strict` and `npm run specs:check`.

## 2. Windows

- [x] 2.1 `tests/ablation-eval.test.cjs`: import the eval modules through `pathToFileURL`; create `AppData\Local` and `AppData\Roaming` in the temporary profile on win32.
- [x] 2.2 `measure.mjs`: wrap the screenshot in a `Buffer` before decoding.
- [x] 2.3 `lib.mjs`: quote arguments with spaces when `runAgent` goes through the shell.

## 3. Variant

- [x] 3.1 `suite.mjs`: `reference-system` in `VARIANTS`; `variantSetup` returns `references` and `designFile`; `referenceSources` (scenario folder before style folder, error when empty); `referenceImages` (HTML rendered once per results folder, images copied as they are).
- [x] 3.2 `measure.mjs`: `screenshot`. `lib.mjs`: `prepare` copies references into `references/`.
- [x] 3.3 `run.mjs`: `--references`, check before the first run, folder recorded in `environment.jsonl`.
- [x] 3.4 Four original reference pages and `references/README.md`.

## 4. Product screens

- [x] 4.1 Styles `foundry-app` and `broadsheet-app`.
- [x] 4.2 Scenarios `workbench-list` and `settings-page`; set `product-ui` in `SETS` and `DEFAULT_SETS`.
- [x] 4.3 `measure.mjs`: `targetSizeFails` in `measure.json`, outside the composite and the frozen columns.

## 5. Report

- [x] 5.1 `report.mjs`: reference family and the three questions. `judge.mjs`: two more default pairs.
- [x] 5.2 README: variant, scenario set, known blind spots, comparison groups, three questions, what happens after a verdict, how to run, cost.

## 6. Tests

- [x] 6.1 Scenario and variant contract for the twelve scenarios and `reference-system`.
- [x] 6.2 Reference folder lookup and the missing-reference error.
- [x] 6.3 Three questions: not enough data without a judge, yes and no with one, reference family only when the variant ran.
- [x] 6.4 Product screens scored from two complete fixture pages; small targets and a dropped status label are caught.
- [x] 6.5 Runner: references and `DESIGN.md` in the working folder, no skill, own screenshot folder, empty folder refused.

## 7. Review of #373

- [x] 7.1 `report.mjs`: the second question reuses the Holm-corrected verdict of the reference family instead of deciding the pair alone.
- [x] 7.2 `measure.mjs`: `coveredPieces` gives every required piece its own place, so a repeated word must appear as often as the content lists it and a longer piece does not cover a shorter one; the negative fixture keeps its filters.

## 8. Not done here

- [ ] 8.1 Run the eval and commit the result table and verdicts under `docs/research/`. Owner triggers this: client, model, runs per cell and budget are the owner's call.

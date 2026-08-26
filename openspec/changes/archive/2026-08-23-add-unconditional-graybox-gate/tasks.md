# Tasks

- [x] Add failing contract tests: `2.5d` primary-target with unavailable source must report `graybox` blocked before polish.
- [x] Add the `graybox` block to `reconstruction.schema.json` and `reference-evidence.schema.json`.
- [x] Implement `--stage graybox` in `reconstruction-core.cjs` and route it through `check-reconstruction.cjs`.
- [x] Report the three stages independently; never infer `graybox` from `geometry`.
- [x] Require a declared graybox runtime mode before a capture counts as suppressed.
- [x] Subsume the existing `3d`/`hybrid` graybox requirement without renaming `graybox.png`.
- [x] Treat pre-existing changes without a graybox block as `blocked`, not invalid.
- [x] Update `reconstruction-spec.md`, `reference-spec.md`, and SKILL.md Stage 5 gate ordering.
- [x] Add the Graybox gate row to `qa-checklist.md`.
- [x] Run focused tests, full tests, and package QA.

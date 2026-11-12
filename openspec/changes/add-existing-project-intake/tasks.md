# Tasks

Steps, fixtures, constants and acceptance: `docs/superpowers/plans/2026-10-01-existing-project-intake.md`. Behaviour:
the spec. Algorithm: `design.md`. Order against the lifecycle draft: `proposal.md` (built on today's files; S2 and
S3 are not prerequisites). Only `node scripts/qa.cjs` (run by T5, directly) checks; workers smoke with throwaway
scripts outside the repository. No file has two owners; all new tests go into `tests/workflow-next.test.cjs`.

- [x] Proposal, design, spec delta, this file, the approval page and the plan written; `openspec validate
  add-existing-project-intake --strict` passes.
- [ ] Prerequisite: `fix-tool-guidance-errors` is committed (it edits `UI_INTAKE` and the same test file).

Wave 1, in parallel:

- [ ] T1 Tests: owns `tests/workflow-next.test.cjs`; ten cases "existing project: …"; they fail on today's tree.
- [ ] T2 Module: owns `skill/scripts/existing-project-core.cjs` and one line in
  `skill/references/package-resources.json`; five read-only functions; smoke on a `git archive` copy.
- [ ] T3 Calls: owns `skill/scripts/workflow-core.cjs`; `UI_INTAKE.finished` and `.action`, the `work` action, the
  `intake` branch of `decide`; the `deliver` branch stays; its smoke waits for T2.

Wave 2, then closure:

- [ ] T4 Owns `CHANGELOG.md` and, only if it exists, `skill/references/workflow-ui.md`.
- [ ] T5 Integrator: `node scripts/qa.cjs`, `openspec validate add-existing-project-intake --strict`, smoke on
  copies of the trial worktree, `qa.md`, tick these boxes.

Pending, not done by any task: the real-model trial and the user's answers to the seven questions (`proposal.md`).

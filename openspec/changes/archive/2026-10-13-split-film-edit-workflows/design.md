# Design

Follows `redesign-user-workflow/design.md` (Q5, Q6, Q7, Q12, Q16); no decision is reopened.

- Modules: `workflows/shared.cjs` (intake, reference, concepts, review, file helpers),
  `workflows/film.cjs`, `workflows/edit.cjs`. A module exports `stages(state)`; stage objects keep
  the step 1 shape (`id`, `finished`, `action`) and add `guide`.
- `next` copies the stage's `guide` onto the action as `references/workflow-<deliverable>.md#<id>`.
- Gate freshness: `recordGate` stores `at` (ms). A stage that depends on a gate lists its input
  files; the gate counts only when `at` is not older than the newest input's mtime. Missing inputs
  mean the stage is unfinished anyway.
  - `storyboard`: `storyboard.json`.
  - `film`: `storyboard.json` and the draft render.
  - `edit`: `edit.json` and `renders/edit.mp4`.
- Replicate: film `reference` finishes only with `reference.md`; `decide --stage reference
  --answer none` is refused in replicate mode. Edit adds `reference` after `analyze` in replicate
  mode at every tier, since reproducing an edit without studying it is guesswork.
- `web` and `ui` keep the step 1 behavior; they get their own modules in a later step.

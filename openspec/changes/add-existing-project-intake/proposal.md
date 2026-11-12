# Give the ui workflow the facts of an existing project (Phase 1: instant prompt)

Status: Phase 1 built in worktree `c1-host-first` (2026-10-01), not approved, not committed. Tested behaviour:
`specs/existing-project-intake/spec.md`. Algorithm: `design.md`. This change was shrunk in place from a fuller draft
(brief persistence, digests, staleness, work folders); `docs/superpowers/plans/2026-10-01-existing-project-intake.md`
and `docs/superpowers/specs/2026-10-01-existing-project-intake.md` describe that fuller draft and are not current.

## Why

A trial (2026-09-30) ran the candidate tool inside KATANAview, a Next.js trading-terminal app (commit `d08c06a`).
`next` for `ui` at the quick tier returned one action that names no file of the project (its only pointer is the
1,216-line `references/pipeline-reference.md`); it did not point at the rules (`CONTEXT.md` line 19 lists forbidden
areas; `docs/ux/*.md`); it did not say the project has no lint script while `tsc --noEmit` works; and it asked to
create `DESIGN.md`/`MOTION.md` and to "verify the rendered surface", which the project has no tool for.

## What changes

For the `ui` deliverable only, when the project root holds `package.json`:

- The `work` action is host-first: the project's own rule files and check commands govern. It does not ask for
  `DESIGN.md`/`MOTION.md`, says not to run the pipeline's route, foundation, toolchain or stack gates, and names
  `pipeline-reference.md` only as optional background. At `full` it still asks for an OpenSpec change.
- At every `next` the action is rebuilt from the files and prints: the rule-file paths (`AGENTS.md`, `CLAUDE.md`,
  `CONTEXT.md`, root `docs/**/*.md`, bounded, path order); the checks `test`, `typecheck`, `lint`, `build` from
  `package.json` scripts, with `tsc --noEmit` when only `tsconfig.json` exists and the rest marked missing; and
  constraint lines quoted verbatim as `path:line` by a small documented word list, only from the root rule files
  and `docs/` files named as ledgers, decisions, acceptance gates, protocols, rules, conventions or doctrine (other
  docs are listed, never quoted).
- One new read-only module, `skill/scripts/existing-project-core.cjs`. No new command, option, stage, gate,
  receipt, schema, state field or file write.

## What it does not do

- It writes no `brief.md` and no state, claims nothing was read, fresh or complete, and is not evidence for any
  stage or gate. `decide --stage deliver` is unchanged (completion belongs to `align-workflow-lifecycle`).
- It does not read source files or code comments, run the host's commands, cover `web`, or wire `component
  inventory`. It misses rules phrased without its word list and quotes some non-rules (precision is modest).
- A folder without `package.json` keeps today's text.

## Later (not in this change)

Persisting the facts into `brief.md` with full digests, reopening `intake` when a rule file or check changes, and a
named work folder for projects too big to scan. Repository lineage rules apply as soon as facts are stored or used to
decide completion, so that work waits for the lifecycle slices S2/S3 and a trial showing the prompt helps.

## Not verified

- Whether agents do better with this prompt: the real-model trial (`_bmad-output/eval-katana/MEASUREMENT.md`) has not
  run. The word list was calibrated on one project (KATANAview: 12 quotes shown, 19 more cut by the caps).
- Linux and macOS; host projects other than KATANAview.

# Give the ui workflow the facts of an existing project

Status: draft, awaiting approval (2026-10-01). Nothing is approved or built. Tested behaviour:
`specs/existing-project-intake/spec.md`. Algorithm: `design.md`. Steps:
`docs/superpowers/plans/2026-10-01-existing-project-intake.md`. Picture and before/after text:
`docs/superpowers/specs/2026-10-01-existing-project-intake.md`.

## Why

A real trial (2026-09-30) ran the candidate tool inside KATANAview, a Next.js trading-terminal app (git worktree
`trial-tape-tick-direction`, commit `d08c06a`). `next` for `ui` at the quick tier (the smallest of three job
sizes) returned one action that names no file of the project (its only pointer is the 1,216-line
`references/pipeline-reference.md`, which says "existing project components, tokens, runtime, and design docs
win" and finds nothing); does not know where the rules are (`CONTEXT.md` line 19 lists forbidden areas,
`docs/ux/*.md`, top comments of source files, a `.claude/CLAUDE.md` that git excludes); does not say the project
has no lint or type-check script while `tsc --noEmit` works; and says "verify the rendered surface", which
cannot be done there: there is no screenshot tool.

## What changes

For the `ui` deliverable only, when the folder already holds source code (decided by its files, no flag):

- `next` carries a `project` field with three facts, and its text names them: the **rule files** with fingerprints
  (a short code worked out from a file's contents); the **checks** (test, type-check, lint, build), each runnable
  or missing; the **limits and extension points** the rules name, as quoted lines with `path:line`.
- At `standard` and `full`, `decide --stage intake` writes them into `brief.md` after the user's reply, as
  pointers with fingerprints, not copies. At `quick` the same facts show at `work`, are worked out at every call,
  and nothing is written.
- At every `next` the recorded fingerprints are checked against every rule file found, not only the listed ones.
  A changed, new or deleted rule file, or a changed check command, reopens `intake`: the action names the files
  and says to read them again and to run `decide --stage intake` (no answer).
- A project too big to scan fully (a limit cut the search) is never called confirmed: `intake` stays open whatever
  the agent answers. The action says so plainly and asks for a last line `Work folder: <folder>` in the reply; the
  tool then reads only the rule files on the way to that folder, inside it, and under `docs/` and `.claude/`.
- One new read-only file, `skill/scripts/existing-project-core.cjs`. No new command, option, stage, gate, receipt,
  schema or state field.

## What it does not do

- **Completion** is owned by `align-workflow-lifecycle`; `decide --stage deliver` is untouched.
- **Looking at the screen** where there is no screenshot tool is reported (the text says the checks do not show
  how the screen looks), not solved.
- **Rules that exist only in code comments are shown as a hint; they are not tracked.**
- **A limit of the scan:** anything outside the limits or outside the named work folder is not seen, and the tool
  cannot tell whether that folder is where the agent really works.
- It does not edit or run the user's project, prove that its commands pass, merge the three entry commands or add a
  fourth, or cover `web`, visual baselines or workspace packages. It does not claim that agents do better with
  these facts, and it misses rules phrased without its two word lists (English, Chinese).

## Order of work

**Chosen: (b), build on today's `workflow-core.cjs`; do not wait for the lifecycle draft.** The design already runs
there: one new file and four small calls. Choice (a), waiting for the draft's slices S2 and S3, adds four unbuilt
changes to the wait (S0, S1 = `add-web-composition-checks`, S2, S3) and points the plan at a file, `ui.cjs`, that
does not exist. (b) is still tied to them: it edits the block S2 moves and the function S3 changes, so whichever
lands second carries the other.

- **Before us:** `fix-tool-guidance-errors` is committed (same `UI_INTAKE`, same workflow test).
- **S2** (`ui` gets `workflows/ui.cjs`): we need its owner to move our three calls with `UI_INTAKE` and the `work`
  stage, to keep the fields it adds to `work` (`openspec: "required"` at `full`), and to pass `reference` and
  `concepts` before `work` in our full-tier test. Its "moves unchanged" is then untrue.
- **S3** (`decide` answers only the question `next` asks): we need its turn check to run before our `intake`
  branch and to accept `decide --stage intake` without `--answer` when the brief has the section. The reopened
  `intake` is the first unfinished stage, so that call is in turn.
- **If you choose (a):** only T3 changes (`ui.cjs` holds the three calls); spec and tests stay.

`add-web-composition-checks`, `add-web-capability-skills` and `add-capability-registry` share no code or stage but
each edits the workflow test, `package-resources.json` or `CHANGELOG.md`: merge one after the other.

## Open questions (default first)

1. Build now on today's files (b, default), or wait for S2 and S3 (a)?
2. Completion and the `probe` page problem stay with the lifecycle draft (default); answer its question 7 with this
   project in mind?
3. A changed rule or check reopens the intake, and a cut search stays open until a work folder is named (default);
   or only a warning?
4. Name the work folder on a line of the reply (default, no new option), or add an option?
5. A new module (default; eight lifecycle slices edit `shared.cjs` and `workflow-core.cjs`), or the functions
   inside `shared.cjs`?
6. English and Chinese word lists (default); add a language when a trial shows a miss?
7. Run the small trial after closure and before archive (default): 3 runs per arm, or 5?

## Not verified

- Nothing is built; `node scripts/qa.cjs` was not run. The numbers (18 rule files in 12 ms; the main folder 19,
  3,398 of 4,000 entries) and the freshness results come from throwaway prototypes on two folders.
- The project's own commands were not run; word lists in other projects and languages; Linux and macOS; whether 5
  levels and 4,000 entries suit other projects; that agents write the `Work folder:` line when asked; how S2 and
  S3 will look when built (I read the drafts on 2026-10-01).
- Real-model trial, proposed and not run: the tape-setting task of `MEASUREMENT.md` F1, today's one-line `next`
  against `next` with the facts, fresh context, 3 runs per arm as a smoke exercise (5 is better); checks: a rule
  file read before the first edit, `tsc --noEmit` and `vitest` run, no forbidden path changed, the report lists
  files and commands with results.

# Design

Evidence, algorithm and reasons. What and why: `proposal.md`. Tested behaviour: the spec. Exact rules and steps: the
plan. Nothing is built. Facts were read on 2026-10-01 at `b631fcd`, with other drafts' uncommitted edits present, so
line numbers move. Words: a fingerprint is a SHA-256 of contents; the walk is the search for rule files; the digest
is one fingerprint over every rule file the walk found and the checks; the lifecycle draft is
`openspec/changes/align-workflow-lifecycle` (unapproved).

## 1. Evidence

Each "R" is a throwaway run outside the repository; none wrote into it or into the KATANAview folders.

- **R1 Today.** `next` in the trial worktree (`C:/Users/Administrator/orca/workspaces/KATANAview/trial-tape-tick-direction`,
  `d08c06a`, `ui` `quick`) returns the `command` on the approval page, built at `workflow-core.cjs:43`; intake
  writes `# Brief` and the reply (`:105-107`); `nextAction` passes `(state, root)` to `finished` and `action`
  (`:89-90`). The rules are in `CONTEXT.md:7, 19`, `docs/ux/*.md` and top comments; `package.json` has `test` and
  `build` only; no screenshot tool (`_bmad-output/eval-katana/MEASUREMENT.md`).
- **R2 The scan**, on a `git archive` copy of that worktree: 18 rule files, 21 of 204 source files with a rule
  comment, 12 ms. On `D:/projects/KATANAview` (the main folder): 19 rule files, 3,398 of the 4,000 entries, the
  400-file comment limit reached, 54 ms. A folder with `index.html`, and this repository, answered "no".
- **R3 No reader exists.** `skill/scripts` has no code for lockfiles, `tsconfig`, `vitest`, `eslint` or
  `packageManager`; `package.json` is read only for dependency names and two tool settings. So this is no second
  target resolver: it resolves no target and feeds no gate.
- **R4 Freshness and the cut walk** (same copy, synthetic folders): a rule file at level 7 stayed unconfirmed after
  another deep file was added; with `Work folder: components` the second walk was not cut, a rule file added
  inside was named and an edit of the deep file outside was not seen; `nope`, `.`, `../x`, an absolute path and a
  file were not usable, `a` was usable but cut. Comment edits changed nothing; 450 source files capped the hint,
  not the walk. A 41st rule file, or an edit of an unlisted one, gave the entry for files beyond the listed rows.

## 2. Algorithm

New `skill/scripts/existing-project-core.cjs` (only reads; `sha256`, `pathInside` from `contract-utils.cjs`; no
`child_process`), one `required` line in `package-resources.json`, four small calls in `workflow-core.cjs`
(`UI_INTAKE.finished`, `UI_INTAKE.action`, the `work` action, the `intake` branch of `decide`), new cases in
`tests/workflow-next.test.cjs`. The plan's "Fixed interfaces" hold the exact rules.

```text
inspectProject(root, reply) -> null | facts   // the `project` field; reply defaults to keptReply(root)
workText(facts, tier)       -> string         // the `command` of the ui work action
briefSection(root, reply)   -> string         // "## Existing project ..." with full 64-character hashes
freshness(root)             -> { stale: [{ path, change }], unconfirmed: boolean }
keptReply(root)             -> null | string  // the reply of a brief that has the section
```

Quotes use two fixed word lists (English, Chinese); precision is modest: two quotes in R2 came from a research
document, and `CONTEXT.md:26` ("AI 不可执行真实交易") was missed because "不可" is not in the list. The `work`
code starts from today's action and replaces `command`, so a field another change adds (the lifecycle draft's
`openspec: "required"`) survives; the text drops "create DESIGN.md/MOTION.md if missing" (the project's design
documents win, `pipeline-reference.md:56`) and ends with today's `decide --stage deliver --answer <evidence>`.

```markdown
## Existing project
Scan: complete | complete inside components | cut (too big to scan fully; not confirmed)
- root  CONTEXT.md  <64 hex>
- docs  docs/ux/ACCEPTANCE.md  <64 hex>
- checks  package.json  <64 hex>
- digest  all  <64 hex>
### Checks / Limits and extension points quoted from the rules
Rules that exist only in code comments are shown by `next` as a hint; they are not tracked.
```

## 3. Why it works this way

- **The display is capped, the check is not.** The digest covers every rule file, so a 41st file or an edit of
  an unlisted one changes it. The brief keeps 64 characters: 12 can collide; 12 are for reading in `next`.
- **Where it runs.** The comparison is `UI_INTAKE.finished`, so it runs at every `next` and in the `next` each
  `decide` returns: a stage is finished by evidence that exists now. The refresh is the existing `decide --stage
  intake` with no answer. Naming the files is best effort; staleness is not.
- **A cut walk cannot be confirmed by a declaration.** A file beyond the cut changes nothing the tool can
  compare, so equal values prove nothing, and an agent cannot vouch for files the tool never read. So `intake`
  stays open and the one way out is a smaller walk: a `Work folder:` line at the end of the reply. A line, not an
  option: an option needs `cli-core.cjs` (`KNOWN_OPTIONS`, dispatch, help) and a value for the refresh to keep;
  the reply already sits in `brief.md` and the refresh keeps it. Costs: the agent resends its reply once; the tool
  cannot tell whether the folder is where the agent really works. R2: the main folder reads 3,398 of 4,000
  entries, so the two limits are numbers to revisit after a trial.
- **Comment-only rules are a hint.** The scan reads 30 lines of at most 400 files and R2 reached that limit. It
  cannot prove that no comment rule changed, so tracking them would claim more than it knows.
- **A stale brief reopens `intake`** instead of a warning (an ignored warning leaves the brief silently old).
  Cost: an agent that edits a rule file itself gets one refresh call, even after delivery; `completed` and
  `remaining` then describe the walk up to `intake`.

## 4. Decisions and boundaries

- **Left alone.** `decide --stage deliver` still takes any text; completion belongs to the lifecycle draft (order,
  and what S2 and S3 must keep: `proposal.md`). The trial project has no screenshot tool: the text says the
  checks do not show how the screen looks, which reports the gap and does not close it.
- **A new module**, not `shared.cjs` or `workflow-core.cjs`: the scan is ~200 lines, eight lifecycle slices edit
  those files, and `scripts/qa.cjs:111-119` checks `skill/scripts/*.cjs` but not `workflows/`. Fallback: move the
  five functions; tests call only `nextAction` and `decide`.
- **Files decide, nothing is stored.** Checks are defined, not run. Other repositories are skipped (the main
  folder holds several); `.claude` is the one hidden folder read.

# Tasks

Order: T1 to T5 in parallel (no file has two owners), then closure (T6). The web change
`add-web-treatment-and-section-briefs` is committed as `b631fcd`, so T4 and T5, which edit files it
changed, do not wait. Each worker edits only the files it owns. Each test sits with the fix it
proves, in an existing test file, so no test file is added and `scripts/test-manifest.json` does
not change. The executable plan, with steps and acceptance, is
`docs/superpowers/plans/2026-09-30-fix-tool-guidance-errors.md`. Facts, proof commands and the
fixed `ui` question wording are in `design.md`.

Later changes and the files they share with this one: `add-web-capability-skills` owns the
`skill/SKILL.md` front matter and the web bullet; `add-capability-registry` comes after this
change, reads the `film check` help line and the `## check` section that T2 writes, and owns the
`.claude` router (see `proposal.md`, Order of work). Order of owners for `skill/SKILL.md`: this
change edits only the tier row and the decision line (T5); the others add or replace bullets
under "Where the details are" and the front matter. Whoever lands last measures the file (`wc -c`,
limit 5120).

## Verification protocol

The only sanctioned check is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode, and it fails unless
`git status` is the same at the end as at the start. Workers therefore do not run it. T6 runs it
once on a quiet tree after T1 to T5 land, hands failures back to the owner, and reruns.

A worker may check its own change with a throwaway script outside the repository. That is smoke
evidence, not the check.

## Done in this slice

- [x] Read the two inventories, ran or read each defect again, and wrote the proposal, design,
  spec delta, tasks, the spec document and the plan.
- [x] `openspec validate fix-tool-guidance-errors --strict` passes.

## Wave 1

### T1 film-edit strings and their test (size M)

Owns `skill/scripts/edit-project-core.cjs`, `skill/scripts/edit-core.cjs` and
`tests/film-edit.test.cjs`.

- [x] Add the test case first: every `film edit` or `film-edit` command named by `analyzeProject`,
  `autoProject`, `renderProject` and `checkProject` (errors and `next` steps) goes through the CLI
  and must not come back `UNKNOWN_COMMAND` or `UNKNOWN_ARGUMENT`; each error message starts with
  `film-edit:`.
- [x] Write `film-edit` in the seven hints, the header comment and every `fail("film edit", ...)`
  label; set `SCOPE` in `edit-core.cjs` to `film-edit`.
- Proves: the messages, against real CLI output. It does not prove the wording is good.

### T2 film check help, guide and their test (size M)

Owns `skill/scripts/cli-core.cjs` (the one `film check` help line, and nothing else),
`skill/references/workflow-film.md`, `skill/references/composition-gate.md` and
`tests/film-project.test.cjs`.

- [x] Add the test case first: run `checkFilmProject` on the existing flat-render fixture and check
  that every gate id in `steps` appears in the `film check` help line (`check` maps to `carry`).
- [x] Rewrite the help line, the `## check` section and line 23 of `composition-gate.md` as
  `design.md` section 1.3 says. Keep exactly one `##` heading per stage id in the guide.
- Proves: the help names every gate the command reports. The guide is read against the code.

### T3 Stale comment and command surface (size S)

Owns `skill/scripts/workflows/shared.cjs` (the comment only) and
`docs/cli-and-reference-providers.md`.

- [x] Correct the comment; add the missing commands to the Command Surface list.
- [x] Compare the list with `--help` with a throwaway script and record the result.

## Also wave 1: files the web change edited

### T4 ui intake and its test (size M)

Owns `skill/scripts/workflow-core.cjs` and `tests/workflow-next.test.cjs`.

- [x] Define `UI_INTAKE` (spread of the shared intake, four new questions); use it in
  `codeStages`; keep the `INTAKE` import, since `UI_INTAKE` spreads it.
- [x] In the test file: update the case that compares `ui` intake with the shared one so that `ui`
  compares with its own; add the cases from `design.md` section 1.2.

### T5 Pointers and tier text (size S)

Owns `skill/references/pipeline-reference.md` and `skill/SKILL.md`.

- [x] Replace the `pipeline-method.md` sentence at `pipeline-reference.md:558`.
- [x] Limit the tier row and the decision line in `SKILL.md` to `film`, `edit` and `web`; keep the
  file under 5120 bytes.

## Closure (T6, integrator)

- [x] `CHANGELOG.md` under Unreleased: a Fixed entry for the items above; replace the sentence "The
  `ui` deliverable's intake still asks for a duration." from the web change's entry.
- [x] Run `node scripts/qa.cjs` directly, and `openspec validate fix-tool-guidance-errors --strict`.
- [x] Smoke (plan Task 6, step 3): the four commands there, output recorded.
- [x] Write `qa.md`; tick these boxes.

`scripts/test-manifest.json` and `skill/references/package-resources.json` do not change: the tests
are in files already listed, and no file under `skill/` is new.

## Pending (not done by any task above)

- [ ] Decide who writes `control.gates`, and confirm by running `run --to` past a gated phase.
- [ ] The routers, `ui` stages and guide, orphan documents and duplicate wrappers: a later step.

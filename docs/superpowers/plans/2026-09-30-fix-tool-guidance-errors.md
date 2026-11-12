# Fix Tool Guidance Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the plain mistakes in tool guidance: `film-edit` hints that name a command that does not exist, a `ui` intake that asks film questions, a `film check` help line and guide that say less than the command does, and four smaller wrong statements. No command, option, stage, gate, receipt or schema is added.

**Architecture:** Words and one set of questions change. `workflow-core.cjs` defines `UI_INTAKE` by spreading the shared intake and replacing only its questions, so the stage id, finish rule, record command and stage counts stay as they are and `workflows/shared.cjs` keeps its behaviour. No test file is added. Each fix gets its test in the existing suite that already covers it: `tests/film-edit.test.cjs` for the `film-edit` hints, `tests/film-project.test.cjs` for the `film check` help, `tests/workflow-next.test.cjs` for the `ui` intake. Each test file has one owning task.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/fix-tool-guidance-errors/` (`proposal.md`, `design.md`, `tasks.md`, `specs/tool-guidance/spec.md`); summary `docs/superpowers/specs/2026-09-30-fix-tool-guidance-errors.md` (draft, awaiting approval).

## Global Constraints

- Only the defects in `design.md` section 1. Do not start anything in section 4 (routers, `ui` stages or guide, orphan documents, wrappers, `control.gates`, `decide --stage` names).
- No new command, option, stage, stage id, gate, finding code, receipt, schema or workflow-state field. `film check` and `verify composition` report exactly what they report today.
- `add-web-treatment-and-section-briefs` is committed as `b631fcd`, so nothing waits on it: Tasks 1 to 5 run in parallel, then Task 6 (closure). Never edit `skill/scripts/workflows/web.cjs`, `skill/references/workflow-web.md` or `skill/references/web-direction.md`.
- Later changes share some files. `skill/SKILL.md`: this plan edits only the tier row and the line "The user decides twice in standard work" (Task 5); the front matter and the web bullet belong to `add-web-capability-skills`, and `add-capability-registry` adds one bullet. `add-capability-registry` comes after this plan, reads the `film check` help line and the `## check` section that Task 2 writes, and owns the `.claude` router. Do not edit `.claude/skills/design-pipeline/SKILL.md`; a router bullet fix (intake bullets that name `product-film-direction.md` and `film-edit.md` instead of the workflow guides) is left to the registry change. Whoever lands last measures `skill/SKILL.md` (`wc -c`, limit 5120).
- Do not edit `skill/scripts/workflows/shared.cjs` beyond its top comment, and do not edit `film.cjs` or `edit.cjs`. Film, edit and web `next` output stays identical.
- No new test file; `scripts/test-manifest.json` does not change. Add cases to the existing files named in the tasks.
- No wording or source-text tests: tests use command output, function results and the help text as a list of gate names. Guide and reference fixes are proved by reading them against the code. Do not copy the exact-string style of the help test in `tests/guided-multi-surface-cli.test.cjs`.
- Plain words: short sentences, ordinary verbs, explain a technical term in a few plain words (`skill/references/plain-language.md`).
- The only sanctioned check is `node scripts/qa.cjs`, run directly with no pipe or redirect into the repository; never bare `node --test`. Only Task 6 runs it, on a quiet tree. A worker may smoke its change with a throwaway script outside the repository.
- Each task edits only the files it owns. No file appears under two tasks. Preserve unrelated working-tree changes; do not commit.
- Spec deltas use `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` and must pass `openspec validate fix-tool-guidance-errors --strict`.

## Fixed interfaces (shared by all tasks)

- Command spelling: `film-edit analyze|auto|render|check`. Error label and `SCOPE`: `film-edit`.
- `ui` intake question ids, in order: `product`, `audience`, `scope`, `assets`. Wording and recommendations exactly as the table in `design.md` section 1.2. `record`, `question` and `why` are inherited from the shared intake.
- Banned in `ui` intake (case-insensitive): `how long`, `duration`, `film`, `promo`, `video`, `footage`, `beat`, `music`, `launch event`.
- Gates `film check` reports, and the words the help line must contain: `storyboard`, `score grid` (only when `score-grid.json` exists), `timeline`, `render`, `audio` (only when the film has sound), `composition`, `carry`.
- Extra text checks that `verify composition --elements` adds and `film check` does not run: `text-contrast`, `text-off-canvas`, `alignment-near-miss`, `flat-hierarchy`, `type-scale-sprawl`.
- `ui` stage ids: quick `["work"]`; standard and full `["intake", "work"]`.

---

### Task 1: film-edit strings and their test

**Owner:** worker A. **Wave:** 1.

**Files:**

- Modify: `skill/scripts/edit-project-core.cjs`
- Modify: `skill/scripts/edit-core.cjs`
- Modify: `tests/film-edit.test.cjs`

**Interfaces:**

- No function signature, return shape or error code changes; only text.
- Helper in the test: `resolves(words)` runs `node skill/scripts/designer-pipeline.cjs <words> --root <temp dir>` with `spawnSync`, parses the JSON on stdout, and is true unless `error.code` is `UNKNOWN_COMMAND` or `UNKNOWN_ARGUMENT`. (Verified: `film-edit auto --root T` returns `CONTRACT_INVALID` "--project-root requires a path", so a known command with missing options is told apart from an unknown one.) `commandsIn(text)` returns every match of `/\bfilm[ -]edit\s+[a-z]+/g`.
- The file already has `tmp`, `ff`, `clickTrack`, `music()`, `sources()` and the `skip` guard; reuse them.

- [ ] **Step 1: Add the failing test case to `tests/film-edit.test.cjs`**

Reach each of the seven hints in a temporary directory, collect the strings, and for each collected command assert `resolves(command.split(/\s+/))`. Assert that at least one command was collected per source, so the test cannot pass on nothing:

- lines 64 and 85 errors: `autoProject(dir)` with no `edit/analysis.json`; `checkProject(dir)` with `edit.json` present and no analysis (catch the thrown error, read its message);
- line 66 error: `autoProject` twice with a hand-made `edit/analysis.json` (schema `design-pipeline.edit-analysis.v1`, `music` and `sources` shaped like `music()` and `sources()`) and no `replace`;
- line 71 `next`: the result of the first successful `autoProject`;
- line 78 `next`: `renderProject(dir, { render: () => {} })` with that `edit.json`;
- line 108 `next`: `checkProject(dir)` with `edit.json` and the analysis but no `renders/edit.mp4` (the `render` step's `next`);
- line 56 `next`: `analyzeProject` on generated footage and music (ffmpeg; use `{ skip }` like the neighbouring cases).
- Also assert each thrown error message starts with `film-edit:`.

- [ ] **Step 2: Confirm the case fails on today's tree**

Run the case with a throwaway script outside the repository that requires the same helpers. Expected: it fails on `film edit auto` (`UNKNOWN_ARGUMENT`).

- [ ] **Step 3: `edit-project-core.cjs` and `edit-core.cjs`**

In `edit-project-core.cjs` replace `film edit` with `film-edit` in the header comment (line 3), every `fail("film edit", ...)` label (lines 24, 26, 37, 39, 64, 66, 85), and the command hints at lines 56, 64, 66, 71, 78, 85 and 108 (for example `designer-pipeline film-edit auto --project-root . --style mad|pv [--duration <sec>]`, "Fix: run film-edit analyze first", "Run film-edit render, then check again."). Set `SCOPE` in `edit-core.cjs` (line 14) to `"film-edit"`.

- [ ] **Step 4: Smoke**

Rerun the throwaway script. Expected: the case passes, and `grep -rn "film edit" skill/scripts` prints nothing.

- [ ] **Step 5: Hand off**

Report the changed lines and the case name. Do not run `node scripts/qa.cjs`.

---

### Task 2: film check help, guide and their test

**Owner:** worker B. **Wave:** 1.

**Files:**

- Modify: `skill/scripts/cli-core.cjs` (the single `film check` help line, currently line 406; no other line)
- Modify: `skill/references/workflow-film.md`
- Modify: `skill/references/composition-gate.md`
- Modify: `tests/film-project.test.cjs`

**Interfaces:**

- Help line: `film check --project-root <dir>` followed by a parenthesis that names, in order: storyboard, score grid (when score-grid.json exists), timeline, render, audio (when the film has sound), beat-frame composition and carry gates, and ends with "each finding carries a fix".
- `workflow-film.md` keeps exactly one `##` heading per stage id and every other section unchanged.
- The test file already has `tmp`, `hasFfmpeg`, `scaffoldFilm`, `checkFilmProject`, `spawnSync` and `cli` (the path of `designer-pipeline.cjs`).

- [ ] **Step 1: Add the failing test case to `tests/film-project.test.cjs`**

Place it after "film check reviews each beat frame's composition after render", `{ skip: !hasFfmpeg && "ffmpeg not installed" }`. Build the same fixture (scaffold, remove `index.html`, flat 12 s render with a sine tone), run `checkFilmProject(dir)`, read the `film check` line from `node <cli> --help` (`spawnSync`, stdout), and for each `step.gate` assert the line contains its word (`check` maps to `carry`). If `score-grid.json` cannot be reached by a small fixture, say so in a comment and leave `score grid` to the help wording.

- [ ] **Step 2: Confirm the case fails on today's tree**

Throwaway script outside the repository. Expected: it fails on `audio`, `composition` and `carry`.

- [ ] **Step 3: Help line**

Rewrite the line as specified. Expected: `--help` shows it and the other lines are byte-identical.

- [ ] **Step 4: `workflow-film.md` `## check`**

List the gates `film check` runs and which are conditional. Say the composition check looks at pixels only and does not read text. Turn the `composition capture` then `verify composition` sentence into an optional step: capture the page state, then `verify composition --image ... --elements ...`, which adds the five text checks in Fixed interfaces. Keep "Apply each finding's `fix` and rerun" and "A re-render reopens this stage."

- [ ] **Step 5: `composition-gate.md` line 23**

Say the `film check` step runs on each beat's midpoint frame with the `frame` profile and reads pixels only; text checks need `--elements`.

- [ ] **Step 6: Read-through against the code**

Compare the three texts with `checkFilmProject` in `skill/scripts/film-project-core.cjs` (storyboard, score grid, timeline, render, audio condition, composition without elements, carry) and with `checkElements` in `skill/scripts/composition-core.cjs`. Expected: no gate is missing and no claim is wider than the code. Rerun the throwaway script; the case passes.

- [ ] **Step 7: Hand off**

Report the four paths and the case name. Do not run `node scripts/qa.cjs`. If another agent has edited `cli-core.cjs`, edit only the one help line.

---

### Task 3: Stale comment and command surface

**Owner:** worker C. **Wave:** 1.

**Files:**

- Modify: `skill/scripts/workflows/shared.cjs` (top comment only, line 3)
- Modify: `docs/cli-and-reference-providers.md`

**Interfaces:** the Command Surface list keeps its one-line-per-command style (`command action|action`).

- [ ] **Step 1: Comment**

Change line 3 so it names film, edit, web and `ui` as the deliverables that use these stages and helpers. No code changes.

- [ ] **Step 2: Command Surface**

Add lines for `next`, `decide`, `film` (scaffold, capture-timeline, blender, score, blocks, check), `film-edit` (analyze, auto, render, check), `film-eval measure`, `audio master`, `composition capture`, `source audit`, and the missing `verify` forms (`audio`, `composition`, `interaction`, `film-storyboard`, `film-timeline`, `film-render`, `--gate`). Do not touch the `source add` paragraph.

- [ ] **Step 3: Compare with `--help`**

Throwaway script outside the repository: take the first word of each command line in `designer-pipeline --help`, and check each appears in the Command Surface list. Expected: none missing. Record the output in the hand-off.

- [ ] **Step 4: Hand off**

Report the two paths and the script output. Do not run `node scripts/qa.cjs`.

---

### Task 4: ui intake and its test

**Owner:** worker D. **Wave:** 1 (parallel with Tasks 1 to 3 and 5).

**Files:**

- Modify: `skill/scripts/workflow-core.cjs`
- Modify: `tests/workflow-next.test.cjs`

**Interfaces:**

- `workflow-core.cjs` defines `const UI_INTAKE = { ...INTAKE, action: () => ({ ...INTAKE.action(), questions: [...] }) }` with the four questions of `design.md` section 1.2, and `codeStages` returns `[UI_INTAKE, work]` at standard and full. `INTAKE` stays imported because `UI_INTAKE` spreads it. The `work` stage and the quick tier are unchanged. Exports are unchanged.
- The web change's case "film, edit and ui prompts at intake and concepts equal the shared ones" must keep film and edit comparing with the shared intake and must stop asking `ui` to equal it.

- [ ] **Step 1: Update and add tests (failing first)**

In `tests/workflow-next.test.cjs`: change the existing case so `ui` is excluded from the shared comparison. Add cases: standard `ui` with no `brief.md` gives `ask` with question ids `["product","audience","scope","assets"]`, no `duration`, `JSON.stringify(action)` with no match for the banned words, and `record`, `question` and `why` equal to the shared intake's. After `decide --stage intake` the next action is stage `work` and `completed` equals `["intake"]`. `ui` stage ids: quick `["work"]`; standard and full `["intake","work"]`. Film and edit intake still contain `duration`.

- [ ] **Step 2: Implement `workflow-core.cjs`**

Add `UI_INTAKE` and use it in `codeStages`. Expected: no other line of the file changes.

- [ ] **Step 3: Smoke**

In a temporary directory outside the repository run `node skill/scripts/designer-pipeline.cjs next --root <dir> --project-root <dir> --deliverable ui --tier standard`, then the same with `--deliverable film`. Expected: the `ui` output has the four new questions and the film output is byte-identical to before (still "How long?").

- [ ] **Step 4: Hand off**

Report the changed files and case names. Do not run `node scripts/qa.cjs`.

---

### Task 5: Pointers and tier text

**Owner:** worker E. **Wave:** 1 (parallel with Tasks 1 to 4).

**Files:**

- Modify: `skill/references/pipeline-reference.md`
- Modify: `skill/SKILL.md`

**Interfaces:**

- `pipeline-reference.md` (line 558 of the committed tree, the sentence starting "Read `references/pipeline-method.md`"): replace it with a pointer to `references/pipeline-phases.json` (phases, gates, inputs, outputs, what each invalidates) and to `explain-block` (why a phase is blocked). Change nothing else in the file.
- `SKILL.md`: the `standard` row of the tier table and the line "The user decides twice in standard work" say the concepts and the draft review belong to `film`, `edit` and `web`, and that `ui` at standard asks for the brief and then goes to the work. Size under 5120 bytes and under 500 lines; no other line changes.

- [ ] **Step 1: Confirm the pointer target**

Open `references/pipeline-phases.json` and check that `design-pipeline.control.v1` phases list `depends_on`, `inputs`, `outputs`, `gates` and `invalidates`. Expected: they do (checked 2026-09-30).

- [ ] **Step 2: Edit both files**

As specified. Then `wc -c skill/SKILL.md`. Expected: below 5120.

- [ ] **Step 3: Hand off**

Report the byte count and the two changed lines. Do not run `node scripts/qa.cjs`.

---

### Task 6: Changelog, QA and smoke (integrator)

**Owner:** integrator. **Wave:** closure, after Tasks 1 to 5.

**Files:**

- Modify: `CHANGELOG.md`
- Create: `openspec/changes/fix-tool-guidance-errors/qa.md`
- Modify: `openspec/changes/fix-tool-guidance-errors/tasks.md` (tick boxes only)

**Interfaces:**

- `scripts/test-manifest.json` and `skill/references/package-resources.json` do not change: the tests are in files the manifest already lists, and no file under `skill/` is new.
- `CHANGELOG.md` under `[Unreleased]`: a Fixed entry naming the change id: `film-edit` hints and error label say `film-edit`; the `ui` intake asks about what is built instead of a duration; `film check` help and the film guide list every gate and describe the optional text check; the command surface list, the `shared.cjs` comment, the `pipeline-reference.md` pointer and the `SKILL.md` tier text corrected. In the web change's Changed entry, replace the sentence "The `ui` deliverable's intake still asks for a duration."
- `qa.md` follows `openspec/changes/add-web-treatment-and-section-briefs/qa.md`: Conformance (verified), Open questions and answers, Not verified.

- [ ] **Step 1: Record the change**

Edit the changelog. Run `openspec validate fix-tool-guidance-errors --strict`. Expected: valid.

- [ ] **Step 2: Run QA on a quiet tree**

Run `node scripts/qa.cjs` directly. Expected: exit 0. On failure, hand the failing file back to its owner, wait, rerun.

- [ ] **Step 3: Smoke the CLI**

In temporary directories outside the repository (`--root <dir>`): (a) `film edit auto` and `film-edit auto` on an empty project, and `film-edit auto` with `--project-root` on one that has no analysis: the error starts `film-edit:` and names `film-edit analyze`; (b) `next --deliverable ui --tier standard`: four new questions, no duration; then `decide --stage intake --answer x`: stage `work`; (c) `next --deliverable film --tier standard`: intake still asks "How long?"; (d) `--help | grep "film check"`: names audio, composition and carry. Record the output.

- [ ] **Step 4: Write `qa.md` and tick the tasks**

Record the exit codes and smoke output observed. State what was not verified: `control.gates` (not run), the guide wording (read, not tested), any caller outside the repository that matches the old error label.
Expected: `openspec validate fix-tool-guidance-errors --strict` still valid after the last edit.

---

## Acceptance

- `openspec validate fix-tool-guidance-errors --strict` reports valid.
- `node scripts/qa.cjs`, run directly, exits 0, and runs the new cases in `film-edit.test.cjs`, `film-project.test.cjs` and `workflow-next.test.cjs`.
- The smoke of Task 6 step 3 shows `film-edit` hints, the new `ui` questions, the unchanged film intake, and a `film check` help line that names audio, composition and carry.
- `git status` shows changes only in the files owned by Tasks 1 to 6, this plan, the spec document and the OpenSpec change folder.

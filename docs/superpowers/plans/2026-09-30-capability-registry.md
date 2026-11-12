# Tool List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One JSON list, `scripts/tool-list.json` (the tool list): one checked list of what exists and where it is taught. `next` and `--help` stay the source for what they say. A test checks `--help`, the job registry, the `next` actions, `skill/SKILL.md`, the repo skill (`.claude/skills/design-pipeline/SKILL.md`), the command examples in code and guides, and the scripts against the list; and a readable stage map (the tool map) is generated from it. No new gate, proof record, schema file, stage, command, flag or entry command; no change to any help text or `next` text; and one small change to shipped code, in the command table of `cli-core.cjs` (Task 6), which makes the table list every action (an empty list for the ten commands that take none) and refuse a stray word after `next` and `decide`, so that the test can compare it with the help and the list.

**Architecture:** The tool list (168 entries: 142 command rows, that is each row that `--help` lists plus `source add`; 11 standalone scripts; 15 guides; plus a list of 6 scripts that other commands start) is data; no command reads it. A repository script, `scripts/tool-list.cjs`, loads and validates it, collects the inputs of the checks from the repository, runs five surface checks and renders the map (`--check`, `--write`); it is not shipped, and neither is the list. The test `tests/tool-list.test.cjs` runs each check on the real inputs and on inputs broken on purpose. One change to shipped code (Task 6): the script reads only what shipped modules export (`publicHelp`, `execute` and the new `commandPaths`; `initState`, `nextAction` and `decide`; the `stages` of the film, edit and web modules) and reads `ui`, which has no stage module, by running `next` through its stages. Only the generated `skill/references/tool-map.md` ships with the skill; it is named from `skill/SKILL.md` and the repo skill.

**Tech Stack:** Node.js CommonJS, JSON, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/add-capability-registry/` (`proposal.md`, `design.md`, `tasks.md`, `specs/tool-list/spec.md`, `appendix-command-rows.md`); approval summary `docs/superpowers/specs/2026-09-30-capability-registry.md`. Three throwaway prototypes are in `openspec/changes/add-capability-registry/prototypes/` (Task 5 deletes the folder): `convert-appendix.cjs` turns the appendix into the list (Task 2 uses it), `prove-checks.cjs` is a working model of the checks (help reader, per-stage `next` check, `ui` walk, command-example check, script accounting, guide headings, the `SKILL.md` and repo skill rules) that runs against the real repository and prints the code of each rule that fails, and `prove-table.cjs` applies the Task 6 change to a copy of `cli-core.cjs` in the temp folder and checks it (Task 6 starts from it). Run them with `node`; they write only into the OS temp folder.

## Global Constraints

- Prerequisite: `fix-tool-guidance-errors` (step 1) is committed (it is not yet at the time of writing) and `add-web-treatment-and-section-briefs` is committed (`b631fcd`). Task 0 checks it. Do not start Tasks 1, 2, 4 and 6 before it passes.
- No new gate, finding code of an existing gate, receipt, `.schema.json` file, workflow stage, workflow-state field, `designer-pipeline` command, action or flag. No change to the text of `--help`, of any `next` action, or of any command result, except the answer to an action or `--gate` value that the command table does not list (its words and the moment it is given; the code and exit code stay). Only Task 6 edits shipped code: `skill/scripts/cli-core.cjs`, and there only to list actions, refuse unlisted ones and export `commandPaths()` (`design.md` D9); nothing under `skill/adapters`.
- Do not edit `skill/references/job-registry.json`, `pipeline-phases.json` or `component-capabilities.json`. No `designer-pipeline` command reads the tool list.
- `scripts/tool-list.json` is not shipped: it is outside `skill/` and not in `required` (`design.md` D1). Only the map ships.
- `add-web-capability-skills` is another change with another worker; it adds three guide entries after this plan (rule: `tasks.md`, "Rules for later changes"). This plan edits none of its documents.
- The tool list, the map and every summary use plain words (`skill/references/plain-language.md`); a summary has at most 160 characters and states nothing the code does not do.
- No wording tests: a test asserts that names exist and agree, never what a sentence says.
- The only sanctioned verification is `node scripts/qa.cjs`, run directly with no pipe or redirect into the repository; never bare `node --test`. Only Task 5 runs it, on a quiet tree. Exception (open question Q12): the owner of Task 3 may run its own new file by name, `node --test tests/tool-list.test.cjs`. `node scripts/tool-list.cjs --check` never writes and any worker may run it.
- Each task edits only the files it owns. No file appears under two tasks. Preserve unrelated working-tree changes, including the uncommitted files of `add-web-capability-skills`; do not commit.
- `openspec validate add-capability-registry --strict` must still pass after any edit inside `openspec/changes/add-capability-registry/`.
- The two `removal-candidate` rows and the ten unreferenced wrapper scripts are only recorded. Remove nothing.
- Spec deltas use `## ADDED Requirements`, `### Requirement:` and `#### Scenario:`.

## Fixed interfaces (shared by Tasks 1, 2, 3, 4 and 6)

- **Tool list:** `{ schema: "design-pipeline.tool-list.v1", version: "1", groups: [18 strings, order of design.md 4.3], internalScripts: [{ script, reason }], entries: [...] }`. Entry fields, allowed values, the six allowed `status`/`exposure` pairs and the codes are `design.md` sections 4.1 to 4.4 and are not restated here. Ids: command = words joined by `-` (`verify --gate x` is `verify-gate-x`); script = `script-<file>` without `.cjs`; guide = `doc-` and the path under `skill/` without a leading `references/`, without the ending `.md` or `/`, each other `/` turned into `-` (`doc-workflow-film`, `doc-evals-web-README`). Stage pairs are `deliverable:stage`. `official` is `{ command }`, `{ script }` (a file of `skill/scripts`) or `{ doc }` (a path under `skill/`, or a folder ending `/`). A **guide path** in a text is a path under `references/` or `evals/`, with or without a leading `skill/`, that ends in `.md`, or a folder path that ends in `/`; trailing `.`, `,`, `;` and `)` are dropped before the test. `guide` is the one document to read, optionally followed by `#` and a heading anchor (the words of a heading in lower case, letters, digits and `-` kept, each space turned into `-`; a line inside a code fence is not a heading); it may name the command only in prose. Field order in the file is the one `prototypes/convert-appendix.cjs` writes: `id, official, group, kind, audience, deliverables, stages, exposure, status`, then `summary` or `reason`, then `guide` or `noGuide`, then `aliasOf`, `includedIn`, `aliases`.
- **Counts the first tool list must have** (`appendix-command-rows.md`): 168 entries. Command rows: `public` 16, `expert` 87 (10 with `noGuide`), `internal` 33, `alias` 3, `deferred` 1, `removal-candidate` 2. Scripts: 11 (7 expert, 4 internal). Guides: 15, all public. `internalScripts`: 6 lines.
- **`scripts/tool-list.cjs`** exports:
  - `loadToolList(file?)` and `collectInputs(repoRoot, list)`. `collectInputs` returns one object that the checks read and the test may change field by field: `{ repoRoot, skillRoot, help, jobs, stageLists, nextActions, guideSections, skillTexts, guideAnchors, exampleFiles, scripts, required, mapText, tablePaths, drive }` where `help` is `publicHelp()`; `jobs` is the parsed job registry; `stageLists` is `{ film: { standardReplicate: [ids], all: [[ids] per tier and mode] }, edit: ..., web: ..., ui: ... }`; `nextActions` is `{ start: text, stages: [{ deliverable, tier, mode, stage, project: "empty" | "full" | "walk", text }] }`; `guideSections` is `{ film: { intake: text, ... }, edit: ..., web: ... }` (the `## <stage>` sections of the workflow guides); `skillTexts` is `{ skill: text, repoSkill: text }`; `guideAnchors` is `{ "<path under skill/>": [anchors] }` for each file that an entry's `guide` names; `tablePaths` is `commandPaths()`; `drive` is `[{ command, action, code }]`, the answers of the 84 rows that `collectInputs` runs through `execute` with `--root <empty temp folder>` (`change`, `component-first-v2` and `verify --gate` with the one input they read first: an existing `--change-root` with `--expected-sha256 00`, or an `--artifact` file holding `{}`; `designmd sync` and the five `component-first` rows are not run); `exampleFiles` is `[{ file, text }]` for the scope of check e; `scripts` is the list of files under `skill/scripts` whose first line starts with `#!`; `required` is `required` of `package-resources.json`; `mapText` is the current map or `null`. `stageLists` and `nextActions` come from the `stages` of `skill/scripts/workflows/<deliverable>.cjs` when that file exists (not `shared.cjs`), and from `walkStages` for a deliverable with no such file (`ui`; `project: "walk"`).
  - `validateToolList(list, inputs)` (structure codes) and `checkCommands`, `checkNext`, `checkSkillFiles`, `checkLiterals`, `checkMap`, each `(list, inputs) -> Problem[]` with `Problem = { code, id, message }`; `runChecks(list, inputs)` returns all problems of all six.
  - `helpPaths(helpText)` (sorted command paths of the help; `verify --gate x` for gate values), `commandLiterals(text)` (every `designer-pipeline[.cjs] <first> [<second>]`, unfiltered, regex of `prototypes/prove-checks.cjs`), `guidePaths(text)`, `headingAnchors(markdown)`, `renderMap(list, inputs)` (text with `\n` line ends).
  - Program modes: `--check` (run all checks, exit 0 or 1, never write) and `--write` (render, write `skill/references/tool-map.md`, then run all checks and exit as `--check`).
- **Shipped code:** only Task 6 edits it: `skill/scripts/cli-core.cjs`, and nothing under `skill/adapters`. Task 6 adds `commandPaths()` (below). The script imports `publicHelp`, `execute` and `commandPaths` (`cli-core.cjs`), `DELIVERABLES`, `TIERS`, `initState`, `nextAction` and `decide` (`workflow-core.cjs`) and `stages` of the modules in `skill/scripts/workflows/`, and nothing else from shipped code. `walkStages(deliverable, tier, mode, api?)` is a function of the script (the walk of Task 1, Step 1); `api` defaults to those `workflow-core.cjs` exports so that a test can pass a stub.
- **`commandPaths()`** returns `[{ command, actions }]`, one item per command of the table in table order: `actions` is always a list (an empty list for the ten commands that take no action, never `null`); `verify` also has `gates`. The rows are: a command with an empty list, one row; a command with actions, one row per action; `verify`, one more row per gate. They must equal the command entries of the tool list (`TABLE_ENTRY`). The dispatcher refuses an action or gate that the table does not list (`UNKNOWN_COMMAND`, `UNKNOWN_GATE`, exit 1) and a stray word after a command whose list is empty (`UNKNOWN_ARGUMENT`, `<command> does not accept an action`, exit 1, which eight of the ten already did), before the handler reads an option.
- **Rules of the checks:** `design.md` section 6 (a) to (g). The literal rule: a literal is checked when `first` is the first word of a command entry, `second` matches `/^(--gate [a-z-]+|[a-z][a-z0-9-]*)$/`, and at least one command entry has `first` as its first word and a second word; otherwise it is skipped.
- **Map layout:** `design.md` section 7.
- **Groups (18, in order):** Start and decide; Film; Edit; Web pages; Shared checks; Review; UI and web; Guided brief and templates; Design synthesis; Design systems; Components; Reference, reconstruction and scenes; Website cloning; Knowledge catalogs; Tools and routing; Change lifecycle; Interchange checks; Maintainers.

| Task | Wave | Owner | Files |
| --- | --- | --- | --- |
| 0 Gate and re-check | 0 | integrator (Main) | `appendix-command-rows.md` and the documents that carry its counts, only if a row changes |
| 1 Script | 1 | `task:mid` | `scripts/tool-list.cjs` |
| 2 Tool list file | 1 | `task:mid` | `scripts/tool-list.json` |
| 4 Pointers | 1 | `task:low` | `skill/SKILL.md`, `.claude/skills/design-pipeline/SKILL.md`, `CONTRIBUTING.md` |
| 6 Command table | 1 | `task:mid` | `skill/scripts/cli-core.cjs` |
| 3 Test and map | 2 | `task:mid` | `tests/tool-list.test.cjs`, `scripts/test-manifest.json`, `skill/references/tool-map.md`, `skill/references/package-resources.json` |
| 5 Closure | 3 | integrator (Main) | `CHANGELOG.md`, `openspec/changes/add-capability-registry/qa.md`, `tasks.md` (ticks), deletes `openspec/changes/add-capability-registry/prototypes/` |

---

### Task 0: Gate and Re-check

**Files:** none edited, except `openspec/changes/add-capability-registry/appendix-command-rows.md` and the documents that carry its counts if a row changes.

**Interfaces:** the appendix tables are the input of Task 2; after Task 2 starts they are not edited again.

- [ ] **Step 1: Confirm the prerequisites**

Run `git log --oneline -10` and `git status --short`. Expected: the commits of `fix-tool-guidance-errors` and `add-web-treatment-and-section-briefs` are in the log (the web change is `b631fcd`), and no file owned by Tasks 1 to 6 is modified or untracked. The uncommitted files of `add-web-capability-skills` do not count.

- [ ] **Step 2: Run the prototypes again**

Run the three prototypes of this change folder: `node openspec/changes/add-capability-registry/prototypes/convert-appendix.cjs` (expected: `NO PROBLEMS`, 168 entries, 142 rows, 11 scripts, 15 guides) `node openspec/changes/add-capability-registry/prototypes/prove-checks.cjs` and `node openspec/changes/add-capability-registry/prototypes/prove-table.cjs` (expected: `ALL CHECKS PASS`, 142 rows from `commandPaths()`, 84 rows driven, 5 of 151 old-against-new cases differ and all are a made-up action). Expected in the output of `prove-checks.cjs`: (a) help paths 141 (all rows but `source add`, Table A1); (b) the commands that `next` names, found by calling every stage's `action` on an empty and a full project, are exactly the rows with evidence `N` in Table A1; (c) the command table has 52 names, 22 of them listing their actions (42 rows) before Task 6; (d) no `LITERAL_UNKNOWN`, and `ALL CHECKS PASS` (before step 1 lands the run prints exactly three `film edit` problems); and (e) `grep -rn "film edit" skill/scripts` finds nothing. Any difference is fixed in the appendix now.

- [ ] **Step 3: Read the rows marked `step1`**

Read `film check`, `verify composition` and `composition capture` against the landed `## check` section of `skill/references/workflow-film.md` and the landed `film check` line of the help. If the guide still names both composition rows, nothing changes. If it does not, set both to `expert`, clear their stage pair, set the stages of `doc-composition-gate` to none, and change the counts (public 14, expert 89; whole tool list public 29, expert 96) in every place that carries them: the appendix tables and counts, `proposal.md`, `tasks.md` (Task T2), `design.md` section 9, the approval document, and this plan (fixed interfaces, Task 2, Acceptance). Correct the `film check` summary to the landed wording.
Expected: the appendix matches the tree; `openspec validate add-capability-registry --strict` still passes.

---

### Task 1: The Script

**Files:**

- Create: `scripts/tool-list.cjs`

**Interfaces:** as fixed above. Task 1 edits no shipped file; the script imports only the exports listed under "Shipped code" (`commandPaths` exists once Task 6 has landed).

- [ ] **Step 1: Read the stages and the actions through existing exports**

In `collectInputs`, for each deliverable of `DELIVERABLES`, use `skill/scripts/workflows/<deliverable>.cjs` when that file exists (and is not `shared.cjs`): call `stages(state)` and, for each stage, `stage.action(state, root)`. For a deliverable with no such file (`ui`) call `walkStages`: `initState(dir, { deliverable, tier, mode })`, then repeat `nextAction(dir)`, record `{ stage, text: JSON.stringify(action) }`, and finish the stage with `decide(dir, { stage: "intake", answer: "x" })` for `intake` or `decide(dir, { stage: "deliver", answer: "x" })` for `work`, until `nextAction` answers `done`; throw an error that names the deliverable and the stage if a stage is neither of those or is returned again after its `decide`. Expected: at standard tier and replicate mode film 8, edit 9, web 7 and ui 2 stages; `ui` gives `work` at quick tier and `intake` then `work` at standard and full.

- [ ] **Step 2: Write `scripts/tool-list.cjs`**

Implement the functions and modes of the fixed interfaces. `validateToolList` implements every structure code of `design.md` 4.4 and reports all problems, not the first. `collectInputs` builds `nextActions` as Step 1 says (state: `{ deliverable, tier, mode, decisions: {}, gates: {}, rules: [], director: null }`; tiers quick, standard, full; modes `brief` and `replicate`) on an empty temp directory and on a temp directory holding `brief.md`, `reference.md`, `concepts.md`, `storyboard.json`, `out.mp4`, `edit.json`, `index.html`, `interaction.json`, `edit/analysis.json`, `renders/edit.mp4` and `sources/`, and takes the start action from `nextAction` on an empty directory; the temp directories are removed afterwards. `helpPaths` follows the prototype (two-space lines only; ` | ` separates commands, `a|b` separates actions, `--gate a|b` gives gate rows, notes in parentheses are dropped). `renderMap` follows section 7 and is deterministic: list order, no date, `\n` only, stage order from the `standardReplicate` list of each deliverable. `--write` renders, writes, then runs all checks. `node --check scripts/tool-list.cjs` is clean. Start from `prototypes/prove-checks.cjs`, which does the help reader, the `ui` walk, the literal rule and the guide-path rule, but reads the appendix and not the real list, and writes no map. `headingAnchors(markdown)` returns the anchors of the headings of a Markdown text and skips code fences. `guidePaths(text)` accepts paths under `references/` and `evals/`. `checkSkillFiles` also requires each of `skill/SKILL.md` and the repo skill to name `references/workflow-film.md`, `references/workflow-edit.md` and `references/workflow-web.md` (`SKILL_NAMES`). `GUIDE_MISSING` also fires when a `guide` ends in `#anchor` and no heading of that file gives it. `collectInputs` also returns `tablePaths` and `drive`, and `checkCommands` reports `TABLE_ENTRY` (a table row with no entry, or an entry the table does not give) and `DEAD_ACTION` (a driven row whose answer carries `UNKNOWN_COMMAND` or `UNKNOWN_GATE`), as `design.md` section 6, check b, says. These rules can only be tried after Task 6 has landed; until then use `prototypes/prove-table.cjs`.

- [ ] **Step 3: Smoke**

With a throwaway tool list in a temp directory (outside the repository): call `validateToolList` on copies with one deliberate mistake each (among them a `guide` heading that the file lacks) and show that every structure code fires; call `checkSkillFiles` on a repo skill text without `references/workflow-web.md` and on one that names `skill/evals/web/README.md` with no entry, and show `SKILL_NAMES` for both; call `helpPaths(publicHelp())` and show 141 paths; call `commandLiterals` and `checkLiterals` on `designer-pipeline film edit auto`, `designer-pipeline adaptation` and `the designer-pipeline skill` and show the three outcomes of the rule; once Task 6 has landed (`collectInputs` calls `commandPaths()`), call `collectInputs` on the real repository and show that the commands found in `nextActions` are the 10 commands of `next` and that the stage lists are film 8, edit 9, web 7 and ui 2; call `walkStages` with a stub that returns an unknown stage and show the error.

- [ ] **Step 4: Hand off**

Report the file, the codes shown, and the output of `git diff --stat -- skill/scripts skill/adapters`. Do not run `node scripts/qa.cjs`.
Expected: the diff is empty.

---

### Task 2: The List File

**Files:**

- Create: `scripts/tool-list.json`

**Interfaces:** the entries are the rows of `appendix-command-rows.md` (Tables A1 to A3, B, C, D) converted as its last section says. Nothing in the file is typed by hand.

- [ ] **Step 1: Convert**

Run `node openspec/changes/add-capability-registry/prototypes/convert-appendix.cjs scripts/tool-list.json`. It reads the appendix tables and writes the JSON: `groups` first, then `internalScripts` (Table D), then the 142 rows in Table A1 order, the 11 scripts of Table B and the 15 guides of Table C; fields in the order of the fixed interfaces; two-space indent, `\n`, final newline; and, if a row breaks a structure rule, it prints the problems, writes nothing and exits with 1. Do not type entries by hand and do not commit a script of your own.

- [ ] **Step 2: Check the counts**

Count entries by status and exposure and by `official` type. Expected: the counts of the fixed interfaces.

- [ ] **Step 3: Check**

When Tasks 1 and 6 have landed, run `node scripts/tool-list.cjs --check`. Expected: the only problems are the ones caused by the map not existing yet and by Task 4 not having landed: `OFFICIAL_MISSING` and `GUIDE_UNNAMED` for `doc-tool-map`, `SKILL_NAMES` for the three workflow guides that the repo skill does not name yet, and `MAP_STALE`. Any other problem is fixed in the file, or handed to the owner of the file that disagrees.

- [ ] **Step 4: Hand off**

Report the counts and the check output. Do not run `node scripts/qa.cjs`.

---

### Task 4: Pointers

**Files:**

- Modify: `skill/SKILL.md`
- Modify: `.claude/skills/design-pipeline/SKILL.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:** `skill/SKILL.md` stays under 5,120 bytes and keeps its front matter; the repo skill keeps its XML tags and has no heading; `CONTRIBUTING.md` keeps its headings.

- [ ] **Step 1: The `SKILL.md` bullet**

In "Where the details are" add one bullet, `Which tool or guide at which stage: references/tool-map.md` (in backticks like its neighbours), before the `Every command: designer-pipeline --help` bullet. Expected: the file is under 5,120 bytes; report the byte count (4,108 before).

- [ ] **Step 2: The repo skill: three route bullets and one line**

In `<intake>` change the three route bullets so that they name the workflow guides that `next` sends the author to: `skill/references/workflow-film.md` for film, `skill/references/workflow-edit.md` for edit, and `skill/references/workflow-web.md` for web, with `skill/references/pipeline-reference.md` kept for `ui` (the exact three lines are in `tasks.md`, T4). In `<reference_guides>` add one line naming `skill/references/tool-map.md` and saying to edit `scripts/tool-list.json` and run `node scripts/tool-list.cjs --write` (exact line in `tasks.md`, T4). Expected: `tests/claude-code-surface.test.cjs` still passes (frontmatter, under 500 lines, no headings, the three tags); exactly four lines of the file changed (three edited, one added); run before this task, `prototypes/prove-checks.cjs` reports exactly three workflow-guide problems on the old route bullets (it models this task by replacing text, so it cannot be run afterwards); after this task, `node scripts/tool-list.cjs --check` (once Task 1 has landed) reports no `SKILL_NAMES` problem. The list file is a data file and not a guide path, so check (f) does not need an entry for it.

- [ ] **Step 3: The maintainer paragraph**

In "Validation" of `CONTRIBUTING.md` add one paragraph: when a command, an action, a standalone script or a guide that `skill/SKILL.md`, the repo skill or `next` names is added, renamed or removed, change its entry in `scripts/tool-list.json` and run `node scripts/tool-list.cjs --write`; `node scripts/qa.cjs` fails when the tool list, the help, the `next` texts, `skill/SKILL.md`, the repo skill or the map disagree.

- [ ] **Step 4: Hand off**

Report the byte count and the three diffs. Do not run `node scripts/qa.cjs`.

---

### Task 6: The Command Table Lists Its Actions

**Files:**

- Modify: `skill/scripts/cli-core.cjs` (nothing else)

**Interfaces:** `commandPaths()` and the dispatcher rule of "Fixed interfaces". Starts after step 1 is committed (T0), because step 1 edits the `film check` help line in the same file.

- [ ] **Step 1: List the actions in the 20 entries**

In the table `COMMANDS`, the 20 entries that run their own handler (`change`, `evidence`, `verify`, `patterns`, `design-system`, `component`, `component-first`, `component-first-v2`, `design-skill`, `high-fidelity`, `mengto`, `shadcnio`, `prism`, `holosticker`, `designmd`, `iart`, `toolchain`, `execution`, `adapter`, `adaptation`) each get an `actions` list in front of `run`, with the names of Table A1 in its order. Example:

```js
  change: { actions: ["init", "resume", "advance", "migrate", "repair"], run: ({ parsed, root, action }) => changeCommand(parsed, root, action) },
```

`verify` also gets `gates: ["state-coverage", "interaction-states", "artifact", "plan"]` (in the order of Table A1). `component-first` lists `check, stack, components, playground, page`. Run `node openspec/changes/add-capability-registry/prototypes/prove-table.cjs` to see the generated lists.

The ten commands that take no action get an empty list. The eight one-line entries at lines 1824 to 1831 of `cli-core.cjs` at `b631fcd` (`doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package`, `route`) change like this:

```js
  doctor: { actions: [], run: doctorCommand },
```

`next` (line 1966) and `decide` (line 1973) have a multi-line entry; one line is added between the opening line and `run:`:

```js
  next: {
    actions: [],
    run: ({ parsed, root }) => {
```

No other part of an entry changes.

- [ ] **Step 2: Refuse what the table does not list, and export the rows**

In `resolveCommand` (line 2050), this one line replaces `if (entry.run) return entry;`:

```js
  if (entry.run) return action && !(Array.isArray(entry.actions) && entry.actions.includes(action)) ? null : entry;
```

In `dispatch`, the three lines 2075 to 2077 (`if (action && ["doctor", "status", "route", "plan", "run", "resume", "explain-block", "package"].includes(command)) {`, the `fail` line, and the closing brace) are replaced by four lines that read the table. The `fail` line keeps its code and words:

```js
  const listed = Object.hasOwn(COMMANDS, command) ? COMMANDS[command].actions : undefined;
  if (action && Array.isArray(listed) && listed.length === 0) {
    fail("cli", `${command} does not accept an action`, { code: "UNKNOWN_ARGUMENT" });
  }
```

Also in `dispatch`, after the line `if (!entry) fail(...)`:

```js
  const gate = entry.gates && option(parsed, "--gate");
  if (gate && !entry.gates.includes(gate)) fail("cli", `unknown verify gate ${gate}`, { code: "UNKNOWN_GATE" });
```

A new function before `module.exports`, and `commandPaths` added to the exports:

```js
function commandPaths() {
  return Object.entries(COMMANDS).map(([command, entry]) => {
    const actions = entry.actions === undefined ? [] : Array.isArray(entry.actions) ? [...entry.actions] : Object.keys(entry.actions);
    return entry.gates ? { command, actions, gates: [...entry.gates] } : { command, actions };
  });
}
```

Expected: `node --check skill/scripts/cli-core.cjs` is clean and `git diff` shows only these hunks (about 45 lines: 20 handler entries and 8 one-line entries edited, 2 lines added to `next` and `decide`, 1 in `resolveCommand`, 4 that replace the 3 lines in `dispatch`, 2 for the gate, 7 for `commandPaths`, 1 for the export). No handler, help line or option list changes.

- [ ] **Step 3: Smoke**

Before Step 1, run `prototypes/prove-table.cjs` (expected `ALL CHECKS PASS`). After Step 2, run the same cases against the real file: copy `skill/scripts` at `HEAD` to a temp folder for the old side (with `references`, `adapters` and `evals` linked as the prototype does), and use the repository file as the new side. Expected: the 151 action cases give 146 equal answers and 5 that differ, all of them a made-up action (`OPTION_REQUIRED` or `COMMAND_FAILED` before, `UNKNOWN_COMMAND` or `UNKNOWN_GATE` now); no listed action and no no-action case differs. For `next` and `decide`: ten legitimate calls with every documented flag (`--project-root`, `--deliverable`, `--tier`, `--mode`, `--director`, `--replace`, `--stage`, `--choice`, `--verdict`, `--answer` with an answer of several words in one quoted argument) answer identically before and after (exit code and whole output), and the ten commands called with no word after them answer identically. A stray word: `doctor zzz`, `status zzz`, `plan zzz`, `run zzz`, `resume zzz`, `explain-block zzz`, `package zzz` and `route zzz` answer with exactly the same words as before, and `next zzz` (before: `ok`) and `decide zzz` (before: `INPUT_MISSING`) now answer `UNKNOWN_ARGUMENT`, exit 1, with `<command> does not accept an action`; so do `next --deliverable film --tier quick --replace zzz` and `decide --stage intake --answer looks good` (an unquoted answer of two words: `good` used to be dropped without a message). Then `node skill/scripts/designer-pipeline.cjs change nosuchaction --json` answers `unknown command: change nosuchaction` (code `UNKNOWN_COMMAND`, exit 1) and `verify --gate nosuchgate` answers `UNKNOWN_GATE`. When Tasks 1 and 2 have landed (the owner of Task 3 does this if Task 6 finishes first), `node scripts/tool-list.cjs --check` reports no `TABLE_ENTRY` and no `DEAD_ACTION`.

- [ ] **Step 4: Hand off**

Report the diff stat, the 151-case result, the ten-call parity result, the stray-word answers and the two answers above. Do not run `node scripts/qa.cjs`; Task 3 adds the permanent tests.

---

### Task 3: The Test and the Map

**Files:**

- Create: `tests/tool-list.test.cjs`
- Modify: `scripts/test-manifest.json` (add `tool-list.test.cjs`, keeping the file's own order)
- Create (generated): `skill/references/tool-map.md`
- Modify: `skill/references/package-resources.json` (add `references/tool-map.md` to `required`)

**Interfaces:** the checks (a) to (g) of `design.md` section 6. Test titles: "the bundled tool list is valid"; "the validator rejects each deliberate mistake with its code"; "the map is listed in required"; "commands: the help agrees with the tool list, and each break is reported"; "job registry commands are alive and shown"; "the command table lists every entry, and each break is reported"; "an action or gate that the table does not list, and a stray word after next or decide, is refused before the handler runs"; "next and decide with every documented flag are not refused"; "a deferred entry refuses to run"; "every stage list is contained in the standard replicate list, and every deliverable is read"; "a ui walk that cannot finish a stage stops with an error"; "next names only public commands, guides and stages of the tool list, and each break is reported"; "every public command is named by next or by its workflow guide, every public guide by SKILL.md, the repo skill or next, and each break is reported"; "skill/SKILL.md and the repo skill name only entries of the tool list and name the three workflow guides, and each break is reported"; "command examples resolve, and each break is reported"; "every script that starts with #! is accounted for"; "the stage map is current and has the content the rules ask for". Style: `node:test`, `assert/strict`, temp directories, as in `tests/workflow-next.test.cjs`. Helpers stay in the file.

- [ ] **Step 1: Write the checks**

Use `require("../scripts/tool-list.cjs")`, `require("../skill/scripts/cli-core.cjs")` (`execute`, `publicHelp`) and `require("../skill/scripts/workflow-core.cjs")` (`DELIVERABLES`, `initState`, `nextAction`, `decide`). For each check: once with `collectInputs(repoRoot, list)` (no problem expected), then with one field of `inputs` or one entry of a `structuredClone` of the tool list changed in the way the rule forbids (its code expected): an extra or a missing help line, a `deferred` entry that the help names, a job that names an alias; a `nextActions` text that names `designer-pipeline film verify`, one that names an `expert` command, one that names a guide with no entry, a `ui` action that names a command whose entry lacks the pair `ui:<stage>`; a stage pair that nothing names; an entry whose `guide` heading is not in `guideAnchors`; a `skillTexts` text that names a guide with no entry or `designer-pipeline high-fidelity check`, a repo skill without `references/workflow-web.md`, or a repo skill that names `skill/evals/web/README.md` with no entry; a public guide that no text names; an `exampleFiles` text with `designer-pipeline film edit auto`; a `scripts` list with an extra `#!` file; a changed `mapText`. The passing cases of the literal rule (`designer-pipeline adaptation`, `the designer-pipeline skill`, a text that ends after the command) are asserted as well. Each `deferred` command entry, run through `execute`, answers `COMMAND_DEFERRED`. `walkStages` with a stub `nextAction` that returns an unknown stage must throw an error that names the deliverable and the stage. Check (b), the command table: on the real inputs no `TABLE_ENTRY` and no `DEAD_ACTION`; on a `tablePaths` with a row that has no entry (`component frobnicate`), on an entry the table does not give, and on a `drive` answer of `UNKNOWN_COMMAND` for a listed action, the codes `TABLE_ENTRY`, `TABLE_ENTRY` and `DEAD_ACTION`. Two direct tests of the dispatcher: `change nosuchaction` with no other option answers `UNKNOWN_COMMAND` (not `OPTION_REQUIRED`), and `verify --gate nosuchgate` answers `UNKNOWN_GATE`. `commandPaths()` gives an empty `actions` list (never `null`) for the ten commands that take no action, and the actions of `component-first` are `check` and the `PUBLIC_STAGES` of `skill/scripts/component-first/orchestration/component-first-orchestrator.cjs`. Two direct tests for the stray word: `next zzz` and `decide zzz` (in a temp folder, with `--project-root`) answer `UNKNOWN_ARGUMENT` with exit code 1 and change nothing in the project folder, and the other eight action-less commands answer a stray word with `<command> does not accept an action`. A parity test for `next` and `decide`: the calls of `tests/workflow-next.test.cjs` (`next --deliverable film --tier quick`, `next`, `decide --stage deliver --answer x`) and one call with every documented flag give no `UNKNOWN_ARGUMENT`, and `readState` shows what the flags said; the old-against-new comparison is the Task 6 smoke, not a permanent test (the old code is not in the tree after Task 6), and the permanent test asserts behaviour and pins no wording. Task 3 waits for Task 6, because it needs `commandPaths()`.

- [ ] **Step 2: Write the rejection table and the content test**

Check (a): about 23 mutated copies of the real tool list, one mistake each, listed in `design.md` section 6, each expecting its structure code. A separate test asserts that `required` holds `references/tool-map.md`. Check (g): `renderMap` equals the file after turning `\r\n` into `\n`, and a second test asserts the content rules of the map: no `internal` entry, `verify audio` under `film check` and not in the on-demand list of `film`, every alias in the last section, `references/film-edit.md` in the on-demand list of `edit`, `next` under "Every deliverable". Check (c) also asserts that every stage list is contained in the standard replicate list in order and that `freeform` gives the lists of `brief`.

- [ ] **Step 3: Add the test to the manifest and generate the map**

Add `tool-list.test.cjs` to `scripts/test-manifest.json`. Run `node scripts/tool-list.cjs --write`, then `--check`. Expected: `--check` exits 0. Then add `references/tool-map.md` to `required` in `skill/references/package-resources.json`, near `references/job-registry.json` (after the map exists, because QA checks that each required file exists). Do not add the list file: it lies outside `skill/`, the paths in `required` are relative to `skill/`, and it must not ship. Read the map top to bottom once and put five observations in the hand-off.

- [ ] **Step 4: Run the file by name**

Run `node --test tests/tool-list.test.cjs`. Expected: every test passes. A failure that comes from another worker's file (the script, the list data, the pointers, the command table) is reported back to that owner; do not edit it. Do not run `node scripts/qa.cjs`.

---

### Task 5: Changelog, QA and Smoke (integrator)

**Files:**

- Modify: `CHANGELOG.md`
- Create: `openspec/changes/add-capability-registry/qa.md`
- Modify: `openspec/changes/add-capability-registry/tasks.md` (tick boxes only)
- Delete: `openspec/changes/add-capability-registry/prototypes/` (after Task 3 has run)

**Interfaces:**

- `CHANGELOG.md` under `[Unreleased]`: an Added entry (the tool list, the generated map, the repository script, the consistency test) and a Changed entry (one bullet in `skill/SKILL.md`; the three route bullets and one line of the repo skill; the command table now lists every command and action, so an unlisted action, an unlisted `verify --gate`, or a stray extra word after `next` or `decide` is refused earlier with the same style of error; valid calls behave the same), each naming the change id.
- `qa.md` follows `openspec/changes/add-web-treatment-and-section-briefs/qa.md`: Conformance (verified, with exit codes observed), open questions and answers, what only a person can judge, Not verified. No Visual Acceptance section.

- [ ] **Step 1: Record the change**

Edit `CHANGELOG.md`, and delete `openspec/changes/add-capability-registry/prototypes/`. Run `openspec validate add-capability-registry --strict`. Expected: valid.

- [ ] **Step 2: Run the check and the QA gate on a quiet tree**

Run `node scripts/tool-list.cjs --check` (expected exit 0), then `node scripts/qa.cjs` directly. Expected: exit 0. On failure return the failing file to its owner, wait for the fix, run again.

- [ ] **Step 3: Smoke on throwaway copies outside the repository, with these proofs**

(a) Rename `film check` in a copy of the tool list and show that `runChecks` reports it (`ID_MISMATCH`, `HELP_ENTRY`, `NEXT_NAMES`). (b) `git diff --stat -- skill/scripts skill/adapters` lists only `skill/scripts/cli-core.cjs`, about 45 lines: this change edits no other shipped code. (c) `git diff --stat -- skill/references/job-registry.json skill/references/pipeline-phases.json skill/references/component-capabilities.json` is empty. (d) `git status --short` is identical before and after `node scripts/tool-list.cjs --check`. (e) Read `skill/references/tool-map.md` end to end. (f) Build the package into a temp folder outside the repository (`node scripts/package.cjs --output-root <temp>`) and list the archive: it holds `references/tool-map.md` and no file named `tool-list.json`.

- [ ] **Step 4: Write `qa.md` and tick the tasks**

Record the exit codes and the smoke output observed, the counts of `noGuide` entries and of each map group, the list of what only a person can judge, and the watch list. Tick the boxes of `tasks.md` that are done.
Expected: `openspec validate add-capability-registry --strict` still valid after the last edit.

---

## Acceptance

- `openspec validate add-capability-registry --strict` reports valid.
- `node scripts/tool-list.cjs --check` exits 0, and `node scripts/qa.cjs`, run directly, exits 0 with `git status` unchanged by the run.
- The tool list has 168 entries with the counts of the fixed interfaces, is not in the package (the archive holds `references/tool-map.md` and no `tool-list.json`), every `public` command is named by `next` or its workflow guide, every `public` guide by `skill/SKILL.md`, the repo skill or `next`, every script that starts with `#!` is accounted for, and the map has no `internal` entry.
- `--help`, every `next` text and every command result are unchanged, except the answer to an action or gate that the table does not list and to a stray word after `next` or `decide`; `git diff --stat -- skill/scripts skill/adapters` lists only `skill/scripts/cli-core.cjs` (about 45 lines), so no other shipped code changed; `commandPaths()` gives the 142 rows of the tool list, and 84 rows driven answer none of `UNKNOWN_COMMAND`, `UNKNOWN_GATE`.
- `git status` shows changes only in the files owned by Tasks 1 to 6, this plan, the spec document, and the change folder.

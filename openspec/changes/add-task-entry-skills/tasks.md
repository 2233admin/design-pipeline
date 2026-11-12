# Tasks

Order: T0 first (a stop check that only reads). Then wave 1 (T1, T2, T3 in parallel). Then wave 2 (T4,
which needs the files of T2). Then wave 3 (T5, which waits for the registry). Then T6, the closure. Then
T7, which a person does. Each worker edits only the files it owns. At any one time no file has two owners
(T5 deletes a file that T4 made; T5 starts only after T4 is done). The executable plan with steps and
acceptance is `docs/superpowers/plans/2026-09-30-task-entry-skills.md`. Interfaces are fixed in
`design.md`: the entry names and paths, the descriptions (sections 5.1 to 5.6), the installer rules
(section 7.3), the checks (section 9.4), the list of things that are read and not tested (section 9.5) and
the slices (section 11).

**Nothing about real triggering is verified.** No host and no model was asked which entry loads for any
sentence. No task below except T7 can check that, and T7 is a person's run that has not happened.

**The names are drafts (D17, Q3).** The five entry names (`dp-create`, `dp-reference`, `dp-preview`,
`dp-review`, `dp-resume`) are confirmed only after a person has run the host table (T7). The first draft
used `dp-make`, `dp-study` and `dp-try`. If a name changes, the cost is
small: five folders, five `required` lines, one constant list in `tests/entry-skills.test.cjs`, the index
table, the router text, a few words in README and CONTRIBUTING, and the NOT sentences of the descriptions.
`dp-reference` and `dp-preview` are kept on trial until T7.

## Words used in this file

- **Wave**: a group of tasks that can run at the same time.
- **Slice**: one task (T0 to T7) with its own files.
- **Closure**: the last code task, T6. It adds the shared list lines, runs the one test command, and writes
  `qa.md`.
- **Integrator**: the one worker who does the closure.
- **Stop check**: T0. It reads the tree and the host, and it can tell everyone to stop.
- **The gate**: here, `node scripts/qa.cjs`. It is the only test command this repository allows.
- **Entry**: one of the five thin skills `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`.
- **Index**: `skill/SKILL.md`, named `design-pipeline`.
- **Install marker**: the file `.installed-by-design-pipeline.json` that the installer writes into every
  folder it installs, so that a later run can tell its own folders from a user's.

The other words are those of `design.md` section 0.

## Verification protocol

The only sanctioned harness is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode. It compares
`scripts/test-manifest.json` with `tests/*.test.cjs`, packages `skill/` twice, and fails unless
`git status` is byte-identical to its start. Workers therefore do not run it. T6 runs it once on a quiet
tree after the code slices land, hands failures back to the owner, and reruns.

Workers do not run `openspec validate` either. T6 runs `openspec validate add-task-entry-skills --strict`.
That command checks the format of the spec, not behaviour. Behaviour is proved only by
`node scripts/qa.cjs` and by the person's host run (T7).

A worker may check its own change with a throwaway script outside the repository (for example: count the
characters of a description, parse frontmatter, run the installer against a temporary skills root). That
is smoke evidence, not the gate. A worker keeps no such script in the repository.

There are two new test files, `tests/entry-skills.test.cjs` and `tests/entry-names.test.cjs`, so
`scripts/test-manifest.json` gets one line for each file that exists at closure (owner T6). The five
load-bearing files go in `required` of `skill/references/package-resources.json` (owner T6):
`.entries/dp-create/SKILL.md`, `.entries/dp-reference/SKILL.md`, `.entries/dp-preview/SKILL.md`,
`.entries/dp-review/SKILL.md`, `.entries/dp-resume/SKILL.md`. `scripts/package.cjs` is not edited, and
`tests/helpers/skill-surface.cjs` is not edited (D10).

## Done in this slice

- [x] Read the host docs and the probes of `design.md` Appendix A (results are in F1 to F4).
- [x] Read the five sibling drafts (`fix-tool-guidance-errors`, `add-capability-registry`,
  `add-web-capability-skills`, `align-workflow-lifecycle`, `add-web-composition-checks`) and the repository.
- [x] Write the proposal, design, tasks, spec delta, superpowers spec and implementation plan.
- [ ] `openspec validate add-task-entry-skills --strict` passes (T6 runs it last).

## Shared files and who edits them before this change

Copied from `design.md` section 1. T0 re-reads them and reports which of these edits are already there.

| Shared file | Edited before this change by | What this change does to it |
| --- | --- | --- |
| `skill/SKILL.md` | `fix-tool-guidance-errors` (tier row, decision line), `add-capability-registry` (one bullet), `add-web-capability-skills` (description, web bullet), `align-workflow-lifecycle` S10 (tier row, decision line) | moves the loop, the first-call tables and "Talking to the user" to `dp-create`, replaces the description, adds the task table and the fallback sentence; keeps "Where the details are" and "Always" |
| `.claude/skills/design-pipeline/SKILL.md` (the repo router) | `add-capability-registry` (four lines), `add-web-capability-skills` Phase B (one bullet) | three small edits (7.6) |
| `tests/claude-code-surface.test.cjs` | `add-web-capability-skills` T3 (one test, four checks) | changes one check from "exactly `skill/SKILL.md`" to a folder rule with no names (outside `upstream` folders every other `SKILL.md` sits at `skill/.entries/<folder>/SKILL.md`) |
| the spec of `add-web-capability-skills` (`specs/web-workflow`) | its own change | its rule "`skill/SKILL.md` alone" and this change's allow-list disagree once both are archived; T6 reconciles them |
| `skill/references/package-resources.json` | every change that adds a load-bearing file | five lines in `required` |
| `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, `skill/references/tool-map.md` | `add-capability-registry` (creates them) | slice T5 only, after they exist |
| `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md` | several | one entry, one section, one paragraph |

## Who owns what

| Slice | Owns |
| --- | --- |
| T0 | nothing (reads only) |
| T1 | `scripts/install-local.cjs`, `tests/install-local.test.cjs`, `tests/helpers/fail-nth-rename.cjs` |
| T2 | `skill/.entries/dp-create/SKILL.md`, `skill/.entries/dp-reference/SKILL.md`, `skill/.entries/dp-preview/SKILL.md`, `skill/.entries/dp-review/SKILL.md`, `skill/.entries/dp-resume/SKILL.md`, `skill/SKILL.md` |
| T3 | `README.md`, `CONTRIBUTING.md`, `.claude/skills/design-pipeline/SKILL.md` |
| T4 | `tests/entry-skills.test.cjs`, `tests/entry-names.test.cjs`, the one folder-rule check in `tests/claude-code-surface.test.cjs` (only when it exists) |
| T5 (waits for the registry) | `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, `skill/references/tool-map.md` (generated); deletes `tests/entry-names.test.cjs` |
| T6 | `skill/references/package-resources.json`, `scripts/test-manifest.json`, `CHANGELOG.md`, `openspec/changes/add-task-entry-skills/qa.md`, the boxes of this file; and `openspec/changes/add-task-entry-skills/specs/entry-skills/spec.md` only to write requirement 2 as a `MODIFIED` block when `add-web-capability-skills` is archived by then |
| T7 | nothing in the repository (a person; hands a table to T6) |

## T0 Stop check (size S)

Owns nothing. It reads, probes outside the repository, and reports. Nothing is written in the repository.
It is not the "gate" of `qa.cjs`; it is a first task that can stop the work.

- [ ] Find out which sibling changes are committed. Run `git log --oneline` and look for the change ids
  `fix-tool-guidance-errors`, `add-capability-registry`, `add-web-capability-skills` and
  `align-workflow-lifecycle`. Check whether these exist: `scripts/tool-list.json`, `scripts/tool-list.cjs`,
  `tests/tool-list.test.cjs`, `skill/references/tool-map.md`, `skill/references/web-treatment.md`. Report,
  for each change: committed, partly committed (say which part), or not. For `add-web-capability-skills`
  say whether Phase A (its comparison of two packaged commits) has run. For `align-workflow-lifecycle` say
  whether its closing slice S10 (tier row, decision line of `skill/SKILL.md`) is in, and whether its slice
  S2 has added a `workflow-ui.md` guide for `ui`.
- [ ] Re-read the shared files: `skill/SKILL.md`, `.claude/skills/design-pipeline/SKILL.md`,
  `tests/claude-code-surface.test.cjs`, `skill/references/package-resources.json`,
  `scripts/install-local.cjs`. Compare each with the "Edited before this change by" column above. For each
  file say which listed edits are present. Record the line count and byte count of `skill/SKILL.md` (the
  design measured 77 lines and 4,293 bytes in the working tree). Say whether
  `tests/claude-code-surface.test.cjs` already holds the check "exactly `skill/SKILL.md`"
  (`add-web-capability-skills` T3): T4 needs this answer.
- [ ] Repeat the Codex probes of F3 (a to d) and F4 with the Codex that is installed, in a temporary directory and a
  temporary `CODEX_HOME` outside the repository, with no model call (`design.md` Appendix A): start
  `codex app-server`, send `initialize`, `initialized`, then `skills/list` with `{ "cwds": ["<dir>"],
  "forceReload": true }`, and read `data[0].skills` and `data[0].errors`. The probes:
  1. a nested `SKILL.md` below the skills root is listed;
  2. two skills with one name, one nested and one beside the main skill, are both listed (not merged);
  3. a folder whose name starts with a dot (`.entries`) is not searched, while `_entries` and `entries` are;
  4. frontmatter: a description with a colon and a space is listed whole; one that ends with a colon is
     dropped with an error; a space then `#` cuts the description at the hash; 1,024 and 1,025 characters
     are listed whole; and `codex debug prompt-input "hello"` shows only the start of each description.
  Record the Codex version. If the F4 probe now agrees with F13 of `add-web-capability-skills` (a colon and
  a space drops the skill, or more than 1,024 characters is rejected), report it; the rules of 9.4 are
  already strict and stay. If Codex is not installed, say so; that is not a stop, and `qa.md` lists it as
  not verified.
- [ ] Run `node skill/scripts/designer-pipeline.cjs --help` (a read-only call). Save the output to a
  file outside the repository (for example in the system temporary folder) and copy its path and its text
  into the report. T4 uses it for the command-name check; T6 compares it with the help at closure.
- [ ] **Stop and report, and start no later task**, if any of these is true:
  - probe 3 lists `.entries` (the hidden folder is now searched; the packaging choice D3 must be looked at
    again);
  - a shared file differs from the table above in a way that changes where a text moves (for example
    `skill/SKILL.md` has lines the design does not mention);
  - `fix-tool-guidance-errors` or `add-web-capability-skills` (Phase A) is not committed. The design says
    this change lands after them (section 1, D15). The user may waive the order; a worker does not decide
    that.
  `add-capability-registry` not landed is not a stop: T5 waits (Q9), and check 7 stays in
  `tests/entry-names.test.cjs`.
- Proves: what the tree and the Codex on this machine looked like on the day the work started. Does not
  prove anything about omp or Claude Code, or about any other Codex version.

## Wave 1

### T1 Installer fan-out, install marker and their tests (size M)

Owns `scripts/install-local.cjs`, `tests/install-local.test.cjs` and the new
`tests/helpers/fail-nth-rename.cjs`. T1 can slip without breaking anything: with T2 alone the entries exist
and the fallback sentence of the index reaches them. T1's one assertion about the real `skill/` needs T2's
files; T6 is the first run that has both.

- [ ] Read `scripts/install-local.cjs` and `tests/install-local.test.cjs` first. Note how the existing test
  builds its source and follow that way.
- [ ] Add `const ENTRIES = ".entries";`. **Before it copies anything**, list `<source>/.entries/*/`. A source
  with no `.entries` folder installs the main skill only and returns `entries: []`.
- [ ] Check each entry folder, and refuse before anything changes: a name that is not lower-case letters and
  digits joined by `-`, or is longer than 64 characters; no `SKILL.md`; a `SKILL.md` whose `name` differs
  from its folder name; two skills that would install to one folder (an entry named `design-pipeline`
  counts).
- [ ] Install each entry to `<root>/<name>`, the same `--root` as the main skill. If `--target` is not
  `<root>/design-pipeline`, the main skill goes where `--target` says, as today, and the entries still go
  to `<root>/<name>`. Each target must stay below `--root`, must not be a link, and must not lie inside
  the source. Use the existing `inside`, `assertNoLinkPath` and link checks.
- [ ] **The install marker (D16, Q6).** Write the file `.installed-by-design-pipeline.json` into every folder the
  installer installs (the main folder and each entry). Its content is one line of JSON plus a newline:
  `{"package":"design-pipeline","skill":"<folder name>","version":"<text>"}`. Write it into the STAGED copy
  after `doctor` passes and before the swap, so that it adds no rename. Never write it into the source
  tree: the entry folders in `skill/.entries/` keep holding only `SKILL.md` (check 1). `version` is the text
  of `PACKAGE.json` in the source when that file is there (the packaged archive has one), else the text of
  the `VERSION` file one level above `scripts/`, else `unknown`. Report which of the three you used. It is
  for people to read; nothing compares it.
- [ ] **Existing folders.** At an ENTRY target, an existing path is replaced (with `--replace`) only if it is
  a real folder (not a link, not a file) whose marker parses as JSON and names this package and this very
  skill. Anything else stops the installer BEFORE it copies or changes anything: exit 1, and an error that
  names the folder, says design-pipeline did not install it (no install marker), says that `--replace` does
  not change that, and says to move or rename it or pick another `--root`; nothing was changed. This check
  runs before the "target exists; pass --replace" message, so nobody is told to add `--replace` and then
  refused. The refusal is all or nothing: the main folder and the other entries stay as they were. The MAIN
  folder keeps today's rule: an existing folder needs `--replace`, and is then replaced whether or not it
  has a marker (every earlier release left none); it gets a marker after this install. An upgrade from an
  install that has no entries (main exists, entries absent), with `--replace`, replaces the main folder and
  installs the entries as new folders. No new flag; no `--no-entries`; no removal of an entry folder that
  a later release drops or renames.
- [ ] Stage every copy first. Run `doctor` on the staged main copy exactly as today. Then write the markers,
  then swap: rename each existing target to a backup, put the copy in place, and on any failure put every
  earlier change back (earlier targets from their backups; newly installed ones removed). Best effort,
  not one atomic step. Rename counts do not change: a fresh install makes 6, a replacement 12, an upgrade
  from an install without entries 7 (read them from the code as written). Clean `.tmp-`, `.backup-` and
  lock names in `finally`; none may be left behind. If a failure leaves old folders in place, the error
  message says which.
- [ ] The main copy keeps `.entries`, so `doctor` and `required` stay true in an installed tree.
- [ ] The result JSON keeps schema id `design-pipeline.install-result.v1`, keeps the fields it has, and adds
  `entries`: the array of names installed (empty when none). The `--help` line does not change (no option
  changes).
- [ ] Write `tests/helpers/fail-nth-rename.cjs`: when env `FAIL_AT_RENAME=N` is set, it patches
  `fs.renameSync` to throw on the Nth call. The test starts the installer with
  `node --require tests/helpers/fail-nth-rename.cjs` and sets `FAIL_AT_RENAME`.
- [ ] New cases in `tests/install-local.test.cjs`. Use a small skeleton package with a stand-in `doctor` (a
  copy of the 175 MB `skill/` for each case would make the run slow). The cases:
  1. entries land beside the main skill and the result lists them;
  2. a marker is written in all six folders with the right keys (`package`, `skill`, `version`), and the
     source tree stays clean (no marker in it);
  3. a second run without `--replace` is refused and changes nothing;
  4. `--replace` updates all six folders, and the markers are refreshed;
  5. an upgrade from an install without entries, with `--replace`, installs the entries and replaces main;
  6. an old main folder without a marker is replaced with `--replace` and then carries a marker;
  7. a user's own entry folder (an entry's name, no marker) is refused with `--replace` and without it:
     exit 1, the error names the folder, it stays byte for byte as it was, and nothing else was created
     (the main folder and the other entries were not touched);
  8. a marker that names the wrong package, the wrong skill, or is not JSON is not trusted: refused as in 7;
  9. a file or a link named like an entry is refused as in 7;
  10. a bad entry in the source (bad name, no `SKILL.md`, name differs from folder) is refused before any
      change, and no folder was created;
  11. a source with no `.entries` installs the main skill only, and the result has `entries: []`;
  12. a custom `--target`: the main skill goes there and the entries go to `<root>/<name>`;
  13. a failure injected at the Nth rename leaves every folder and marker as it was before, for every N up to
      the number of renames the run makes (6 fresh, 12 replacement, and N = 1 to 7 for the upgrade of case
      5), and a rename beyond that number never happens;
  14. after every run, success or failure, no name containing `.tmp-`, `.backup-` or `.install.lock` is left
      in the root.
  The existing case that installs the real `skill/` from a packaged copy also asserts that the five entry
  folders land beside the main skill.
- Proves: the installer behaviour of design 7.3 at the gate, on a small source, and the real `skill/` copy
  once. Does not prove a run on macOS or Linux (not verified). The design's own run of the marker logic
  used a stand-in `doctor` and a skeleton, not the real 175 MB `skill/`.

### T2 Entry text and the index (size L)

Owns the five `skill/.entries/<name>/SKILL.md` files (one folder each, no other file in a folder) and
`skill/SKILL.md`.

- [ ] Read `skill/SKILL.md` as it is now (T0's report says which sibling edits it already holds),
  `skill/references/plain-language.md`, and the guides that the hand-over tables name. Every command and
  path you write must exist; check each `references/...` path with a file listing, and each command with
  the CLI help T0 saved.
- [ ] Each entry file: frontmatter with exactly `name` and `description`, each on one line; `name` equals the
  folder name. **Start from the description texts of `design.md` sections 5.1 to 5.5.** They are the first
  draft. Once T2 lands, the entry files are the source of the description text; a change of wording after
  the host run is made in the entry file, and design, plan and summary are not re-edited (T6 records the
  final texts in `qa.md`). The drafts have 618 characters (`dp-create`), 474 (`dp-reference`), 476
  (`dp-preview`), 460 (`dp-review`) and 420 (`dp-resume`); the index has 300. Together that is 2,748, against
  405 for today's single description: 2,343 more. Count them with a throwaway script. Each draft has one
  sentence "Use this whenever the user wants ..., even if they never say design-pipeline." (no colon, no
  backtick; about 100 characters each; Q14: keep it, and shorten it after the host run if a host drops the
  descriptions), quoted phrases in English and Chinese, and one "NOT for" sentence. The phrases of `dp-resume`
  are tied to a film, edit, web or UI job; the generic phrases ("continue the project", "where were we",
  "what is the next step") are not put back, because they fire in any coding session. So a bare "what is the
  next step?" does not select `dp-resume` by design; the user can type `/dp-resume`, or name the film, edit
  or page.
- [ ] Then the body in this order: the locator sentence; "Ask once"; "Hand over" (a table); "Before you say
  done"; "Do not". The locator sentence is the same in every entry: "Find the `design-pipeline` folder
  first. The folder your host printed for this skill ("Base directory for this skill" or "Skill
  directory") is this skill's own, and `design-pipeline` sits next to it. If you came through the index,
  the folder the host printed is `design-pipeline` itself. It holds `scripts/designer-pipeline.cjs` and
  `references/`; every path below is inside it, and `designer-pipeline` means
  `node scripts/designer-pipeline.cjs` run from there." Every command is written with its
  `designer-pipeline` prefix so that check 7 can find it; the tables in the design leave the prefix out only
  to stay narrow. Size: an entry file is about 40 to 50 lines (`dp-create` about 80, because the loop moves
  into it) and has at most 6,144 bytes and fewer than 500 lines; the index has at
  most 5,120 bytes. The design measured scratch drafts (not final): `dp-create` 5,984 bytes and 78 lines
  (only about 160 bytes of room), `dp-review` 4,416 and 48, `dp-reference` 4,308 and 43, `dp-preview` 4,110
  and 42, `dp-resume` 3,446 and 42, the index 2,835 and 47. Measure the real files.
- [ ] "Ask once" in every entry (5.0): the medium is asked at most once, and never when project state holds
  it. If `.design-pipeline/state.json` exists, take `deliverable` from it, ask nothing, and call `next`
  **without** `--deliverable` (with a state file, `--deliverable` fails with `OUTPUT_EXISTS`, F11). If it
  does not exist and the user's words do not name the medium, ask one question: "Is this film (also 3D
  shots and a score), an edit, a web page or a UI?" `dp-create` and `dp-preview` pass the answer to
  `next --deliverable`. `dp-reference` and `dp-review` use it to choose a row and create no project state,
  so a user who runs `dp-reference` and then `dp-create` is asked again; do not try to hide that.
  `dp-resume` asks only when both kinds of state exist or the folder is not clear.
- [ ] "Do not" in every entry, each bullet with a short reason (because-clause):
  1. Call `decide` unless `next` asked the question, or offered the command in a `then` line (`next` does
     that for the skip of the `reference` step, which only the user may choose). A recorded
     decision is what moves the job on, and an early one skips the person's own choice.
  2. Record Visual Acceptance. Only a person can accept a piece, and a passing check is not acceptance.
  3. Run `route` to pick a command. It is a second way to decide what happens next, and two ways disagree.
  4. Write a file the named guide does not name. Evidence kept elsewhere is not found later.
  5. Say a check passed when it did not run. The reader relies on that word.
  `dp-preview` adds: call `deliver` (a sample that is marked delivered cannot be told apart from the
  finished piece). `dp-resume` adds: run `resume` on your own initiative (it writes an event and the state,
  so it changes a job the user only asked about). Write the route ban as plain prose like bullet 3. Check 8
  reads the shape of a command (an option after it, or a line in a code fence), not the words, so the prose
  sentence passes. Do not write a fenced `designer-pipeline route` line anywhere.
- [ ] The entries point at guide sections; they do not restate the guide's lists (9.5 item 4).
- [ ] `dp-create` (5.1). Merge the old deliverable table into the medium table: columns Medium, For, First
  call, Guide, Note (keep the "For" words of the old table). Move word for word from the index as it is
  now: the `## Loop`, the tier table, the mode line and `## Talking to the user`. Put these moved sections
  after "Hand over" and before "Before you say done". The moved text measures 2,283 bytes. The room is
  tight (see the sizes above). If `dp-create` passes 6,144 bytes, shorten its NEW text, keep the moved text
  whole, and report the numbers. Include whatever sibling edits the moved text already holds (tier row,
  decision line); do not reword it. Its "Before you say done": `next` returned `done` or the user stopped
  it; quote `evidence.delivered`, `evidence.gates`, `evidence.drafts`; at the quick tier, film, edit and web
  have no delivered file, so name the draft render (or page) and the gate results instead; say a gate
  passed only if its record says `passed`; report gate results and the user's accept or reject apart;
  never call the agent's own liking acceptance; name a delivered file or address and check it exists.
- [ ] `dp-reference` (5.2). Rows are keyed by the KIND of reference: a web page or screenshot; footage and
  music (an edit); a video for a film; a UI or any design reference. Use the four rows of the design table
  with their guide sections and measuring commands. Say in the row for a film video that no command lets
  an agent watch or measure a video, and what to do then. Say in the edit row that `film-edit analyze`
  writes `edit/analysis.json` into the folder it is given (use a sample folder if the project should stay
  clean). Its "Before you say done": `reference.md` has the sections that `references/reference-spec.md`
  lists under Required Sections (seven items: source inventory and provenance; observable evidence
  including the per-region table; spatial evidence for and against 3D; selected route and confidence;
  fidelity invariants; uncertain or missing evidence; resulting artifact requirements; read the list in the
  file and follow it, do not copy it). Each item also says how it was learned (a command, a viewing, or the
  user's words). Two honesty lines only: say what could not be observed; say what `next` will and will not
  see (the `reference` stage exists for film and web at standard and full and for edit in replicate mode;
  elsewhere `next` records nothing). The old five-item list (where each source came from; observed;
  transfer; do not copy; licence) is not used.
- [ ] `dp-preview` (5.3). Ask once whether it is "directions" or "sample". A sample goes in a folder of its
  own (for example `samples/<name>/`), because `next --tier quick` fixes the tier of the state it creates
  and a later `next --deliverable` in the same folder fails without `--replace`; to continue a sample as the
  real job, keep working in its folder. For directions at film and web: ask the intake in one round with
  the recommendations (the user may say "default"), then `next` at standard until `concepts` is picked. It
  does NOT script `decide --stage reference --answer none`: at the `reference` step it says to follow the
  guide's section `reference`, and the user decides whether to skip it (the shared Do-not already allows a
  command that `next` offers in a `then` line). Edit: `style`. `ui` directions: `direction-preview.md` and
  `playground.md`. The `ui` sample does NOT use `next`: do the work as `pipeline-reference.md` says at the
  quick tier and stop, because a `ui` job cannot finish in `next` without `deliver`, which a sample never
  calls (F16). Its "Before you say done": each result is labelled a sample, `deliver` was not called;
  directions differ on the guide's own terms; the pick is recorded with `decide --stage concept` in a
  project or quoted otherwise; exit codes of `direction check` or `playground check`, and the sentence that
  `next` cannot see those files; for a sample, the checks that ran and their exit codes. If anything you
  read in the workflow guides conflicts with this, report it and do not guess.
- [ ] `dp-review` (5.4). Rows: film (also 3D and score), edit, web, ui, any sound. Each hand-over row points
  at the guide's own `check` or `probe` section and does not restate its list: film
  `references/workflow-film.md` section `check`; edit `references/workflow-edit.md` section `check`; web
  `references/workflow-web.md` section `probe`, and for the first screen `references/composition-gate.md`;
  ui `references/qa-checklist.md` (Browser / Visual Checks) and `references/composition-gate.md`; any sound
  `references/audio-gate.md`. Film's `check` section lists seven gates (storyboard, score grid, timeline,
  render, audio, composition, carry; some run only when their input exists) and ends with an OPTIONAL text
  step (`composition capture`, then `verify composition`, with five extra text checks). The entry keeps the
  notes that design 5.4 keeps (for example: a bare video file needs PNG frames that no command of this
  package extracts, so the agent uses its own tool and says so; on a page taller than the window the
  picture check reports text below the fold as off screen, so use that pair for the first screen only).
  Do NOT copy the reader's note about `add-web-composition-checks` into the entry. Add the person's part
  (`references/qa-checklist.md`, R1 to R7, W1 to W7). The entry keeps only the report shape: "Checked by
  tools" (command, exit code, each finding with its `fix`) and "Needs a person's eye", plus the honesty
  lines (list what did not run; do not call it passed). The exit-code legend is: 0 passed; 2 a check failed
  or is blocked; 1 the command could not run (source: `docs/cli-and-reference-providers.md` lines 16 to 21
  and `skill/references/qa-checklist.md` line 30). No fourth code: the other code belongs to fidelity
  commands that `dp-review` does not run. It says a check inside a project with state records its result
  there (F13); it records no Visual Acceptance; its description says "If asked to check and fix, start
  here", and after the report it hands the fixes to `next` when a project exists. It creates no project
  state.
- [ ] `dp-resume` (5.5). Rows are situations, not media: a folder with `.design-pipeline/state.json`
  (`next --project-root <dir>`, reads only); a change folder with `state.json` (`status`, then
  `explain-block`; `resume` only after the user says continue, and only if the folder holds `plan.json`);
  both (`next` first, then `status` on the change); neither (say so, offer `dp-create`, start nothing). Its
  "Before you say done" says which kind of state it found; for a project it quotes `line`, `completed`,
  `remaining` and, when present, `rules`, with the state file unchanged; for a change folder it quotes
  `status` and `explain-block`, and says `resume` writes an event and the state; "continue" means running
  the `dp-create` loop from the stage `next` names; `status` and `resume` do not work on a `next` project
  (F12), and the entry says so.
- [ ] The index `skill/SKILL.md`, per `design.md` section 8: keep the name `design-pipeline`; the description
  is the draft of section 5.6 (300 characters, unchanged text); one line saying the CLI is
  `node scripts/designer-pipeline.cjs` in this folder; a table of the five entries (task, skill, what it
  hands over to); the fallback sentence exactly: "If your host does not list the dp- skills, open
  `.entries/<name>/SKILL.md` in this folder and follow it."; keep `## Where the details are` unchanged;
  keep `## Always` and add one line for the first bullet of "Talking to the user" (ask everything missing
  in one round, numbered, with recommendations; "default" accepts all); keep the one bullet that
  `add-capability-registry` adds if it is there. At most 5,120 bytes (the design measured a scratch draft
  of 2,835 bytes and 47 lines; measure the real file). `references/product-film-direction.md` stays
  written in `skill/SKILL.md` itself (`tests/hyperframes-routing.test.cjs` reads it there), and every guide
  name the eight front-door tests read stays in the index. The index description is the BROADEST of the
  six (it covers "film, edit, web or UI design work"); only "and no dp- skill is listed" narrows it, and
  the model must check that itself. Do not describe it as the narrowest.
- [ ] Words: plain and short, following `skill/references/plain-language.md`. A description never names
  another skill (only the entries of this package). Straight ASCII quotes in prose; the Chinese sample
  sentences stay exactly as in `design.md`. Keep the task words in the first 45 characters of each
  description (9.5 item 6): the drafts already do.
- Proves: nothing by test at this stage. Later, the gate checks structure (T4) and packaging (T6), and T6
  reads each entry against the six points of 9.5. Does not prove that a host loads the right entry (T7).

### T3 Documents (size S)

Owns `README.md`, `CONTRIBUTING.md` and `.claude/skills/design-pipeline/SKILL.md`.

- [ ] `README.md`: one new install section for the entries, in Chinese and in plain words like the rest of the
  file, for Codex, omp and Claude Code, each with its skills folder (design 7.4): Codex `~/.codex/skills`
  (it also reads `~/.agents/skills`); omp `~/.agents/skills`; Claude Code `~/.claude/skills`. Say:
  - with a copy install, run `node scripts/install-local.cjs --root <that skills folder>` (add `--replace`
    to update); the installer puts each entry in its own folder next to `design-pipeline`;
  - a folder of yours with an entry's name is never replaced: the installer stops and names it; rename
    yours and run again (`--replace` does not change that);
  - install into one folder per host, because Codex reads both of its folders and lists a skill twice if it
    sits in both;
  - a linked install cannot use the installer (it refuses a link as target and an existing folder without
    `--replace`, and has no entries-only mode): copy or link each `.entries/<name>` to `<root>/<name>` by
    hand;
  - if you copied `skill/` by hand and did nothing more, only the index is listed, and its fallback
    sentence reaches the entries;
  - the installer does not remove an entry that a later release drops or renames, so an old folder can stay
    behind;
  - the entry names are drafts until the host run (T7).
  Keep the existing Codex text working. Name no other skill.
- [ ] `CONTRIBUTING.md` (English): one paragraph on the entries: where they live
  (`skill/.entries/<name>/SKILL.md`, one file per folder, a dot folder on purpose), that the installer
  replaces an entry folder only when it carries the install marker `.installed-by-design-pipeline.json`
  that it wrote itself, the description rules (D8: a first sentence of at most 80 characters that names the
  task in its first 45, quoted trigger phrases in English and Chinese, one "Use this whenever ..." sentence,
  one "NOT for" sentence, none of the forbidden characters), that an entry holds no rules and only hands
  over, and that a new entry needs an OpenSpec change (the cap is six entries).
- [ ] `.claude/skills/design-pipeline/SKILL.md` (the repo router): three small edits (7.6). (1) The
  `<objective>` sentence that says the front door "drives user projects one `next` step at a time" now says
  that user projects are started through the entry skills or the index. (2) `<quick_start>` step 2, which
  says to read `skill/SKILL.md` and loop on `next`, now says that a user deliverable goes through the entry
  skills (`skill/.entries/<name>/SKILL.md`) or `skill/SKILL.md`. (3) `<reference_guides>` gets one line
  naming the folder. Keep the XML tags, add no headings, stay under 500 lines
  (`tests/claude-code-surface.test.cjs` checks this). Keep every line the registry change and
  `add-web-capability-skills` Phase B added, if T0 says they are there.
- Proves: nothing by test except that the router keeps its tags and size. Does not prove the README steps
  work on Claude Code or omp, or on macOS or Linux (not verified).

## Wave 2

### T4 Structure tests (size M)

Owns the new `tests/entry-skills.test.cjs`, the new `tests/entry-names.test.cjs`, and the one allow-list
check in `tests/claude-code-surface.test.cjs` (only when that check exists). Needs the files of T2.
`tests/helpers/skill-surface.cjs` is not edited (D10).

- [ ] Write each check as a small function that takes text (or a folder) and returns the problems it found.
  Then, for each check, one test case that runs it on the real files and expects no problem, and a second
  case that runs it on a deliberately broken input (a copy of the real text with one mistake) and expects
  the problem, so each check is shown to fail.
- [ ] In `tests/entry-skills.test.cjs` the five entry names come from ONE constant list at the top of the
  file. Checks 1, 2 and 8 and every broken input read that list; no name is typed a second time in the
  file.
- [ ] `tests/entry-skills.test.cjs` holds checks 1 to 6 and 8 of `design.md` 9.4, for the index and the five
  entries:
  - **Check 1, files.** The `SKILL.md` files under `skill/` outside `upstream` folders are exactly
    `skill/SKILL.md` and `skill/.entries/<name>/SKILL.md` for the five names; each entry folder holds only
    `SKILL.md`. The walk includes dot folders. Broken inputs (a temporary tree outside the repository): an
    extra `.entries/dp-extra/SKILL.md`; an extra file in an entry folder; a missing entry.
  - **Check 2, frontmatter.** First line `---`; keys exactly `name` and `description`, each on one line;
    `name` equals the folder name (the index: `design-pipeline`), is lower-case letters and digits joined by
    `-`, at most 64 characters. Broken: a third key; a name that differs from the folder; a description
    over two lines; an upper-case name.
  - **Check 3, characters.** Description of 1 to 1,024 characters on one line; no colon followed by a
    space; no colon at the end; no space then `#`; no `<` or `>`; no backtick. Broken: one copy per
    mistake.
  - **Check 4, shape.** The first sentence (the text up to the first period followed by a space, or to the
    end) has at most 80 characters; one sentence starts with `NOT for` (the test checks that it is there,
    not what follows); at least three double-quoted phrases (the index two), at least one with a Chinese
    character and at least one with Latin letters. Broken: a first sentence of 81 characters; `NOT for`
    removed; the Chinese phrases removed; only two phrases in an entry.
  - **Check 5, no copied phrases.** The double-quoted phrases, compared without regard to case, differ
    across the index and all five entries. Broken: one phrase of another entry copied in, in a different
    case. This stops copy and paste; it does not show that meanings do not overlap.
  - **Check 6, size.** At most 6,144 bytes and fewer than 500 lines for each entry file; at most 5,120
    bytes and fewer than 500 lines for the index. Broken: an entry text of 6,145 bytes; an index text of
    5,121 bytes; text of 500 lines.
  - **Check 8, names and command shape.** The index table names each entry and the fallback path
    `.entries/`; every `references/...` path named in the index or an entry exists; and neither the index
    nor any entry contains (a) `designer-pipeline route` or `designer-pipeline.cjs route` followed by an
    option (a word that starts with `-`), or (b) a line inside a code fence that starts with
    `designer-pipeline route` or `node scripts/designer-pipeline.cjs route`. Plain prose such as "Run
    `route` to pick a command" passes. The check is permanent: it stays after T5. Broken: an index with one
    entry name removed; an index without `.entries/`; a path that does not exist. Self-test of the route
    part: a copy of an entry with a fenced `designer-pipeline route --query x` line must fail, and the prose
    sentence must pass.
- [ ] `tests/entry-names.test.cjs` holds check 7 alone, so that T5 can delete the file as a whole. Every
  `designer-pipeline <command> [<action>]` written in the index or an entry names a command that the CLI
  help lists, and, when an action is written, that action word appears in a help line of that command. Use
  the loose parsing of 9.4 item 7: the help packs several commands on a line, so split each help line at
  `|` and at spaces, take the word after `designer-pipeline` as the command and the next word as the
  action unless it starts with `-` or `<`, and accept a command that starts a help line or follows a `|`.
  Run the CLI help once in the test. Run the parser on the real help text (it must accept every command
  and action the index and the entries write) and on a copy of an entry with `film edit` in it (it must
  reject it). Also a broken case: an action word that no help line of the command holds. Put a comment at
  the top saying the tool list replaces this file (T5).
- [ ] None of these checks reads a phrase of prose or pins a wording. Do not write a case that reads a
  sentence of a body back.
- [ ] Folder rule in `tests/claude-code-surface.test.cjs`: if T0 says the check "exactly `skill/SKILL.md`" is
  there (`add-web-capability-skills` T3 has landed), change it to a folder rule with no names: outside
  `upstream` folders, every `SKILL.md` other than `skill/SKILL.md` sits at
  `skill/.entries/<folder>/SKILL.md`, with a walk that does not skip dot folders. Do NOT list the five
  names in that file; the exact five names live only in the one constant list of
  `tests/entry-skills.test.cjs` (check 1), so a rename changes one list. If the check is not there, do not
  add it: check 1 of `tests/entry-skills.test.cjs` carries the rule alone, and the report says
  `add-web-capability-skills` T3 must use the same contract (the folder rule).
- Proves: at the gate, that the five entry files and the index keep the structure the design fixes, and
  that each check can fail. Does not prove that a description makes a host load the right entry, and does
  not prove any wording is good. The rules that live only in the entry text are read at closure (9.5).

## Wave 3

### T5 Tool list link (size S) - WAITS FOR THE REGISTRY

Owns `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, the generated `skill/references/tool-map.md`, and
it deletes `tests/entry-names.test.cjs` (a file T4 made; T4 is done by then).

**Stop condition.** Do nothing and report if any of these is missing: `scripts/tool-list.cjs`,
`scripts/tool-list.json`, `tests/tool-list.test.cjs`, `skill/references/tool-map.md`, or the registry's
`SKILL_NAMES` check (`checkSkillFiles`). That means `add-capability-registry` has not landed. Then check 7
stays in `tests/entry-names.test.cjs`, T5 is the first item under Pending, and the change is not closed
until T5 lands or the user decides otherwise (Q9).

- [ ] Read the registry's `scripts/tool-list.cjs` and `tests/tool-list.test.cjs` first. Add no field to
  `scripts/tool-list.json`, no new list and no new rows: the entry files are found by their folder,
  `skill/.entries/*/SKILL.md`.
- [ ] Add the five entry files to the input of the `SKILL_NAMES` check (`checkSkillFiles`) **for commands
  only**: every `designer-pipeline` command an entry names must be an `active` entry of the list. Do not
  check the guide paths of the entry files against the list: the entries name guides the list does not
  carry (`direction-preview.md`, `playground.md`, `reference-spec.md`, `qa-checklist.md`,
  `anti-slop-review.md`, `agent-interface.md`). Check 8 of the entry test keeps checking that the paths
  exist. The rule that the front door names the three workflow guides keeps holding because the index keeps
  them.
- [ ] The generator writes one new section, `## Ways to start`, in `skill/references/tool-map.md`: one row per
  entry with its name, the first sentence of its description, and the commands and guide paths its text
  names, in the order it names them, the paths as plain text. It is computed from the entry files; nothing
  is authored twice. A change to a description or a hand-over table makes `MAP_STALE` ask for
  `node scripts/tool-list.cjs --write`. Regenerate the map with that command and keep the result.
- [ ] `tests/tool-list.test.cjs`: cases that (a) an entry naming a command that is not `active` fails
  `SKILL_NAMES`; (b) changing an entry description in a temporary copy makes the map stale; (c) the
  section has one row per entry. Follow the existing style of that file.
- [ ] Delete `tests/entry-names.test.cjs`. Leave `tests/entry-skills.test.cjs` as it is (check 8 stays).
- [ ] If T5 runs after T6 (the registry landed late): T5 also removes the manifest line of
  `tests/entry-names.test.cjs` from `scripts/test-manifest.json` and reruns `node scripts/qa.cjs` itself,
  on a quiet tree. This is the one case where a slice other than T6 edits that file and runs the gate; it
  becomes the first task of a follow-up, and T6 has already finished.
- Proves: at the gate, that the commands an entry names are in the tool list, and that the map cannot drift
  from the entries. Does not prove that a host loads an entry, and does not check any wording. Does not
  check guide paths against the list.

## Closure (T6, integrator)

Owns `skill/references/package-resources.json`, `scripts/test-manifest.json`, `CHANGELOG.md`,
`openspec/changes/add-task-entry-skills/qa.md` and the boxes of this file; and
`openspec/changes/add-task-entry-skills/specs/entry-skills/spec.md` only for the one case in the "Reconcile"
step below. Runs after T1 to T4 (and T5 if it ran).

- [ ] Add the five paths to `required` in `skill/references/package-resources.json`:
  `.entries/dp-create/SKILL.md`, `.entries/dp-reference/SKILL.md`, `.entries/dp-preview/SKILL.md`,
  `.entries/dp-review/SKILL.md`, `.entries/dp-resume/SKILL.md`.
- [ ] Add one line to `scripts/test-manifest.json` for each new test file that exists at this point
  (`tests/entry-skills.test.cjs`, and `tests/entry-names.test.cjs` unless T5 already deleted it), in the
  file's own order.
- [ ] Add the `CHANGELOG.md` entry under Unreleased. Added: the five entry skills and the fan-out installer
  (`install-local.cjs` puts each entry next to the main skill and writes an install marker in every folder
  it installs; it never replaces an entry folder that has no marker of its own; the result JSON gains
  `entries`; an old entry folder is not removed). Changed: `skill/SKILL.md` is now an index (the loop and
  the first-call tables moved to `dp-create`). If T5 ran, add: the tool map has a "Ways to start" section.
- [ ] Read each entry against the six points of `design.md` 9.5 and write the result of each point in
  `qa.md`: (1) the medium is asked at most once per entry and never when state holds it, with `next`
  called without `--deliverable` when state exists; (2) each "Before you say done" holds what 5.1 to 5.5
  say, `dp-review` reports in two parts and lists checks that did not run, `dp-preview` calls no `deliver`,
  `dp-resume` runs `resume` only after "continue"; (3) no entry calls `decide` unless `next` asked or
  offered the command in a `then` line, records Visual Acceptance, or holds a keyword list; (4) each
  hand-over row names something that exists and points at a guide section instead of restating its list,
  and each entry has the parts of 5.0 in order; (5) contracts are unchanged: list the files this change
  touched (`git status`) and confirm none is under `skill/scripts/` and none is a schema file under
  `skill/references/`; run `node skill/scripts/designer-pipeline.cjs --help` and compare it with the copy
  T0 saved; (6) the task words sit in the first 45 characters of each description (a reader looks at each
  first sentence and says so).
- [ ] Reconcile the allow-list with the spec of `add-web-capability-skills`: its rule "`skill/SKILL.md`
  alone" and this change's allow-list disagree once both are archived. If that change is archived by then,
  write requirement 2 of this change's spec delta (`specs/entry-skills/spec.md`, which T6 owns for this one
  case only) as a `MODIFIED` block for its requirement, and ask the user first. If it is not archived,
  say so in `qa.md` and touch nothing.
- [ ] Run `node scripts/qa.cjs` directly (no pipe, no redirect) once, on a quiet tree. Hand each failure back
  to the owner of the file, wait, rerun.
- [ ] Run `openspec validate add-task-entry-skills --strict`. It is a check of the spec format, not
  behavioural verification; say so in `qa.md` in one sentence next to its result.
- [ ] Smoke. Package with `node scripts/package.cjs --output-root <a temporary directory outside the
  repository>`. Extract the `.tgz` or `.zip` to another temporary directory. Run the packaged installer,
  `<extracted>/design-pipeline/scripts/install-local.cjs`, with `--root <a temporary skills root outside
  the repository>`. Confirm that the root holds `design-pipeline` and the five entry folders, each once,
  that each entry folder holds only `SKILL.md` and the install marker, and that each of the six folders has
  a marker that names its own folder. Run `doctor` from the installed main folder and confirm it still
  passes with the marker present. Run the same install command again without `--replace` and confirm it is
  refused; run it with `--replace` and confirm it succeeds. Put a folder of your own named like an entry
  (no marker) into a second temporary root and confirm the installer refuses it with and without
  `--replace` and leaves it unchanged. If Codex is present, list the first root with the `skills/list` probe
  of `design.md` Appendix A (temporary `CODEX_HOME`, no model call) and confirm each of the six names is
  listed once and `.entries` is not listed. Remove the temporary directories.
- [ ] Write `qa.md`: Component Conformance results (what `node scripts/qa.cjs` and `openspec validate`
  printed, the 9.5 reading, and the smoke output); **the final description texts of the six skills, copied
  from the entry files and the index as they are at closure, with their character counts** (the drafts in
  the design are the first draft; the files are the source); the T7 table (see T7) as pending, or filled in
  by the person; a "Not verified" list (start from `design.md` section 14 and remove nothing that is still
  true; add the Codex version T0 recorded, and whether a Codex was present for the smoke; add "no real
  trigger run of any kind"). Visual Acceptance does not apply: nothing here is a page or a film. Say so.
  Say that the names are drafts until T7.
- [ ] Tick these boxes and the boxes of T0 to T5 that the reports support.
- Proves: what `qa.cjs` proves (the archive holds the five entry files and the index and is the same bytes
  twice; the packaged installer installs the main skill; the installer test installs the five entries and
  refuses a second install without `--replace`; the structure checks; the manifest lists the new test
  files; the repository status is unchanged after the run), plus the smoke. Does not prove which entry a
  host loads (T7), and does not prove the entry text reads plainly (a person).

## T7 Host run (a person, after T6)

A person does this. It writes nothing in the repository. The person hands the filled table to T6, who puts
it under a "Host run (T7)" heading in `qa.md`. Default owner (Q12): the user. The gate cannot do it: a
model's choice of skill is not a fact a script can assert, and a clean folder would not show the crowded
lists that decide the outcome (F5). Until this run is done, nothing about real triggering is verified, and
the names are drafts.

- [ ] For each host (omp, Claude Code, Codex), put the entries into that host's real skills folder. With a
  copy install, run `node scripts/install-local.cjs --root <that folder>`. On a linked install (as on this
  machine, where `~/.agents/skills/design-pipeline` is a link), skip the installer, because it refuses a
  link: copy or link each `skill/.entries/<name>` to `<root>/<name>` by hand. Use one folder per host
  (Codex reads two).
- [ ] Use ONE fresh session PER sentence, in an empty folder, so an earlier answer cannot steer the next.
- [ ] **The first row on Claude Code is "I need a promo film."** Record which skill loads (the index or
  `dp-create`). The index description is the broadest, and Claude Code drops the descriptions of the
  least-used skills first, so the older index may keep its description while a new entry shows as a name
  only.
- [ ] The sentences are: the 30 of `design.md` 9.1 (each for exactly one entry or the index); the near-misses
  N1 to N24 of 9.2 (no `dp-` skill may load) and the five sentences "outside the tools" that follow them
  (no `dp-` skill should load, or one entry may load and say plainly that the tools do not do this job,
  which is a pass; none may start a `next` project); and the seven rows of 9.3 (expected entry as
  listed).
- [ ] Write down what the host loaded: omp, the `skill://` read or the `/skill` line; Claude Code, the first
  `Skill` call in the transcript; Codex, the `SKILL.md` it opens.
- [ ] A row passes when exactly the mapped entry loaded. A near-miss passes when no `dp-` skill loaded (or
  the plain refusal above, for the five outside sentences).
- [ ] Record, per host: host version, skill count in the list, date, skills folder, how the entries were put
  there (installer or by hand), and each row (number, sentence, expected, loaded, pass or fail).
- [ ] A failing row is fixed in the description of the entry that lost it (a new edit of a T2 file, made under
  this change or a follow-up), and then the failing rows and all near-misses run again. The person does not
  edit the repository as part of T7 itself.
- [ ] After the run, say whether the five names stand, and whether `dp-reference` and `dp-preview` stay.
  The names are confirmed only by this run.
- Headless variants (`claude -p ... --output-format stream-json`, `codex exec`) may work; they were not
  tried.
- Proves: which entry each host's model loaded for each sentence, on that person's skill list on that day.
  Does not prove it for other hosts, versions or lists, and does not prove the descriptions read plainly to
  someone else.

## Named follow-ups (not slices)

These are not tasks T0 to T7. None of them is done by this change, and no box below is ticked. Each keeps
its letter from the audit.

- [ ] **L3 Trigger files.** One file per skill in the change folder
  (`openspec/changes/add-task-entry-skills/triggers/<skill>.json`), NOT under `skill/`, in the format
  skill-creator's description tests read: a JSON list of `{ "query": "...", "should_trigger": true|false }`.
  Positives: that skill's rows of 9.1 (and the tie-break rows of 9.3 that belong to it); negatives: the
  positives of the other five skills plus the near-misses of 9.2. Make each positive realistic (a file
  path or a line of backstory, e.g. "promo.mp4 is in ./renders and the client says it drags; check the
  cut"), because a host often skips a skill for a one-line ask and a negative that is trivially wrong
  proves nothing. Structure checks stay as they are. Nothing in `node scripts/qa.cjs` reads these files.
- [ ] **L4 Optional description runs (skill-creator `run_eval.py`, `improve_description.py`).** Exact
  prerequisites: Python with PyYAML; a logged-in `claude` CLI (here it answered "OAuth session expired");
  Linux, macOS or WSL (on Windows `select.select` on a pipe raises `WinError 10093`, and `run_eval.py`
  turns any worker exception into `False`, so every positive would be reported as a miss and every
  negative as a pass with only a stderr warning). It writes a temporary command file into the
  `.claude/commands/` of the nearest ancestor that has a `.claude` folder (here the repo root, which also
  holds the router), so run it from a scratch project, one description at a time, with the other five
  entries installed and the tested one removed. It runs 3 times per query by default. It tests Claude Code
  only. Re-run the structure checks (9.4) on anything `improve_description.py` writes. Optional; not a
  gate. Those lines were read in the script; the two Windows results were observed.
- [ ] **L5 Confuser table 9.2b.** Sentences that fit a `dp-` entry and also a skill installed on this
  machine: `design-review`, `prototype`, `design-shotgun`, `handoff`, `context-restore` (and `review`,
  `code-review`, `qa`). Descriptions must not name these skills, so the NOT sentence cannot help. Each row
  is marked "person decides the expected winner". Expect `dp-review` to lose "review my landing page" to
  `design-review` unless its wording stays anchored on film, edit, audio and measured checks (its phrases
  now are).
- [ ] **L6 Index claim and first host row.** The wording fix is DONE in design 5.6 and the risk row: the
  index description is the broadest, not the narrowest. Follow-up: in T7, the first row on Claude Code is
  "I need a promo film"; record which skill loads (index or `dp-create`).
- [ ] **L7 `quick_validate.py` is not a repo gate.** If someone runs it by hand, set `PYTHONUTF8=1` (or
  `python -X utf8`): it crashes on the Chinese quotes otherwise. It does not check name equals folder,
  colon-plus-space, the NOT clause, or the 80-character rule; the tests of 9.4 do.
- [ ] **L8 What `openspec validate` proves.** `openspec validate add-task-entry-skills --strict` is a check
  of the spec format, not behavioural verification; behaviour is proved only by `node scripts/qa.cjs` and
  the person's host run. (The earlier exit-3 item is already dropped from `dp-review`.)

## Pending (not done by any task above)

- [ ] The host run of `design.md` 9.1, 9.2 and 9.3 by a person (T7), on omp, Claude Code and Codex. Until
  it is done, nothing about real triggering is verified, and the names are drafts.
- [ ] T5, if `add-capability-registry` has not landed (Q9). The change then closes only with the user's yes.
- [ ] Recalibration of the descriptions after the host run, then a rerun of the failing rows and all
  near-misses; and the decision to keep or drop `dp-reference` and `dp-preview`.
- [ ] Not verified yet (`design.md` section 14): macOS and Linux installs; the README steps for Claude Code
  and omp; a Codex other than the one T0 recorded; how a Claude Code list over its budget treats these
  six skills; any real trigger run (`run_eval.py` could not run here: a Windows `select` failure and a
  logged-out `claude`); the marker logic against the real 175 MB `skill/`.

# Task Entry Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user start design-pipeline by task on omp, Claude Code and Codex: one index skill (`design-pipeline`) and five thin entry skills (`dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`), installed side by side by a fan-out installer, with no new gate, receipt, schema, router or command.

**Architecture:** The five entry files live in a hidden folder, `skill/.entries/<name>/SKILL.md`, one file per folder. `scripts/package.cjs` is not edited: it already ships the folder. `scripts/install-local.cjs` copies each entry beside the main skill (`<root>/<name>`), with backup and rollback, and puts a small ownership marker in every folder it installs so that it never replaces a folder of the user's. Each entry only hands over: a fixed table names an existing command or guide, and no entry calls `route`. The index `skill/SKILL.md` keeps `## Where the details are` and `## Always`, gains a task table and a fallback sentence, and the loop moves into `dp-create`. The front-door test helper `tests/helpers/skill-surface.cjs` is not changed (D10): the index keeps every name the eight tests read.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/add-task-entry-skills/` (`proposal.md`, `design.md`, `tasks.md`, `specs/entry-skills/spec.md`); design summary `docs/superpowers/specs/2026-09-30-task-entry-skills.md` (its default answers to the open questions). Section numbers below ("design 5.1", "design 7.3") mean sections of `design.md`.

## Global Constraints

- This plan is for a later build. So far only documents exist: no entry file, installer edit, test, package-list line or changelog line has been written. Nothing in this plan has been run.
- **Nothing about real triggering is verified.** No host and no model was asked which entry loads for any sentence. The descriptions, the sample sentences and the names are drafts until a person has run the host table (T7). The design (`design.md`, F19) reports that the six description texts passed the structure rules of design 9.4, skill-creator's `quick_validate.py`, `claude plugin validate`, and a Codex 0.155.0 listing; none of those shows which skill a model picks, and this plan did not re-run them.
- **The names are draft.** `dp-create`, `dp-reference` and `dp-preview` are plain names that say what the user hands over or gets. They are confirmed only after the host run (design D17 and Q3; the earlier draft names were `dp-make`, `dp-study`, `dp-try`). A rename later costs little: five folders, five `required` lines, one constant list in `tests/entry-skills.test.cjs`, the index table, the router text, the README and CONTRIBUTING words, and the "NOT for" sentences of the descriptions. `dp-reference` and `dp-preview` are kept on trial until T7.
- **Description length is open (design Q14).** Every entry description carries one sentence "Use this whenever ... even if they never say design-pipeline" (about 100 characters each). Keep it; shorten it after the host run if a host drops the descriptions. The six texts add 2,343 characters to a list that already holds 27,740 on the machine the design measured (design F5); the task word sits in the first 45 characters of each.
- Nothing starts until `fix-tool-guidance-errors` and `add-web-capability-skills` (Phase A) are committed (design 1). T0 checks this and stops if they are not; the user decides and may waive the order.
- No new gate, finding code, receipt, schema, workflow stage, workflow-state field or command. No fourth entry command: entries never run `route` to pick a command, and they hold no keyword list, score or rule that picks a command from the user's words.
- An entry calls `decide` only when `next` asked the question, or offered the command in a `then` line (`next` does that for `decide --stage reference --answer none`, only outside replicate mode). Agents never record Visual Acceptance.
- This change edits no file under `skill/scripts/` and no schema file under `skill/references/` (design 9.5, point 5).
- A description never names another skill that a user may lack (`review`, `code-review`, `qa`, `prototype` and the like). A "NOT for" sentence uses plain words and may name a sibling entry of this package.
- Description rules are strict (design 9.4 items 2 to 4): one line; 1 to 1,024 characters; no colon followed by a space; no colon at the end; no space then `#`; no `<`, `>` or backtick; the first sentence (the text up to the first period followed by a space, or to the end) has at most 80 characters; one sentence starts with `NOT for`; at least three double-quoted phrases (the index two), at least one with a Chinese character and at least one with Latin letters; quoted phrases differ across all six skills.
- **One source for description text.** The texts in Task 2 are a first draft: T2 starts from them. Once the entry files exist, the files are the source. The tests (design 9.4) and the tool list (`## Ways to start`) read the files, not this plan. A wording change after the host run is made in the entry file; this plan, the design and the summary are not re-edited. T6 records the final texts in `qa.md`.
- No wording tests. Tests check structure only (design 9.4). Whether a sentence loads the right entry is a person's job (T7); T6 reads what no test can check (design 9.5).
- Writing rule for every text this plan produces: plain everyday words, short sentences, no niche jargon; follow `skill/references/plain-language.md` (useful part first; never widen a claim; keep counts, limits and exclusions); use straight ASCII quotes in prose; keep the Chinese sample sentences exactly as they are in `design.md`; do not copy words or names from other skill suites.
- The only sanctioned verification is `node scripts/qa.cjs`, run directly (no pipe or redirect into the repository), once, by T6, on a quiet tree. Never bare `node --test`. No other task runs `node scripts/qa.cjs` or `openspec validate`. If the registry lands so late that T5 runs after T6 (design 11), T5 becomes the first task of a follow-up and reruns `node scripts/qa.cjs` itself.
- `openspec validate add-task-entry-skills --strict` (run by T6) is a check of the spec format. It is not behavioural verification. Behaviour is shown only by `node scripts/qa.cjs` and the person's host run.
- Each task edits only the files it owns. No file appears under two tasks at the same time. Preserve unrelated working-tree changes; do not commit.
- The bmad-managed block of `AGENTS.md` is not edited. The five sibling drafts (`align-workflow-lifecycle`, `add-web-composition-checks`, `add-capability-registry`, `add-web-capability-skills`, `fix-tool-guidance-errors`) and their documents are not edited.
- The spec delta uses `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` and must pass `openspec validate add-task-entry-skills --strict` (T6 runs it).
- If a worker finds an error or gap in `design.md`, it does not fix `design.md`. It reports it in its hand-off.

## Fixed interfaces (shared by Tasks 0 to 7)

- Change id `add-task-entry-skills`. Index skill: `skill/SKILL.md`, name `design-pipeline`. Entry names (draft): `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`. Entry files: `skill/.entries/<name>/SKILL.md` (hidden folder, one file per folder). The descriptions are the first-draft texts of design 5.1 to 5.6 (618, 474, 476, 460, 420 and 300 characters; 2,748 in all, against 405 for today's single description: 2,343 more), copied into Task 2 as the starting point.
- Installer: `scripts/install-local.cjs` gains a fan-out (design 7.3); constant `ENTRIES = ".entries"`; the result JSON keeps schema id `design-pipeline.install-result.v1` and adds `entries` (array of names). Ownership marker: the file `.installed-by-design-pipeline.json` in every folder the installer installs (the main folder and the five entry folders), holding `{"package":"design-pipeline","skill":"<folder name>","version":"<text>"}` and a newline; written into the staged copy after `doctor` passes and before the swap; never written into the source tree. `scripts/package.cjs` is NOT edited.
- Tests: new `tests/entry-skills.test.cjs` (checks 1 to 6 and 8 of design 9.4; it holds the ONE constant list of the five entry names, which every name-based check in it uses); new `tests/entry-names.test.cjs` (check 7 alone, the command names; T5 deletes the whole file); new helper `tests/helpers/fail-nth-rename.cjs` (when env `FAIL_AT_RENAME=N` is set it patches `fs.renameSync` to throw on the Nth call); edits to `tests/install-local.test.cjs` and the one allow-list check in `tests/claude-code-surface.test.cjs` only when `add-web-capability-skills` T3 has landed. `tests/helpers/skill-surface.cjs` is NOT edited. A line for each new test file that exists when T6 runs goes into `scripts/test-manifest.json` (T6 only; the helper needs no line).
- Resource list: five lines in `required` of `skill/references/package-resources.json`: `.entries/dp-create/SKILL.md`, `.entries/dp-reference/SKILL.md`, `.entries/dp-preview/SKILL.md`, `.entries/dp-review/SKILL.md`, `.entries/dp-resume/SKILL.md`.
- Generated map section (T5, gated on `add-capability-registry` having landed): `## Ways to start` in `skill/references/tool-map.md`. The registry's `SKILL_NAMES` check also covers the commands named in the entry files (not their guide paths). T5 deletes `tests/entry-names.test.cjs` (check 7), because that check replaces it.
- Slices and owners (disjoint): T0 stop check (reads only; repeats the Codex probes of F3 and F4, see design Appendix A; re-reads the shared files of design section 1; saves the CLI help). T1 installer: `scripts/install-local.cjs`, `tests/install-local.test.cjs`, `tests/helpers/fail-nth-rename.cjs`. T2 entry text: the five `skill/.entries/<name>/SKILL.md` and `skill/SKILL.md`. T3 docs: `README.md`, `CONTRIBUTING.md`, `.claude/skills/design-pipeline/SKILL.md`. T4 tests: `tests/entry-skills.test.cjs`, `tests/entry-names.test.cjs`, the allow-list check in `tests/claude-code-surface.test.cjs`. T5 tool-list link (gated): `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, generated `skill/references/tool-map.md`; it also deletes `tests/entry-names.test.cjs` (a whole file, only after T4 has landed, so T4 and T5 never edit one file together). T6 closure (integrator; the only task that runs `node scripts/qa.cjs`, apart from the late-T5 case): `skill/references/package-resources.json`, `scripts/test-manifest.json`, `CHANGELOG.md`, `openspec/changes/add-task-entry-skills/qa.md`, the boxes of `tasks.md`, and `openspec/changes/add-task-entry-skills/specs/entry-skills/spec.md` for one edit only (requirement 2 as a `MODIFIED` block, if `add-web-capability-skills` is archived by then). T7 host run (a person; writes nothing in the repository; the results go into `qa.md` through T6).
- Waves: T0 first; wave 1 = T1, T2, T3 in parallel; wave 2 = T4 (needs T2's files); wave 3 = T5 (gated); T6 last; T7 after T6. T1 can slip without breaking anything (with T2 alone the entries exist and the fallback sentence reaches them). T5 is the last code slice, so closure does not wait on it when the registry has not landed.
- Requirement titles of the spec delta (owned by the design author in `specs/entry-skills/spec.md`; cite by title only): The package has one index skill and five entry skills; Entry skills live in a hidden folder and are the only extra SKILL.md files; Every description is one plain line a host accepts; Trigger phrases are not shared between descriptions; An entry hands over and holds no rules; The medium is asked once; The installer puts each entry next to the main skill; The package and its list carry the entries; The index stays a working front door; Entries keep tool results and human acceptance apart; The tool list and map know the entries; No new router, gate, receipt, schema or command.

## Decisions restated from design.md

These are in the design. They are repeated here so that every worker reads the same numbers. If a worker thinks one is wrong, it reports it and does not change it.

1. **Command names carry the program name** (design 5.0, Commands). The tables of design 5.1 to 5.5 leave `designer-pipeline` out to stay narrow. In the entry files, T2 writes each command as `designer-pipeline <command> ...`, so that check 7 (design 9.4) can find it.
2. **`dp-create` is longer than the other entries** (design 5.0, Size). About 80 lines (78 in the scratch draft), because the loop moves into it; the other four entries are about 40 to 50 lines. Limits: each entry file at most 6,144 bytes and fewer than 500 lines; the index at most 5,120 bytes and fewer than 500 lines. The text that moves into `dp-create` measures 2,283 bytes and must stay whole. The scratch draft of `dp-create` is 5,984 bytes, so it has only about 160 bytes of room: T2 may shorten only its NEW text, never the moved text, and reports the measured numbers. The old deliverable table and the medium table are one table (design 5.1) to save space.
3. **`## Always` in the index keeps its three bullets unchanged and gains one line**: the rule of the first bullet of "Talking to the user" (ask everything missing in one round, numbered, each with a recommendation; "default" accepts all) (design 8).
4. **Rename counts** (design 7.5). A fresh install of six folders makes six renames. A replacement makes twelve (two per folder: target to backup, copy into place). An upgrade from an install that has no entries, with `--replace`, makes seven (two for the main folder, one for each of five new entry folders). The marker adds no rename: it is written into the staged copy. The injection test runs for every N up to the count the run makes. These counts were read from the code, not run (design 14).
5. **Entry folder-name rule** (design 7.3, point 2 and 9.4 check 2): `^[a-z0-9]+(-[a-z0-9]+)*$` (lower-case letters and digits joined by `-`), at most 64 characters. The installer and the entry test use the same rule.
6. **The medium rule** (design 5.0): with `.design-pipeline/state.json` present, take `deliverable` from it, ask nothing, and call `next` without `--deliverable`. Without it, ask at most one question. `dp-reference` and `dp-review` create no project state.
7. **The ownership marker** (design 7.3; it reverses the earlier "no marker file" choice). An existing path at an ENTRY target is replaced, with `--replace`, only if it is a real folder (not a link, not a file) whose marker parses and names this package and this very skill. Anything else stops the installer before it copies or changes anything. The MAIN folder keeps today's rule: an existing folder needs `--replace` and is then replaced whether or not it has a marker, because every earlier release left none. Reason for the difference: no earlier release installed entries, so an entry folder without a marker belongs to someone else; the main folder of an old install is ours but unmarked. A throwaway prototype (outside the repository, Windows, fake `doctor`) passed 15 of 15 scenarios; the real installer with the real 175 MB `skill/` was not run.
8. **Only the new text may be shortened** (design 5.0): the moved text of `dp-create` is never cut.

---

### Task 0: Stop Check (reads only)

**Files:** none. T0 writes nothing in the repository. Probes run in a temporary folder outside it. T0 reports to the user in its hand-off, and saves one file outside the repository (the CLI help, Step 4). ("T0 gate" in older text and "T0 stop check" are the same task; it is not the same thing as a `next` gate.)

**Interfaces:**

- Facts to re-check are those of design section 1 (shared files and who edits them first), F3 (a) to (d) and F4 (frontmatter) as the Codex probes, and F6 (names free).
- Result is one of: **go**, **go with notes**, or **stop and report** (the user decides). Stop and report when: `fix-tool-guidance-errors` or `add-web-capability-skills` (Phase A) is not committed; Codex now lists a hidden folder; or a shared file differs from design section 1. A registry that has not landed is NOT a stop: T5 waits (design Q9) and the rest goes on.
- The lifecycle change edits `skill/SKILL.md` (tier row and decision line) in its closing slice S10. Whoever lands second moves those lines to the file that holds them then (design 1).

- [ ] **Step 1: Re-read the shared files of design section 1**

Read `skill/SKILL.md`, `.claude/skills/design-pipeline/SKILL.md`, `tests/claude-code-surface.test.cjs`, `skill/references/package-resources.json`, `openspec/changes/*/tasks.md` of the five sibling drafts, and check which of these exist: `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, `scripts/tool-list.json`, `skill/references/tool-map.md`, `skill/.entries/`. Use read-only commands only.
Expected: a written table, one row per shared file: what it holds now, which sibling has already edited it, and whether design section 1 still describes it.

- [ ] **Step 2: Decide the gate questions**

Answer each with yes or no and the line that proves it:
(a) Does `skill/SKILL.md` still have the sections that design section 8 moves or keeps (`## Loop`, the two first-call tables and the mode line, `## Talking to the user`, `## Where the details are`, `## Always`)? If the lifecycle change (its S10) has landed, where are the tier row and the decision line now?
(b) Has `add-web-capability-skills` T3 landed (does `tests/claude-code-surface.test.cjs` hold a check that `skill/SKILL.md` is the only `SKILL.md` outside `upstream` folders)? T4 needs this answer.
(c) Has `add-capability-registry` landed (the four registry files above exist)? T5 needs this answer. "No" is not a stop.
(d) Does `skill/SKILL.md` still name `references/product-film-direction.md` (needed by `tests/hyperframes-routing.test.cjs`), and do the eight front-door tests still read the front door through `tests/helpers/skill-surface.cjs`?
(e) Is any folder named `dp-*`, or named `dp-create`, `dp-reference`, `dp-preview`, `dp-review` or `dp-resume`, present in `~/.claude/skills`, `~/.agents/skills`, `~/.codex/skills` or the Claude plugin cache (read-only listing)?
(f) Are `fix-tool-guidance-errors` and `add-web-capability-skills` (Phase A) committed?
Expected: six answers in the hand-off. **Stop and report** if (a), (d) or (f) is no in a way design section 8 cannot absorb, if `skill/.entries/` already exists with other content, or on any stop condition in the Interfaces.

- [ ] **Step 3: Repeat the Codex probes of F3 and F4 (only if Codex is installed)**

Follow design Appendix A: a temporary `CODEX_HOME`, `codex app-server`, JSON-RPC `initialize`, `initialized`, then `skills/list` with `{ "cwds": ["<dir>"], "forceReload": true }`; read `data[0].skills` and `data[0].errors`. F3 probes (a to d): (a) a nested `SKILL.md` is listed; (b) two skills with one name, one nested and one beside the main skill, are both listed; (c) a folder whose name starts with a dot (`.entries`) is not searched; (d) the description shown in the prompt (`codex debug prompt-input "hello"`) gets shorter as skills grow. F4 probes: a colon followed by a space inside a description; a space then `#`; a description that ends with a colon; a description of 1,024 and of 1,025 characters. Make no model call and change nothing in the repository.
Expected: results with the Codex version. If (c) fails (a dot folder is listed), stop and report: each entry would show twice on that Codex (design 7.7) and the user decides. Also report whether the F4 probe now agrees with F13 of `add-web-capability-skills` (which says a colon followed by a space drops the skill and more than 1,024 characters is rejected; design F4 could not reproduce that). If Codex is not installed, write "not run".

- [ ] **Step 4: Save the CLI help**

Run `node skill/scripts/designer-pipeline.cjs --help` and save the output to a file outside the repository (for example in the system temporary folder). Write the path and the number of lines in the hand-off. T6 compares the help against this copy (design 9.5, point 5).
Expected: one saved file; the repository is unchanged.

- [ ] **Step 5: Hand off**

Report go, go with notes or stop; the six answers of Step 2; the probe results (F3 and F4, and whether F4 agrees with F13 of `add-web-capability-skills`); the path of the saved help; any error or gap in `design.md`. Do not edit any file in the repository. Do not run `node scripts/qa.cjs` or `openspec validate`.
Expected: the user can start wave 1 from the report alone.

---

### Task 1: Installer Fan-out, Ownership Marker and Tests

**Files:**

- Modify: `scripts/install-local.cjs`
- Modify: `tests/install-local.test.cjs`
- Create: `tests/helpers/fail-nth-rename.cjs`

**Interfaces:**

Acceptance points for the installer (design 7.3 and decision 7), numbered:

1. **Before it copies anything**, the installer looks at `<source>/.entries/*/`. A source with no `.entries` folder (an old package or a custom `--source`) installs the main skill only and returns `entries: []`.
2. **Each entry folder is checked.** Its name is lower-case letters and digits joined by `-`, at most 64 characters (decision 5). It holds a `SKILL.md` whose frontmatter `name` equals the folder name. Two skills may not install to one folder (an entry named like the main folder, `design-pipeline`, is refused). Any other case is refused before anything changes: no target folder, no backup and no temporary folder is created, renamed or removed.
3. **Where each entry goes.** To `<root>/<name>`, the same `--root` as the main skill. If `--target` is not `<root>/design-pipeline`, the main skill goes where `--target` says, as today, and the entries still go to `<root>/<name>`. Each target must stay below `--root`, must not be a link, and must not lie inside the source (the checks the main target has today). The existing check `--target must stay below --root` still runs first, so the existing test "source and target nesting is rejected before mutation" keeps its message (`descendant`).
4. **The main folder keeps today's rule.** An existing main folder needs `--replace` and is then replaced whether or not it has a marker (every earlier release left none). It gets a marker after this install.
5. **An existing path at an entry target** is replaced, with `--replace`, only if it is a real folder (not a link, not a file) whose marker parses and names this package and this very skill. Anything else (no marker, a marker of another package or another skill, a marker that is not JSON, a file, a link): the installer stops BEFORE it copies or changes anything, exits 1, and the error names the folder, says design-pipeline did not install it (no install marker), says that `--replace` does not change that, and tells the user to move or rename it or pick another `--root`. Nothing was changed, on the main folder or the other entries either. This check runs before the "target exists; pass --replace" message, so nobody is told to add `--replace` and then refused. A marked entry folder without `--replace` is refused with the existing "pass --replace" message.
6. **The marker.** The file `.installed-by-design-pipeline.json` holds `{"package":"design-pipeline","skill":"<folder name>","version":"<text>"}` and a newline. It is written into every staged copy (main and entries) after `doctor` passes and before the swap, so it adds no rename. It is never written into the source tree, so the entry folders in `skill/.entries/` still hold only `SKILL.md` (check 1 of design 9.4). `version` is the text of `PACKAGE.json` in the source when present (the packaged archive has one), else the `VERSION` file one level above `scripts/`, else `unknown`. It is informational and never compared.
7. **The swap.** All copies are staged first. `doctor` runs on the main copy as today. The swap then renames each existing target to a backup, puts the copy in place, and on any failure puts every earlier change back: earlier targets from their backups, newly installed ones removed. This is best effort with backup and rollback, not one atomic step.
8. **The main copy keeps `.entries`**, so `doctor` and `required` stay true in an installed tree.
9. **The result** keeps the schema id `design-pipeline.install-result.v1` and adds `entries`: the array of names installed (empty when the source has no `.entries`).
10. **What it does not do:** remove an entry folder that a later release drops or renames (the marker would let a later release do that; this one does not); read the version for any decision; take a flag. There is no `--no-entries`. The usage line is unchanged.
11. After success or failure, no name containing `.tmp-` or `.backup-` and no name ending in `.install.lock` is left in `--root`.

Test cases to add to `tests/install-local.test.cjs` (design 7.5). All new cases use a small skeleton package with a stand-in `doctor`, not a copy of the 175 MB `skill/` per case. The skeleton is a `SKILL.md` named `design-pipeline`, a stand-in `scripts/designer-pipeline.cjs` that exits 0 for `doctor`, a `version.txt`, and five fake entry folders named as the real ones, each holding a `SKILL.md` whose `name` equals its folder. Only the existing packaged-installer case (real `skill/`, extracted copy) also asserts that the five entry folders land beside the main skill. That one assertion needs T2's files, so T6 is the first run that has both T1 and T2. `qa.cjs` and the existing installer test compare file contents, not whole trees, so a marker file breaks neither (read, not run).

- **T1-a** Entries land beside the main skill (skeleton): `<root>/design-pipeline`, `<root>/dp-create`, `<root>/dp-reference`, `<root>/dp-preview`, `<root>/dp-review` and `<root>/dp-resume` each exist, each entry folder holds `SKILL.md` whose `name` equals its folder name, `<root>/design-pipeline/.entries` exists, and the result JSON `entries` lists the five names (sorted). In the existing packaged-installer case, assert the same six folders with the real `skill/`.
- **T1-b** A second run without `--replace` is refused (exit 1) and all six trees are byte-for-byte as before.
- **T1-c** `--replace` updates all six: change a line in each source entry file and `version.txt`; after the run each installed file equals its new source.
- **T1-d** A bad entry is refused before any change. One case each: the `name` differs from the folder name; the folder name has an upper-case letter; the folder name has an underscore; the folder name is 65 characters; the folder has no `SKILL.md`; an entry is named `design-pipeline`. Expected: exit 1; on a fresh root nothing at all was created in `--root`; on a root with a previous install (`--replace`) all six previous trees are unchanged.
- **T1-e** A failure injected in the Nth rename, for every N. `tests/helpers/fail-nth-rename.cjs` reads `FAIL_AT_RENAME`; when it is a positive integer N it patches `fs.renameSync` to throw an error on its Nth call and to behave normally on every other call (rollback renames must still work). The test starts the installer with `node --require tests/helpers/fail-nth-rename.cjs <installer> ...` (in code: `process.execPath` with `["--require", <helper>, <installer>, ...]`) and env `FAIL_AT_RENAME=N`. Fresh install, N = 1 to 6: exit 1, none of the six folders exists. Replacement (previous install present), N = 1 to 12: exit 1, all six previous trees, markers included, are byte-for-byte as before.
- **T1-f** After every case above, and after the existing failure cases, the listing of `--root` holds no `.tmp-`, `.backup-` or `.install.lock` name (reuse the filter of the existing "failed replacement" test).
- **T1-g** The result JSON of a successful run has `schema` `design-pipeline.install-result.v1` and an `entries` array (checked inside T1-a and T1-c, not as a separate test).
- **T1-h** A source with no `.entries` folder installs the main skill only: exit 0, only `<root>/design-pipeline` exists, and the result has `entries: []`.
- **T1-i** `--target` that is not `<root>/design-pipeline` (for example `<root>/custom-main`): the main skill lands at `--target`, and the five entries still land at `<root>/<name>`.
- **T1-j** Upgrade from an install that has no entries: the main folder exists from an earlier install of a source with no `.entries` (so it has no marker); the entry folders are absent. Install the new source with `--replace`: exit 0, main is replaced and the five entries are installed. Then the failure injection, for every N = 1 to 7: exit 1, main is back as it was (still without a marker), and none of the five entry folders exists.
- **T1-k** The marker is written in all six folders with the right keys (`package` is `design-pipeline`, `skill` equals the folder name, `version` is a non-empty text), the file ends with a newline, and the source tree is clean: no marker file in the source, and the entry folders in the source still hold only `SKILL.md`.
- **T1-l** A user's own folder with an entry's name and no marker (for example `<root>/dp-review` with a file of its own) is refused with `--replace` and without it: exit 1, the error names the folder and says design-pipeline did not install it, it is not the "pass --replace" message, the folder is byte-identical afterwards, and nothing else was created or changed (on a fresh root nothing at all; on a root with a previous install the main folder and the other entries are unchanged).
- **T1-m** A marker of another package, a marker of another skill (for example `dp-preview`'s marker inside `dp-review`), and a marker that is not JSON are each refused like T1-l.
- **T1-n** Marked folders are replaced with `--replace` on an upgrade, and each marker is refreshed (change `version` in the source `PACKAGE.json` and see it in all six markers).
- **T1-o** An old main folder without a marker: refused without `--replace`; replaced with `--replace`; it has a marker afterwards.
- **T1-p** A file, and a link where the platform allows one, named like an entry is refused like T1-l (skip the link case on a platform that cannot make one, and say so).
- **T1-q** `version` comes from `PACKAGE.json` in the source when present; with no `PACKAGE.json` the marker still holds a non-empty `version` text.

- [ ] **Step 1: Read the installer and its tests**

Read `scripts/install-local.cjs` and `tests/install-local.test.cjs` in full. Note where `install(options)` stages the copy (the `fs.cpSync` of the main folder), runs `validateStagedPackage`, and swaps.
Expected: you can say which lines become a loop over targets, where the entry check and the ownership check go so that they run before the first copy, and where the marker is written (after `validateStagedPackage`, before the first rename).

- [ ] **Step 2: Add the fan-out and the marker**

Add `const ENTRIES = ".entries";`. Add an entry finder that returns `[{ name, source, target }]` and checks points 1 to 3 and 5 before the first copy or change. Stage every copy, run `doctor` on the main copy, write the marker into every staged copy, then swap all targets in one list with one rollback path (point 7). Keep the lock and the error style (`FAIL ...` on stderr, exit 1). Add `entries` to the result of both return paths. Report which of the three version sources it used in your runs (`PACKAGE.json`, the `VERSION` file one level above `scripts/`, or `unknown`).
Expected: `scripts/install-local.cjs` has no new flag and the usage line is unchanged. Design 7.2 estimates 45 to 60 lines for the fan-out and the marker together (the prototype with the entry checks and the marker added 45; an estimate, not a limit).

- [ ] **Step 3: Write the helper**

Create `tests/helpers/fail-nth-rename.cjs`: it reads `process.env.FAIL_AT_RENAME`; if it is a positive integer it wraps `fs.renameSync` with a counter and throws `new Error("injected rename failure")` on call number N. Keep it under 20 lines.
Expected: with the variable unset the helper changes nothing.

- [ ] **Step 4: Add the test cases**

Add T1-a to T1-q. Build the skeleton once per test in a temporary folder and run every new case on it. Use the real `skill/` only in the existing packaged-installer case (the second part of T1-a). Existing tests stay as they are, except where the fan-out changes what they must assert (none is expected).
Expected: every case has a broken-input side (a refusal or an injected failure), not only a success. The injection runs (6 + 12 + 7 = 25) stay fast because they copy only the skeleton.

- [ ] **Step 5: Check by hand, then hand off**

With a throwaway script outside the repository, run the installer on a small source with fake entries: fresh install, second run, replacement, upgrade from an install without entries, a bad name, a user's own unmarked `dp-review` folder, and `FAIL_AT_RENAME=3`. Report the files changed, the case names, and what you saw. Do not run `node scripts/qa.cjs` or `openspec validate`; T6 owns the run.
Expected: the case names in the report match Step 4; the by-hand results agree with points 1 to 11.

---

### Task 2: Entry Text and the Index

**Files:**

- Create: `skill/.entries/dp-create/SKILL.md`
- Create: `skill/.entries/dp-reference/SKILL.md`
- Create: `skill/.entries/dp-preview/SKILL.md`
- Create: `skill/.entries/dp-review/SKILL.md`
- Create: `skill/.entries/dp-resume/SKILL.md`
- Modify: `skill/SKILL.md`

**Interfaces:**

Size limits: each entry file at most 6,144 bytes and fewer than 500 lines; the index at most 5,120 bytes and fewer than 500 lines. An entry is about 40 to 50 lines and `dp-create` about 80 (design 5.0): the four short entries are not held to 30 to 45 lines. One folder per entry, and no other file in it. **Drafted body sizes** (measured on scratch drafts, not final; T2 measures the real files): `dp-create` 5,984 bytes and 78 lines; `dp-review` 4,416 and 48; `dp-reference` 4,308 and 43; `dp-preview` 4,110 and 42; `dp-resume` 3,446 and 42; index 2,835 and 47. The text that moves from the index into `dp-create` is 2,283 bytes. `dp-create` has only about 160 bytes of room: T2 may shorten only its NEW text, never the moved text, and reports the numbers.

Frontmatter of every file: first line `---`, then exactly two keys, `name` and `description`, each on one line, then `---`. `name` equals the folder name (the index: `design-pipeline`). T2 starts from the description texts below; once the files exist they are the source (Global Constraints). They are a first draft, and the names are draft until T7.

**Body outline of every entry** (the five parts of design 5.0, in this order):

1. **Locator sentence**, right after the frontmatter (a heading with the entry name may come first): "Find the `design-pipeline` folder first. The folder your host printed for this skill ("Base directory for this skill" or "Skill directory") is this skill's own, and `design-pipeline` sits next to it. If you came through the index, the folder the host printed is `design-pipeline` itself. It holds `scripts/designer-pipeline.cjs` and `references/`; every path below is inside it, and `designer-pipeline` means `node scripts/designer-pipeline.cjs` run from there." Evidence, as reported in `design.md` (F23): Claude Code puts "Base directory for this skill: <path>" before a loaded skill's text (seen in local transcripts of Claude Code 2.1.250 to 2.1.275; its docs are silent); omp appends "[Skill directory: <baseDir>]" to a `/skill:<name>` message (seen in a local omp session log and the harness document `omp://skills.md`); for Codex only the path of each `SKILL.md` is shown in its list (seen in the probe). Still not verified: how Claude Code treats nested or hidden folders inside a skill folder, and whether the line is always shown.
2. **`## Ask once`**: the entry's inputs (below). The medium rule (decision 6): if `.design-pipeline/state.json` exists, take `deliverable` from it, ask nothing, and call `next` without `--deliverable`; if not, and the user's words do not name the medium, ask one question: "Is this film (also 3D shots and a score), an edit, a web page or a UI?" `dp-create` and `dp-preview` pass the answer to `next --deliverable`; `dp-reference` and `dp-review` use it to choose a row and create no project state. `dp-resume` asks no medium question.
3. **`## Hand over`**: one table, copied from design 5.1 to 5.5 as they stand in the final `design.md` (with the `designer-pipeline` prefix, decision 1). One row per medium, except `dp-resume` (rows are situations) and `dp-reference` (rows are kinds of reference). Each row points at a guide section instead of restating its list (design 9.5, point 4). No keyword list, no rule that picks a command from the user's words, no `route`.
4. **`## Before you say done`**: bullets from the design text of that entry, pointing at the guide section that holds the list (A4 below), not restating it.
5. **`## Do not`**: five shared bullets, each with a short reason, plus the extra bullets named per entry. Plain prose: `route` is named without a command shape (check 8 tests the shape, not the word).
   1. Call `decide` unless `next` asked the question or offered the command in a `then` line (`next` does that for the skip of the `reference` step, which only the user may choose). A recorded decision is what moves the job on, and an early one skips the person's own choice.
   2. Record Visual Acceptance. Only a person can accept a piece, and a passing check is not acceptance.
   3. Run `route` to pick a command. It is a second way to decide what happens next, and two ways disagree.
   4. Write a file the named guide does not name. Evidence kept elsewhere is not found later.
   5. Say a check passed when it did not run. The reader relies on that word.

**Descriptions** (first draft; write each on one line, ASCII straight quotes, Chinese exactly as here). All six passed the structure rules, `quick_validate.py`, `claude plugin validate` and a Codex 0.155.0 listing (as `design.md` reports; not re-run here). Counts were measured with a script on 2026-10-01. The task word sits in the first 45 characters of every one.

- `dp-create` (618 characters; first sentence 75; 10 quoted phrases): Create a new film, edit, web page or UI and check it before anyone sees it. Use this whenever the user wants a film, PV, landing page or UI made or rebuilt, even if they never say design-pipeline. Typical words are "make a promo film", "cut a PV to this song", "animate a 3D product shot", "build a landing page", "design this settings screen", "rebuild this page from the link", "做一支宣传片", "剪一条卡点视频", "做个落地页", "重做这个页面". NOT for checking a finished piece (dp-review), only taking a reference apart (dp-reference), only trying options (dp-preview), continuing a job (dp-resume) or small edits to code in an existing app.
- `dp-reference` (474; first sentence 53; 7 phrases): Take a reference apart and write down what to borrow. Use this whenever the user hands over a video, page, screenshot or song to learn from, even if they never say design-pipeline. Typical words are "analyze this reference", "how did they make this", "break down this edit", "what makes this site feel good", "拆解这个参考", "分析这支视频的节奏", "这个网页的动效怎么做的". NOT for making or rebuilding the piece (dp-create), checking a finished one (dp-review) or explaining how code or a tool works.
- `dp-preview` (476; first sentence 63; 8 phrases): Preview a few directions or a rough sample before the full job. Use this whenever the user wants to see options or a rough version before deciding, even if they never say design-pipeline. Typical words are "show me three directions", "give me a quick sample", "try a few looks first", "mock up some options", "tune it with sliders", "先出几个方向", "先做个小样", "多试几种风格". NOT for the finished piece (dp-create), API or module design, previewing a deploy or a file, or a code experiment.
- `dp-review` (460; first sentence 66; 7 phrases): Check a finished film, edit, web page or UI and report the result. Use this whenever the user wants a finished piece checked, even if they never say design-pipeline. Typical words are "check this cut", "run the checks on this film", "check the sound of this video", "check the text and motion on my landing page", "检查这个成片", "检查这个页面的文字和动效", "帮我评审这段动效". If asked to check and fix, start here. NOT for code review, pull requests or making a new piece (dp-create).
- `dp-resume` (420; first sentence 61; 5 phrases): Continue a film, edit, web or UI job, or say where it stands. Use this whenever the user wants to pick such a job back up or asks how far it got, even if they never say design-pipeline. Typical words are "continue the film project", "resume the promo", "pick the landing page back up", "接着做这支片子", "这支宣传片做到哪一步了". NOT for restoring chat history, writing hand-off notes, general code work or starting a new job (dp-create).
- `design-pipeline` index (300; first sentence 74; 4 phrases; text unchanged by this round): Start here for design-pipeline, a toolkit for film, edit, web and UI work. Use when the user names it, asks "what can design-pipeline do", "how do I start", "design-pipeline 怎么用", "从哪开始", or wants film, edit, web or UI design work and no dp- skill is listed. NOT for code review or application logic.

Totals: 2,748 characters for the six, against 405 for today's single description (2,343 more). Crowded hosts show only the first 55 to 64 characters (Codex on this machine). Design choices that the texts carry, and T2 keeps: the tie-break "a sentence that names two tasks goes to the first action the user asks for" lives in the descriptions ("rebuild this page from the link" and "重做这个页面" in `dp-create`; "making or rebuilding the piece (dp-create)" in `dp-reference`; "If asked to check and fix, start here" in `dp-review`). `dp-resume` is tied to film, edit, web and UI on purpose: a bare "what is the next step?" does not select it by design. The user can type `/dp-resume`, or name the film, edit or page. The index is the BROADEST description (it covers film, edit, web and UI design work); only "and no dp- skill is listed" narrows it, and the model has to check that itself.

**Per-entry outline.** The rows and sentences below come from design 5.1 to 5.5. T2 copies the tables from those sections as they stand in the final `design.md` (adding the program name to each command) and does not widen a claim.

- **`dp-create`** (design 5.1).
  - *Ask once.* The medium (decision 6); the size of the job, from which the agent picks the tier and the user may override; whether the user gave a reference to reproduce (`--mode replicate`) or no direction (`--mode freeform`); `next` asks the rest.
  - *Hand over.* One merged table with five columns: Medium, For, First call, Guide, Note. Four rows: film (For: generated promo, explainer, logo sting, feature demo, 3D product shot; a 3D shot needs Blender, `references/film-blender.md`; a score uses `references/film-score.md` and needs the storyboard, so there is no music-only job); edit (For: PV, MAD, beat montage cut from existing footage and music; guides `references/workflow-edit.md`, `references/film-edit.md`); web (For: motion-first websites and pages; guides `references/workflow-web.md`, `references/web-direction.md`); ui (For: product UI, components, design systems, clones; guide `references/pipeline-reference.md`; intake, then the work; no gate yet). The old deliverable table is merged into this one: its "For" words are the second column.
  - *Moved word for word from today's `skill/SKILL.md`* (2,283 bytes together, kept whole): `## Loop` (with `rules`), the tier table, the mode line, `## Talking to the user`. They sit after "Hand over" and before "Before you say done" (design 5.1).
  - *Before you say done.* `next` returned `done`, or the user stopped it. Quote the `done` answer (`evidence.delivered`, `evidence.gates`, `evidence.drafts`). At the quick tier, film, edit and web have no deliver stage, so there is no delivered file: name the draft render (or page) and the gate results instead. Say a gate passed only if its record says `passed`. Report the gate results and the user's accept or reject apart, and never call the agent's own liking acceptance. Where a file or address was delivered, name it and check that it exists.
  - *Extra Do not.* None.
- **`dp-reference`** (design 5.2).
  - *Ask once.* The reference or references (files, addresses) and what kind each is; what the user wants to use it for; where `reference.md` goes (the project root by default). The rows are keyed by the kind of reference; the medium only says which guide section to read. Creates no project state.
  - *Hand over.* The four rows of design 5.2, keyed by kind: a web page or a screenshot of one (`references/workflow-web.md` section `reference`; `composition capture --url <address> --output <dir>`; needs Chrome and a browser driver, exits 1 without the driver); footage and music for an edit (`references/workflow-edit.md` section `reference`; `film-edit analyze --project-root <dir> --audio <music>`, which writes `edit/analysis.json` into that folder, so use a sample folder if the project should stay clean); a video for a film (`references/workflow-film.md` section `reference`; nothing in this package lets an agent watch or measure a video, so an agent that cannot view video says so, asks the user for the timings, and writes in `reference.md` how each item was learned); a UI or any design reference (`references/reference-spec.md`; `composition capture` for a screenshot of a page; `next` has no `reference` stage for `ui` yet). Under the table, one sentence: the file has the sections that `references/reference-spec.md` lists under Required Sections (seven items); the guide section of the row says what to watch for.
  - *Before you say done (A4: point, do not restate).* `reference.md` has the sections that `references/reference-spec.md` lists under Required Sections (seven items: source inventory and provenance; observable evidence including the per-region table; spatial evidence for and against 3D; selected route and confidence; fidelity invariants; uncertain or missing evidence; resulting artifact requirements). Each item also says how it was learned (a command, a viewing, or the user's words). Two honesty lines only: say what could not be observed; say what `next` will and will not see (the `reference` stage exists for film and web at standard and full and for edit in replicate mode; elsewhere `next` records nothing). The earlier five-item list (where each source came from; observed; transfer; do not copy; licence) is removed; T2 checks that `reference-spec.md` Required Sections still has those seven items before writing this.
  - *Extra Do not.* Say that a reference video was measured. No command of this package does that. Create project state. This entry writes `reference.md` and nothing else.
- **`dp-preview`** (design 5.3).
  - *Ask once.* The medium (decision 6); "directions" or "sample"; the folder. A sample goes in a folder of its own (for example `samples/<name>/`), because `next --tier quick` fixes the tier of the project state it creates, and a later `next --deliverable` in the same folder fails without `--replace`. To continue a sample as the real job, keep working in its folder.
  - *Hand over.* The four rows of design 5.3, two columns (a few directions, a rough sample). film: `next` at the standard tier until `concepts` is picked (`decide --stage concept`; `references/workflow-film.md` section `concepts`); put the questions of `next` to the user in one round, with your recommendations; at the `reference` step follow the guide's section `reference`, and the user decides whether to skip it; sample: `next --tier quick` (plan, build, check). edit: after `film-edit analyze`, the `style` question, mad or pv (`references/workflow-edit.md` section `style`); sample: `next --tier quick` (analyze, cut, render, check; cut as MAD). web: the same as film, until `concepts` is picked (`references/workflow-web.md` section `concepts`), and for a whole page with real content `references/direction-preview.md`; sample: `next --tier quick` (build, probe). ui: `references/direction-preview.md` (three candidates, two gates) and `references/playground.md` to tune an accepted direction; sample: do the work as `references/pipeline-reference.md` says at the quick tier and stop; do not use `next`, because a `ui` job cannot finish in it without `deliver`, which a sample never calls.
  - *The reference step.* The film and web rows do not script `decide --stage reference --answer none`. The row says: at the `reference` step follow the guide's section `reference`; the user decides whether to skip it. (At that step `next` returns a `run` action, not an `ask`, with a `then` line that offers `decide --project-root . --stage reference --answer none` outside replicate mode; the shared first Do-not bullet already allows a command that `next` offers in a `then` line. T2 checked this against `skill/references/workflow-film.md`, `skill/references/workflow-web.md` and `skill/scripts/workflows/shared.cjs`; report any conflict.)
  - *Before you say done.* Each result is labelled a sample, not a delivery, and `deliver` was not called. For directions: the candidates differ on the guide's own terms (concept cards with different central ideas; direction preview candidates that differ on four axes), and the user's pick is recorded with `decide --stage concept` in a project or quoted otherwise. For direction preview or playground: the exit code of `direction check` or `playground check` at the stage that ran, and the sentence that `next` cannot see these files. For a sample: the checks that ran and their exit codes.
  - *Extra Do not.* Call `deliver`. A sample that is marked delivered cannot be told apart from the finished piece. Start a sample in a folder that already holds project state.
- **`dp-review`** (design 5.4).
  - *Ask once.* The medium (decision 6; a state file is only read, never created); the piece: a project folder, a file, or an address; whether the project has state.
  - *Hand over.* The entry runs what the guide section of the row lists (design 5.4); that section says which checks run only when their input exists and which steps are optional, so the entry does not copy the list (A4). Columns: Medium, Guide section to run, What it needs. film (also 3D, score): `references/workflow-film.md` section `check`: `film check --project-root <dir>` runs its gates (some only when their input exists), and the section ends with an optional text step (`composition capture`, then `verify composition`, five more checks); needs a film project with `storyboard.json`; for a bare video file `verify audio --audio <file>` runs on it, and the picture check `verify composition --image <frame.png> --profile frame` needs frames as PNG files that no command of this package extracts, so the agent uses its own tool and says so. edit: `references/workflow-edit.md` section `check`: `film-edit check --project-root <dir>`; needs `edit.json`, `sources/licenses.json`. web: `references/workflow-web.md` section `probe`: `verify interaction --probe interaction.json`; for the first screen `references/composition-gate.md` (`composition capture --url <page> --output <dir>`, then `verify composition --image ... --elements ... --profile ui`); needs a probe file, Chrome and a browser driver; keep the warning that on a page taller than the window the picture check reports text below the fold as off screen, so use that pair for the first screen only. ui: `references/qa-checklist.md` (Browser / Visual Checks) and `references/composition-gate.md`; needs a screenshot or a page; `next` has no gate for `ui`. any sound: `references/audio-gate.md`: `verify audio --audio <file> [--target web|podcast|broadcast]`; a wav, mp3 or mp4. The reader's note about `add-web-composition-checks` in design 5.4 is NOT copied into the entry.
  - *Then the person's part*, from guides and not from the agent: `references/qa-checklist.md` (Browser / Visual Checks; Web Treatment And Section Review; Contextual Anti-Slop Review; Accessibility Checks), rules R1 to R7 for a music-led film (`references/product-film-direction.md`) and W1 to W7 for a page (`references/web-direction.md`).
  - *Before you say done.* The entry keeps only the report shape. "Checked by tools": for each check, the command, its exit code and each finding with its `fix`. Exit codes: 0 passed; 2 a check failed or is blocked; 1 the command could not run (source: `docs/cli-and-reference-providers.md` lines 16 to 21 and `skill/references/qa-checklist.md` line 30; the earlier "3 measured mismatch" is dropped because it belongs to fidelity commands only, which this entry does not run). "Needs a person's eye": the rules above as questions, each with the evidence to read. Honesty lines: list every check that did not run and why (no project; no `ffmpeg`; no Chrome; no browser driver) and never call such a check passed; say that a check run inside a project that has state records its result there. It calls `decide` only when `next` asks or offers the command. It records no Visual Acceptance. Fixing what a check found is the `check` stage of `next`; if the user says "and fix", hand over to `next` when a project exists.
  - *Extra Do not.* Fix anything before the report is given; create project state.
- **`dp-resume`** (design 5.5).
  - *Ask once.* The folder: the current one by default. The agent looks at the files to tell a project folder (`.design-pipeline/state.json`) from a change folder (`state.json` and `events.jsonl`); it does not guess from words. It asks only when both exist or the folder is not clear. The rows are situations, not media. No medium question.
  - *Hand over.* The four rows of design 5.5, in this order: a folder with `.design-pipeline/state.json` (`next --project-root <dir>`, which reads and changes nothing; read the `guide` that `next` names, for film, edit and web); a change folder with `state.json` (`status --change-root <dir>`, then `explain-block --change-root <dir>`; `resume --change-root <dir>` only after the user says continue, and only if the folder holds `plan.json`; read `references/agent-interface.md`, section Resume Protocol); both, a `full`-tier project with its change (`next` first, then `status` on the change; read both); neither (say so and offer `dp-create`; start nothing).
  - *Before you say done.* It says which kind of state it found. For a project it quotes `line`, `completed`, `remaining` and, when present, `rules`, and the state file is unchanged. For a change folder it quotes `status` and `explain-block`; it ran `resume` only after "continue", only with a `plan.json`, and said that `resume` writes an event and the state. "Continue" means running the `dp-create` loop from the stage `next` names; without it nothing runs. `status` and `resume` do not work on a `next` project; the entry says so.
  - *Extra Do not.* Run `resume` on your own initiative. It writes an event and the state, so it changes a job the user only asked about. Run `status` or `resume` on a project folder that is not also a change folder.

**The index `skill/SKILL.md`, section by section** (design 8):

| Today | After |
| --- | --- |
| frontmatter: description of 405 characters, no "not for" part | description of 300 characters (above), name unchanged |
| first paragraph: "Talk with the user; drive the work with one command. The CLI is ..." | one line: the CLI is `node scripts/designer-pipeline.cjs` in this folder |
| `## Loop` (the `next` loop, `rules`) | moves to `dp-create` unchanged |
| first-call tables (deliverable, tier) and the mode line | move to `dp-create` unchanged (the deliverable table is merged into the medium table there) |
| `## Talking to the user` | moves to `dp-create`; the first bullet (ask everything missing in one round, numbered, with recommendations; "default" accepts all) also stays as one line in `Always` because every entry asks that way |
| `## Where the details are` (film, edit, web guides and the other reference pointers) | stays unchanged: `hyperframes-routing.test.cjs` reads one path in it, the eight front-door tests read the guides it names, and the registry check needs the three workflow guides here |
| `## Always` (gates never grant acceptance; honest licences; OpenSpec rule) | stays, and gets one added line: the rule of the first bullet of "Talking to the user" |
| none | a table of the five entries: task, skill, what it hands over to |
| none | the fallback sentence: "If your host does not list the dp- skills, open `.entries/<name>/SKILL.md` in this folder and follow it." |

Rules for the index: keep `## Where the details are` and `## Always` unchanged, apart from the one added line in `## Always`; it keeps the path `references/product-film-direction.md` and the three workflow guides `references/workflow-film.md`, `references/workflow-edit.md` and `references/workflow-web.md`; keep every bullet that another change added (for example the web bullet and, later, the registry bullet). The entry table has one row per entry (task, skill name, what it hands over to), naming each of the five entries. Row targets come from design section 4: `dp-create` the `next` loop; `dp-reference` the `reference` stage guides, `composition capture`, `film-edit analyze`; `dp-preview` the `concepts` and `style` stops, the quick tier, `references/direction-preview.md`, `references/playground.md`; `dp-review` the check commands and `references/qa-checklist.md`; `dp-resume` `next`, `status`, `explain-block`, `resume`. Name no command in the index that the entries do not also name in the same form.

- [ ] **Step 1: Read the sources**

Read `design.md` sections 4, 5 and 8, `skill/SKILL.md`, and `skill/references/plain-language.md`. If T0 reported a landed sibling change that touched `skill/SKILL.md`, read its edits first. Read `skill/references/reference-spec.md` (Required Sections) and the `check` and `probe` sections of `skill/references/workflow-film.md`, `workflow-edit.md` and `workflow-web.md`.
Expected: you can state, for each of the six files, what stays, what moves and what is new.

- [ ] **Step 2: Check every path and command before writing it**

For each `references/...` path that the tables name (`workflow-film.md`, `workflow-edit.md`, `workflow-web.md`, `film-blender.md`, `film-score.md`, `film-edit.md`, `web-direction.md`, `pipeline-reference.md`, `reference-spec.md`, `direction-preview.md`, `playground.md`, `qa-checklist.md`, `composition-gate.md`, `audio-gate.md`, `product-film-direction.md`, `agent-interface.md`, `anti-slop-review.md`) confirm the file exists under `skill/references/`. Confirm each command you will write appears in `designer-pipeline --help`.
Expected: a short list of paths and commands, all found. A missing one goes into the hand-off, not into the text.

- [ ] **Step 3: Write the five entry files**

Follow the body outline and the per-entry outline. Copy the table rows from design 5.1 to 5.5 and add the program name to each command (decision 1). Start from the descriptions above. Keep tables narrow enough to read. Point at guide sections instead of restating their lists.
Expected: each entry has the five parts in order (about 40 to 50 lines; `dp-create` about 80); each entry file at most 6,144 bytes; `dp-create` within its 160 bytes of room (shorten only NEW text).

- [ ] **Step 4: Rewrite the index**

Apply the move table. The loop, the tier table, the mode line and "Talking to the user" appear in `dp-create` word for word and no longer in the index. Add the entry table, the fallback sentence, and the one line in `## Always`.
Expected: about 47 lines and 2.8 KB (scratch draft); at most 5,120 bytes; `## Where the details are` matches today's text.

- [ ] **Step 5: Measure and read through**

Count bytes and lines of each file (`wc -c`, `wc -l`, read-only). Check: no colon followed by a space in any description; no other skill named in a description apart from sibling entries; no `designer-pipeline route` command shape anywhere (neither in a line inside a code fence nor followed by an option); no quoted phrase repeated between two descriptions; the task word sits in the first 45 characters of each description; each entry has the medium rule of decision 6 where it asks a medium question; each "Do not" bullet has its reason; none of the old names `dp-make`, `dp-study` or `dp-try` remains.
Expected: every file within its limit, or the overrun is in the hand-off with the number.

- [ ] **Step 6: Hand off**

Report the six paths with byte and line counts, the paths and commands checked in Step 2, where you placed the moved sections in `dp-create`, and any place where the text differs from `design.md` or from these descriptions. Do not run `node scripts/qa.cjs` or `openspec validate`.
Expected: T4 can read the five files without asking.

---

### Task 3: Docs and the Router

**Files:**

- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `.claude/skills/design-pipeline/SKILL.md`

**Interfaces:**

**README section.** One new `## 按任务开始（入口 skill）` section, in Chinese like its neighbours and in plain words, placed before `## 引导式多 Surface 流程`. Content, in this order:

1. What it is: a main skill `design-pipeline` and five entry skills, one per task, and what each does in one line (`dp-create` 做新东西; `dp-reference` 拆解参考; `dp-preview` 先看几个方向或小样; `dp-review` 检查成品; `dp-resume` 接着做或说明做到哪). Typed names work on every host (`/dp-review`); in some hosts the model also picks an entry from the words of the request. The names are draft until a person has run them on each host.
2. Install with the installer: `node scripts/install-local.cjs --source skill --root <host skills folder>`, which puts `design-pipeline` and the five `dp-` folders side by side under `--root`. A table of folders: Codex `~/.codex/skills`; omp `~/.agents/skills`; Claude Code `~/.claude/skills`.
3. One folder per host: Codex reads two folders (`~/.codex/skills` and `~/.agents/skills`) and lists a skill twice if it sits in both. On a machine where `~/.agents/skills` serves omp and Codex, Claude Code still needs `~/.claude/skills`.
4. Upgrade: add `--replace`; it replaces the main skill and the entry folders this package installed earlier (each has a small file `.installed-by-design-pipeline.json` that says so). An existing folder is refused without it. **A folder of yours with an entry's name is never replaced: the installer stops and names it; rename yours and run again.** (This replaces the old sentence that `--replace` overwrites it.)
5. Linked or hand-copied installs. A copy or unzip of `skill/` as `design-pipeline` gives the index only, and the index's fallback sentence opens `.entries/<name>/SKILL.md`. **A linked install cannot use the installer**: the installer refuses a link as its target, refuses an existing folder without `--replace`, and has no mode that installs only the entries. So for a linked install (for example `~/.agents/skills/design-pipeline` linked to `skill/`), copy or link each `.entries/<name>` folder to `<root>/<name>` by hand (five folders per host).
6. Uninstall: remove `design-pipeline` and the five `dp-` folders from that skills folder.
7. Limits, stated plainly: an entry that a later release drops or renames leaves an old folder behind, and you delete it by hand; a crowded host may show only the names, or only the start of each description (Claude Code drops the descriptions of the least-used skills first; Codex shortens them as skills grow), and the typed name always works. Say which steps were run (the installer on a temporary root; Codex listing) and which were not (the Claude Code and omp folders come from their documents; which entry a model picks for a sentence was not tested).

The existing install commands in the README stay as they are: they already install the entries, because entries go to the same `--root`. Add no claim the design does not make.

**CONTRIBUTING paragraph.** One new short section `## Entry Skills` before `## Naming Conflicts`, in English, plain words: to add or rename an entry skill, edit its file `skill/.entries/<name>/SKILL.md`; add or change its line in `required` of `skill/references/package-resources.json`; update the one constant list of names in `tests/entry-skills.test.cjs` (and the allow-list in `tests/claude-code-surface.test.cjs` if that check exists); update the tool list when the registry is present (`node scripts/tool-list.cjs --write`). The installer finds folders under `.entries` by itself. Entry names start with `dp-` so that they do not clash with common skill names (for example `review`); what stops the installer from replacing a folder of the user's with the same name is the marker file `.installed-by-design-pipeline.json`, not the prefix. At most six entries. A description follows the strict rules of `tests/entry-skills.test.cjs`, names no other skill except a sibling entry, and has quoted phrases that no other skill uses. A dropped or renamed entry leaves an old folder in the skills root; say so in the release notes.

**Router.** `.claude/skills/design-pipeline/SKILL.md` gets three small edits and nothing else (design 7.6), because two of its sentences would be wrong once the loop lives in `dp-create`:

1. The `<objective>` sentence that says the packaged front door "drives user projects one `next` step at a time" says instead that user projects are started through the entry skills (`skill/.entries/<name>/SKILL.md`) or the index `skill/SKILL.md`.
2. `<quick_start>` step 2, which says to read `skill/SKILL.md` and loop on `next`, says that a user deliverable goes through the entry skills (`skill/.entries/<name>/SKILL.md`) or `skill/SKILL.md`.
3. `<reference_guides>` gets one line naming the folder `skill/.entries/`.

Keep the XML tags, add no headings, stay under 500 lines. Keep every line that `add-capability-registry` or `add-web-capability-skills` added (read the file again just before editing). The router keeps its name and role (design 7.6, D11).

- [ ] **Step 1: Read the neighbours**

Read `README.md` around `## 一分钟上手` and `## 从 GitHub Release 安装` (lines about 100 to 220), `CONTRIBUTING.md` (all), the router (all), and design 7.4 and 7.6.
Expected: you know the tone and where each new text goes.

- [ ] **Step 2: Write the README section**

Follow the outline. Keep it short: a table for the five entries and for the three folders, one code block for install, plain sentences for the rest. The linked-install point and the "a folder of yours is never replaced" sentence are stated as in items 4 and 5, in Chinese and plain words.
Expected: the section names every folder and flag once, with no invented option; it says a linked install must copy or link each entry by hand, and that an unmarked folder with an entry's name is never replaced.

- [ ] **Step 3: Write the CONTRIBUTING section**

Follow the outline; one paragraph plus at most a short list.
Expected: it names the places to update and says the marker, not the prefix, protects a user's own folder.

- [ ] **Step 4: Make the three router edits**

Re-read the router, then make the three edits. Do not touch `<intake>`, `<routing>` or `<validation>`.
Expected: the router is under 500 lines, has the same XML tags, no headings, and edits 2 and 3 name `skill/.entries/`.

- [ ] **Step 5: Hand off**

Report the three paths, the section titles added, and anything you could not state because the design does not say it. Do not run `node scripts/qa.cjs` or `openspec validate`.
Expected: nothing outside the three files changed.

---

### Task 4: Structure Tests and the Allow-list

**Files:**

- Create: `tests/entry-skills.test.cjs` (checks 1 to 6 and 8)
- Create: `tests/entry-names.test.cjs` (check 7 alone)
- Modify: `tests/claude-code-surface.test.cjs` (only if `add-web-capability-skills` T3 has landed; T0 says whether)

**Interfaces:**

- `tests/helpers/skill-surface.cjs` is NOT edited (D10, design 7.5). The index keeps every name the eight front-door tests read.
- **One constant list of names.** `tests/entry-skills.test.cjs` holds the ONE constant list of the five entry names (`dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`); checks 1, 5 and 8 use it, and nothing else in the repository repeats it except the allow-list in the surface test, which names no entry (next point).
- The allow-list check in `tests/claude-code-surface.test.cjs` changes from "the `SKILL.md` files under `skill/` outside `upstream` folders are exactly `skill/SKILL.md`" to "outside `upstream` folders, every `SKILL.md` other than `skill/SKILL.md` lies under `skill/.entries/<folder>/` and is named `SKILL.md`"; the walk does not skip dot folders. It is a folder rule with no names, so the exact names stay in the one constant list above. If T3 of `add-web-capability-skills` has not landed, edit nothing there: check 1 below carries the exact allow-list alone, and T4 states this contract in its hand-off for the owner of that T3: "the only `SKILL.md` files outside `upstream` folders are `skill/SKILL.md` and `skill/.entries/<name>/SKILL.md` for the five entry names; the walk includes dot folders".
- Both new files follow the neighbours' style (`node:test`, `node:assert/strict`). Each check is a small function that takes text or a file list and returns a list of problems. The tests assert an empty list on the real files, and a non-empty list on a broken sample (the case in the table). They read no phrase of prose and pin no wording. Check 7 lives alone in `tests/entry-names.test.cjs`, so that T5 can delete the whole file when the tool list's own `SKILL_NAMES` check replaces it. Both need T2's files.
- **Check 7 parsing rules** (design 9.4 item 7, copy them into the test's comments). Every `designer-pipeline <command> [<action>]` written in the index or an entry names a command that the CLI help lists and, when an action is written, that action word appears in a help line of that command. The parsing is loose on purpose, because the help packs several commands on one line: split each help line at `|` and at spaces; take the word after `designer-pipeline` as the command and the next word as the action unless it starts with `-` or `<`; accept a command that starts a help line or follows a `|`. It catches misspelt or invented words such as `film edit`; the tool list's own check is exact and replaces it. The help text comes from running `designer-pipeline --help` (as `tests/film-project.test.cjs` does). The test also runs the loose parser on the real help text (it must accept every command and action word the entries and the index use) and on a copy of an entry with `designer-pipeline film edit` put into it (it must refuse that copy). The parser only reads the shape `designer-pipeline` followed by a space and a word, so the locator sentence ("`designer-pipeline` means `node scripts/designer-pipeline.cjs` run from there") must give no false hit; T4 reports if the real locator sentence trips it.
- **Check 8 is a command shape** (design 9.4 item 8, copy it into the test's comments): the index table names each entry and the fallback path `.entries/`; every `references/...` path named in the index or an entry exists; and neither the index nor any entry contains (a) `designer-pipeline route` or `designer-pipeline.cjs route` followed by an option (a word starting with `-`), or (b) a line inside a code fence that starts with `designer-pipeline route` or `node scripts/designer-pipeline.cjs route`. Plain prose such as "Run `route` to pick a command" passes. The test has a self-test: a copy of an entry with a fenced `designer-pipeline route --query x` line must fail, and the prose sentence must pass. Check 8 stays after T5, because the tool list does not stop an entry from naming `route`, which is an active command.

The eight checks and one broken-input case each (checks 1 to 6 and 8 go in `tests/entry-skills.test.cjs`; check 7 goes in `tests/entry-names.test.cjs`):

| # | Check (design 9.4) | Broken-input case that must give a problem |
| --- | --- | --- |
| 1 | **Files.** The `SKILL.md` files under `skill/` outside `upstream` folders are exactly `skill/SKILL.md` and `skill/.entries/<name>/SKILL.md` for the five names of the constant list; each entry folder holds only `SKILL.md`; the walk includes dot folders | a temporary tree with an extra `.entries/dp-extra/SKILL.md`; another with a second file in an entry folder (including a marker file); another with a missing entry; another with a stray `SKILL.md` inside a dot folder |
| 2 | **Frontmatter.** The first line is `---`; the keys are exactly `name` and `description`, each on one line; `name` equals the folder name (index: `design-pipeline`), is lower-case letters and digits joined by `-`, at most 64 characters | a sample with a third key (`license`); a `name` that differs from the folder; an upper-case name; a name with an underscore; a name of 65 characters; a first line that is not `---`; a description that runs onto a second line |
| 3 | **Characters.** The description has 1 to 1,024 characters and one line; no colon followed by a space; no colon at the end; no space then `#`; no `<` or `>`; no backtick | a description of 1,025 characters; an empty one; one with `a: b`; one ending with a colon; one with a space and then a hash sign; one with `<`; one with a backtick |
| 4 | **Shape.** The first sentence (the text up to the first period followed by a space, or to the end) has at most 80 characters; one sentence starts with `NOT for`; at least three double-quoted phrases (the index two), at least one with a Chinese character and at least one with Latin letters. The test checks that `NOT for` is there and where, not what follows | a first sentence of 81 characters; a description with no period at all and 81 characters; no `NOT for` sentence; an entry with two phrases; phrases with no Chinese character; phrases with no Latin letters |
| 5 | **No copied phrases.** The double-quoted phrases, compared without regard to case, are different across the index and all five entries | two samples that share one phrase, written in different case |
| 6 | **Size.** Each entry has at most 6,144 bytes and the index at most 5,120 bytes; each has fewer than 500 lines | an entry text of 6,145 bytes; an index text of 5,121 bytes; a text of 500 lines |
| 7 | **Command names** (`tests/entry-names.test.cjs`). See the parsing rules above | `designer-pipeline film edit ...` (an invented pair); `designer-pipeline nosuchcommand`; a known command with an action word that is in no help line of it; a copy of a real entry with `designer-pipeline film edit` put into it |
| 8 | **Names and command shape.** The index table names each entry and the fallback path `.entries/`; every `references/...` path named in the index or an entry exists; no `route` command shape in the index or an entry (see above) | an index sample with one entry name removed; one without `.entries/`; a `references/missing-file.md` path; an entry copy with a fenced line `designer-pipeline route --query x`; an entry copy with inline `designer-pipeline route --query x`; an entry copy with `designer-pipeline.cjs route -x`. The prose sentence "Run `route` to pick a command" must give NO problem |

- [ ] **Step 1: Read T2's files and the neighbours**

Read the six files T2 wrote, `tests/claude-code-surface.test.cjs`, `tests/film-project.test.cjs` (its `--help` reading), and design 9.4.
Expected: you can say how each check finds its input.

- [ ] **Step 2: Write the checks in two files**

Write checks 1 to 6 and 8 in `tests/entry-skills.test.cjs` (with the one constant list of names at the top) and check 7 alone in `tests/entry-names.test.cjs`, with the broken-input cases of the table. Name each test after its check number and title. Do not assert on prose. Do not add either file to the manifest (T6 does).
Expected: 7 real-file tests in the first file and 1 in the second, each with its own broken-input test, and the check 8 self-test (fenced line fails, prose passes).

- [ ] **Step 3: The allow-list**

If T0 said `add-web-capability-skills` T3 has landed, change its one check as in the Interfaces. Otherwise leave the file alone and say so.
Expected: at most one check changes in `tests/claude-code-surface.test.cjs`, and it names no entry.

- [ ] **Step 4: Hand off**

Report the files, the case names, and the answer to "did T3 of the web-skills change land". Do not run `node scripts/qa.cjs` (the files are not in the manifest until T6 adds them) and do not run `openspec validate`. Optionally run a throwaway script outside the repository that calls your check functions on the real files and on the broken samples.
Expected: the case names match the table, and check 7 is only in `tests/entry-names.test.cjs`.

---

### Task 5: Tool-list Link (GATED on `add-capability-registry`)

**Files:**

- Modify: `scripts/tool-list.cjs`
- Modify: `tests/tool-list.test.cjs`
- Modify: `skill/references/tool-map.md` (generated by `node scripts/tool-list.cjs --write`, never by hand)
- Delete: `tests/entry-names.test.cjs` (the whole file, only after T4 has landed; the tool list's own `SKILL_NAMES` check replaces check 7). `tests/entry-skills.test.cjs` is not edited.
- Late case only (design 11): `scripts/test-manifest.json` (remove the line for `tests/entry-names.test.cjs`)

**Stop condition:** T5 starts only if all of these hold in the tree when it starts: `scripts/tool-list.cjs`, `tests/tool-list.test.cjs`, `scripts/tool-list.json` and `skill/references/tool-map.md` exist; `node scripts/tool-list.cjs --check` exits 0 before any edit; `checkSkillFiles` and `renderMap` exist in `scripts/tool-list.cjs`. If any one fails, T5 writes nothing and reports "gated: registry not landed" (or which condition failed). Then T6 goes on without T5 and `qa.md` and `tasks.md` state that T5 is pending, and the change is not called closed until T5 lands or the user says otherwise (design Q9).

**Interfaces:**

- No new field, no new list, no new rows in `scripts/tool-list.json`: entry files are found by their folder (`skill/.entries/*/SKILL.md`), not stored there.
- `collectInputs` also reads the five entry files. `checkSkillFiles` (`SKILL_NAMES`) checks the **commands** named in them like it does for `skill/SKILL.md`: every `designer-pipeline` command an entry names must be an `active` entry. It does **not** check the guide paths of the entry files against the list: the entries name guides that the list does not carry (`direction-preview.md`, `playground.md`, `reference-spec.md`, `qa-checklist.md`, `anti-slop-review.md`, `agent-interface.md`), and the registry limits guide entries to documents that `SKILL.md`, the router or `next` name. Check 8 of the entry test keeps checking that the paths exist. The rule that a front door names the three workflow guides keeps holding because the index keeps them.
- `renderMap` writes `## Ways to start` in `skill/references/tool-map.md`: one row per entry with its name, the first sentence of its description, and the commands and guide paths its text names, in the order it names them (the paths as plain text). It is computed from the entry files, so a changed description or hand-over table makes `MAP_STALE` ask for `node scripts/tool-list.cjs --write`. Place the section where the registry's map order allows (read its design section on the map) and say where.
- `tests/entry-names.test.cjs` (check 7) is deleted, because the tool list's own check replaces it. `tests/entry-skills.test.cjs` keeps checks 1 to 6 and 8 unchanged (check 8 stays because the tool list does not stop an entry from naming `route`).
- **Late case.** If T5 runs after T6 (the registry landed late), it is the first task of a follow-up: after the deletion it removes the manifest line of `tests/entry-names.test.cjs` from `scripts/test-manifest.json` and runs `node scripts/qa.cjs` itself, directly and once, on a quiet tree.

- [ ] **Step 1: Test the gate**

Check the four files and run `node scripts/tool-list.cjs --check`.
Expected: exit 0. If not, stop as above.

- [ ] **Step 2: Write a failing test**

In `tests/tool-list.test.cjs`, add cases: the five entry files are an input; an entry that names a command that is not an `active` entry gives `SKILL_NAMES`; an entry that names a guide the list does not carry (for example `references/direction-preview.md`) gives no problem; `renderMap` holds `## Ways to start` with one row per entry and the paths as plain text; a changed entry description makes the map stale.
Expected: the cases fail before Step 3 (by hand, not by running `qa.cjs`).

- [ ] **Step 3: Implement**

Edit `scripts/tool-list.cjs` as in the Interfaces, then run `node scripts/tool-list.cjs --write` to regenerate the map and `node scripts/tool-list.cjs --check` to confirm exit 0.
Expected: `--check` exits 0; the map shows `## Ways to start` with five rows; `scripts/tool-list.json` is unchanged.

- [ ] **Step 4: Delete the check-7 file**

Delete `tests/entry-names.test.cjs`. Do not touch `tests/entry-skills.test.cjs`. In the late case, also remove its line from `scripts/test-manifest.json`.
Expected: the file is gone, and no other file in the repository names it (in the normal case T6 adds no manifest line for it).

- [ ] **Step 5: Hand off**

Report the files, the map section's place, the deletion, and the `--check` exit code (in the late case also the `node scripts/qa.cjs` exit code). Do not run `node scripts/qa.cjs` or `openspec validate` in the normal case.
Expected: T6 has nothing left to edit in these files.

---

### Task 6: Registration, Changelog, QA and Smoke (integrator)

**Files:**

- Modify: `skill/references/package-resources.json`
- Modify: `scripts/test-manifest.json`
- Modify: `CHANGELOG.md`
- Create: `openspec/changes/add-task-entry-skills/qa.md`
- Modify: `openspec/changes/add-task-entry-skills/tasks.md` (tick boxes only)
- Modify: `openspec/changes/add-task-entry-skills/specs/entry-skills/spec.md` (only to write requirement 2 as a `MODIFIED` block, and only if `add-web-capability-skills` is archived by then; otherwise not touched)

**Interfaces:**

- `package-resources.json`: add five lines to `required`: `.entries/dp-create/SKILL.md`, `.entries/dp-reference/SKILL.md`, `.entries/dp-preview/SKILL.md`, `.entries/dp-review/SKILL.md`, `.entries/dp-resume/SKILL.md`.
- `scripts/test-manifest.json`: add one line for each new test file that exists when T6 runs: `tests/entry-skills.test.cjs`, and `tests/entry-names.test.cjs` unless T5 already deleted it (`tests/helpers/fail-nth-rename.cjs` is a helper and needs no line).
- `CHANGELOG.md` under `[Unreleased]`: an Added entry (five task entry skills in `skill/.entries/`, the installer fan-out with `entries` in its result, and the install marker `.installed-by-design-pipeline.json`) and a Changed entry (the index `skill/SKILL.md` now starts with a task table, its loop and tables moved to `dp-create`), each naming `add-task-entry-skills`. Say that the installer does not remove an entry that a later release drops or renames, and that it never replaces an entry folder it did not install.
- `qa.md` follows `openspec/changes/add-web-treatment-and-section-briefs/qa.md`: Conformance (verified), Open questions and answers, Visual Acceptance (not applicable: nothing here is a page or a film), Not verified (design section 14, plus the host table if T7 has not run). It also holds: **the final description texts of the six skills, copied from the entry files as they stand when T6 runs** (the files are the source, Global Constraints); the result of reading each entry against design 9.5 (six points, one line each); the help comparison; the list of files the change touched; the allow-list reconciliation; one sentence that `openspec validate add-task-entry-skills --strict` is a check of the spec format and not behavioural verification; and plainly that no real trigger run of any kind was made. Add T7's table when the person hands it over.

- [ ] **Step 1: Register and record the change**

Edit `package-resources.json`, `scripts/test-manifest.json` and `CHANGELOG.md` as specified.
Expected: the JSON files still parse; the five entry paths exist under `skill/`; one manifest line per new test file that exists.

- [ ] **Step 2: Read the entries against design 9.5**

Read each of the five entry files and the index against the six points of design 9.5: (1) the medium is asked at most once per entry, and never when project state holds it; with state, `next` is called without `--deliverable`; (2) each "Before you say done" holds what design 5.1 to 5.5 say (`dp-review` reports in two parts and lists the checks that did not run; `dp-preview` calls no `deliver`; `dp-resume` runs `resume` only after "continue"); (3) no entry calls `decide` unless `next` asked the question or offered the command in a `then` line (`next` does that for `decide --stage reference --answer none`, only outside replicate mode), records Visual Acceptance, or holds a keyword list; (4) each hand-over row names something that exists and points at a guide section instead of restating its list, and each entry has the parts of design 5.0 in order; (5) contracts are unchanged (Step 3); (6) the task words sit in the first 45 characters of each description (a reader looks at each first sentence). Write one line per point per entry in `qa.md`.
Expected: six points, all answered, any failure returned to T2 before Step 5.

- [ ] **Step 3: Check the contracts**

Run `node skill/scripts/designer-pipeline.cjs --help` and compare it with the copy T0 saved. List the files this change touched (use `git status` read-only) and confirm none is under `skill/scripts/` and none is a schema file under `skill/references/`.
Expected: the two help outputs are the same, or the difference is written in `qa.md` with its cause; the touched-file list is in `qa.md`.

- [ ] **Step 4: Reconcile the allow-list with the web-skills spec**

Compare this change's requirement "Entry skills live in a hidden folder and are the only extra SKILL.md files" with the spec of `add-web-capability-skills` (`specs/web-workflow`), whose rule says `skill/SKILL.md` alone. If that change is archived by now, T6 writes requirement 2 of `specs/entry-skills/spec.md` as a `MODIFIED` block for its requirement (T6 owns that file for this one edit only, and does not touch its other requirements). If it is not archived, record that the two must be reconciled at archive time.
Expected: the state is written in `qa.md`.

- [ ] **Step 5: Run the QA gate on a quiet tree**

Run: `node scripts/qa.cjs` (directly, no pipe or redirect into the repository, once).
Expected: exit 0. It proves: the archive holds the five entry files and the index and is the same bytes twice; the packaged installer installs the main skill and, through the installer test, the five entries beside it and refuses a second install without `--replace`; the structure checks; the front-door tests still pass; the test manifest lists the new test files; the repository status is unchanged after the run. This is the first run that has both T1's real-`skill/` assertion and T2's files. On failure, return the failing file to its owner (T1 to T5), wait for the fix, rerun.

- [ ] **Step 6: Validate the change**

Run: `openspec validate add-task-entry-skills --strict`.
Expected: valid. This is a spec-format check, not behavioural verification.

- [ ] **Step 7: Smoke the packaged install**

Package with `node scripts/package.cjs --output-root <temp dir outside the repo>`. Extract the tgz. Run the packaged `scripts/install-local.cjs` (from the extracted `design-pipeline/`) into a temporary skills root. Confirm the index and the five entry folders each exist exactly once: the root holds `design-pipeline`, `dp-create`, `dp-reference`, `dp-preview`, `dp-review`, `dp-resume`, each with its `SKILL.md` and its `.installed-by-design-pipeline.json`, and `design-pipeline/.entries` holds the five sources. Then, if Codex is installed, list that root with the `skills/list` probe of design Appendix A (temporary `CODEX_HOME` whose skills folder is that root) and write down the names Codex lists.
Expected: six folders, no duplicates; Codex lists each of the six once and no `.entries` copy (or "Codex not installed").

- [ ] **Step 8: Write `qa.md` and tick the tasks**

Record the exit codes and the smoke output as observed, the final description texts, T5's state (landed or pending), and the allow-list state (T4). Leave the host table to T7: mark it pending with no person named, and say that the names stay draft until it runs. Tick the boxes of `tasks.md` that are done.
Expected: `openspec validate add-task-entry-skills --strict` is still valid after the last edit.

---

### Task 7: Host Run (a person)

**Files:** none in the repository. T7 writes nothing there. The person hands a results table to T6, who puts it into `qa.md`.

**Interfaces:**

- The sentences to run, by section of the design (do not copy them here): design 9.1 (30 sentences, each for one entry; rows 26 to 28 were changed so that a `dp-resume` sentence names the film, the project or the page); design 9.2 (the near-misses N1 to N24, plus the five sentences "outside the tools" listed under that table: no `dp-` skill should load, or one entry may load and say plainly that the tools do not do this job, and none may start a `next` project); design 9.3 (7 boundary rows).
- **The first row on Claude Code is "I need a promo film"** (9.3, row 7). Record which skill loads: the index or `dp-create`. Claude Code drops the descriptions of the least-used skills first, so the older index may keep its description while the new entries are shown by name only.
- Procedure (design 9.4): install the entries into each host's real skills folder. With a normal install use `node scripts/install-local.cjs --root <folder>`. **On a linked install (as on this machine, where `~/.agents/skills/design-pipeline` is a link) skip the installer** and copy or link each `.entries/<name>` folder to `<root>/<name>` by hand (design 7.4). Then, **for each sentence, open ONE fresh session in an empty folder**, so an earlier answer cannot steer the next; paste the sentence; write down the skill the host loaded (omp: the `skill://` read or the `/skill` line; Claude Code: the first `Skill` call in the transcript; Codex: the `SKILL.md` it opens). A row passes when exactly the mapped entry loaded; a near-miss passes when no `dp-` skill loaded. Record host version, skill count and each row. A failing row is fixed in the description of the entry that lost it (in the entry file, Global Constraints), then the failing row and all near-misses run again.
- Also record, per host: that the fallback sentence works for someone who copied `skill/` by hand (open `.entries/<name>/SKILL.md` and follow it); that the names read plainly when only the name is shown; whether `dp-reference` and `dp-preview` are worth their place once used (they are kept on trial until this run, design 4). **The names are confirmed only after this run** (design Q3).
- A bare "what is the next step?" does not select `dp-resume` by design; the user can type `/dp-resume`, or name the film, edit or page.

- [ ] **Step 1: Install on each host**

Use one skills folder per host (Codex `~/.codex/skills`, omp `~/.agents/skills`, Claude Code `~/.claude/skills`), by the installer or by hand as above.
Expected: six folders in each.

- [ ] **Step 2: Run the sentences**

On Claude Code run "I need a promo film" first. Then run design 9.1, 9.2 (with the five outside-the-tools sentences) and 9.3 on each host, one fresh session per sentence.
Expected: a table with host, sentence number, skill loaded, pass or fail.

- [ ] **Step 3: Hand the table to T6**

Give the table and the notes of the Interfaces to the integrator, with the host versions and a line on whether each name is confirmed.
Expected: `qa.md` holds the table, or says the run is pending.

---

## Named follow-ups (not tasks of this plan)

`openspec/changes/add-task-entry-skills/tasks.md` carries these in its section "Named follow-ups". None is done by this change and none is a slice T0 to T7.

- **L3** Trigger files, one per skill, in the change folder (not under `skill/`): realistic positive and negative queries for each skill.
- **L4** Optional description runs with skill-creator's `run_eval.py` and `improve_description.py`; they could not run here (Windows `select` failure, `claude` logged out).
- **L5** A confuser table (9.2b) of sentences that fit a `dp-` entry and also a skill installed on a user's machine.
- **L6** The index claim and the first host row: the wording fix is done in the design; the first Claude Code row of T7 is "I need a promo film".
- **L7** `quick_validate.py` is not a repo gate; set `PYTHONUTF8=1` if someone runs it by hand.
- **L8** One sentence in `tasks.md` that `openspec validate add-task-entry-skills --strict` checks the spec format, not behaviour.

---

## Acceptance

- `openspec validate add-task-entry-skills --strict` reports valid. This is a spec-format check, not behavioural verification.
- `node scripts/qa.cjs`, run directly, exits 0.
- The smoke of Task 6 Step 7 shows the index and the five entry folders, each exactly once, after a packaged install into a temporary root.
- `git status` shows changes only in the files owned by Tasks 1 to 6 (including `tests/entry-names.test.cjs` unless T5 deleted it), this plan, and the other new documents of this change (`openspec/changes/add-task-entry-skills/` and `docs/superpowers/specs/2026-09-30-task-entry-skills.md`). It shows nothing under `skill/scripts/`, no schema file under `skill/references/`, and no change to `tests/helpers/skill-surface.cjs`.
- Nothing in this list shows which skill a real host or model picks for a sentence. Only the person's host run (T7) does, for the hosts and sentences it covers.

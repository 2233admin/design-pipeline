# Tool list (spec, draft)

Status: draft, awaiting approval (2026-09-30). Nothing here is approved yet.

The change ships as the OpenSpec change `openspec/changes/add-capability-registry/`. This document is the summary and the place to answer the open questions. `design.md` of the change holds the decisions and rules, and `appendix-command-rows.md` holds the exact rows. Step 1 (`fix-tool-guidance-errors`) must be committed first; it is not yet. `add-web-treatment-and-section-briefs` is committed (`b631fcd`). The change id keeps the working name of the first draft; here the list is the **tool list** and the readable page made from it is the **tool map**.

Words used below, in plain terms:

- **Entry command**: a command that tells you what to do next. There are three: `next` (with `decide`), `route` (with `toolchain` and `execution`) and the OpenSpec change commands `status`, `plan`, `run`. You called them routers.
- **Stage**: one step of a workflow, such as `plan`, `build` or `check`. Each deliverable (`film`, `edit`, `web`, `ui`) has its own stages, written `film:check`.
- **Alias**: another spelling of the same command or script, kept so old habits still work.
- **Kind**: what a tool does. A *checker* checks something and reports problems; a *generator* makes files; an *evidence-capture* tool records what a page or film really does; an *evaluation* scores a result; a *creative guide* is advice for the maker; a *maintainer-release* tool is for the people who maintain the skill; a *vendored-upstream* tool is copied from an outside project.
- **Repo skill**: `.claude/skills/design-pipeline/SKILL.md`, the file Claude Code reads when it works on this repository. `SKILL.md` alone means `skill/SKILL.md`, the first page of the shipped skill.
- **Command table**: the list inside `cli-core.cjs` that maps each command to the code that runs it (its handler).
- **Export**: a function that a file offers to other files. This plan adds none to shipped code; question 14 asks about one.
- **Wrapper script**: a small script that only runs one command, kept next to it (for example `check-ui-ir.cjs` for `ui-ir check`).
- **Dispatcher**: the code in `cli-core.cjs` that picks which handler runs a command. After T6 it also refuses an action that the command table does not list.

## Problem

Someone who starts a design job is told where to go by five places, and they do not agree.

- `skill/SKILL.md` names a few guides.
- The `next` command names 10 of the 142 commands.
- The help lists 141 of them in one long list that a person writes by hand.
- The repo skill names other guides than `next` does: film work goes to `product-film-direction.md`, edit work to `film-edit.md` and web work to `pipeline-reference.md`, while `next` sends the author to `workflow-film.md`, `workflow-edit.md` and `workflow-web.md`. Step 2 fixes the three route bullets (task T4, the pointer edits), and a check keeps them fixed.
- Three entry commands use three sets of stage words: `next` and `decide` (the workflow stages), `route` (11 jobs) and the OpenSpec change commands (phases).

You asked for one list of "which tool or guide, at which stage". Not everything is shown to authors. This change gives one checked list of what exists and where it is taught. `next` and `--help` stay the source for what they say; a test keeps the list and them in step. The readable stage map is made from that list, so it does not become a fourth entry command.

## Approach

The **tool list** is one JSON file, `scripts/tool-list.json`: one list of commands, standalone scripts and guides. It has one **entry** for each row that `--help` lists (141) and for `source add`, the one command the help leaves out (142 commands in all), the 11 standalone scripts that have no command, and 15 guides (168 entries). It never decides anything, and no command reads it while it runs. It says what exists, who is shown it and where it is taught. It lives in the repository next to its script and is not shipped; only the readable map made from it ships. One test then checks the other surfaces against it, and a small script writes the readable map from it.

Words used below:

- Every entry has two labels. `status` says whether it is alive: `active`, `alias`, `deferred` or `removal-candidate`. `exposure` says who is shown it: `public` (`skill/SKILL.md`, the repo skill, a `next` action or a workflow guide sends you there), `expert` (it works and the map lists it, but you pick it up yourself) or `internal` (for maintainers, release, QA or helper work; left out of the author map). Only six combinations are allowed, and the check rejects any other.

| Piece | What it is |
| --- | --- |
| `scripts/tool-list.json` | The list. Each entry: id, one official command, script or guide, kind, who uses it, deliverables, stages, the two labels, a map heading, a plain summary, the guide to read (a file, or a file and one heading of it), other spellings, a reason when it is hidden. |
| `skill/references/tool-map.md` | The readable stage map, written from the list. Never edited by hand. The only new shipped file. |
| `scripts/tool-list.cjs` | A script for maintainers: `--check` reads and checks, `--write` writes the map. Not shipped. No new `designer-pipeline` command. |
| `tests/tool-list.test.cjs` | The test that `node scripts/qa.cjs` runs. |
| One small shipped-code change | `skill/scripts/cli-core.cjs`, about 45 lines (task T6, your yes to question 14): the command table lists every action (and says "none" for the ten commands that take none), the dispatcher refuses an action it does not list and a stray word after `next` or `decide`, and `commandPaths()` exports the rows. The script reads the rest through what shipped modules already export: the help text, the stage lists of `film`, `edit` and `web`, and `next` itself for `ui`. |
| Small edits | One bullet in `skill/SKILL.md`; in the repo skill, the three route bullets now name the workflow guides and one line points at the map; one paragraph in `CONTRIBUTING.md`. |

Not added: a new pass/fail check (gate), proof record (receipt), schema file, stage, command, flag or entry command, and no edit to any shipped script except the command table of `cli-core.cjs`. The help and the `next` texts stay written by hand; they are checked against the list, not generated from it.

## What the investigation found

Observed on this machine on 2026-09-30, not assumed. A "prototype" is a throwaway script outside the repository.

1. **None of the four existing lists can hold this.** `job-registry.json` maps your words to 11 jobs, and its schema forbids extra fields. `pipeline-phases.json` is the state machine of an OpenSpec change. `component-capabilities.json` is a vocabulary of interface behaviours. The command table holds functions, lists the actions of only 22 of its 52 entries, and has room for neither guides nor scripts.
2. **The help can be read by a program.** A prototype of about 30 lines turns the 73 help lines into 141 command paths: the 142 rows except `source add`, which is a stub that always refuses and is not in the help.
3. **`next` names only 10 commands, and which ones depends on files in the project.** Running every stage once on an empty project and once on a project that has every file the stages look for shows all 10 commands, for every tier and for both modes I tried (`brief` and `replicate`; `freeform` gives the same stage lists as `brief`).
4. **Command examples can be checked.** The text `designer-pipeline <command> <action>` appears 116 times in the 155 files the check covers. One command in it is wrong, and it appears three times: `film edit`, the mistake that step 1 fixes. A wider first version of the rule had two false alarms; the final rule has none.
5. **The checks fail when they should.** In the prototype, 16 mistakes I introduced on purpose (for example renaming `film check` in the list, taking a stage away from `decide`, marking `film check` as "expert", pointing a `guide` at a heading that is not there, declaring an action that the handler does not have, leaving a real action out of the table, leaving `next` without its empty list) were each caught, with a message that names the command or the file.
6. **`SKILL.md` is small and its size limit is not tested.** `skill/SKILL.md` is 4,108 bytes (76 lines) against a limit of 5,120 that only some change documents mention.
7. **Two commands are used nowhere.** `verify --gate artifact` and `verify --gate plan`: I searched the tests, the shipped guides, the README, the job list and the specs and found no use, and the control runtime already runs both checks inside `run`. `verify --gate state-coverage` looks similar but implements a gate that a spec requires, so it stays.
8. **Step 1's draft changed one of my assumptions.** I first assumed step 1 removes the advice to run `composition capture` and `verify composition` after `film check`. Step 1's draft (I read its spec and design; its final files are not written yet) keeps it as an optional step, because the frame-layout step of `film check` reads pixels only and the extra step adds five text checks. So those two commands are not "part of" `film check`; they are public, optional, and named in the film guide.
9. **Two reviews found real mistakes in my first version, now fixed.** A stress test of the plan against the code found a check that my own repo skill edit would have failed, a map that left out a guide with no stage, and tests that could not show most rules fail. A fact check of the rows found three wrong evidence letters and a few summaries stated too firmly.
10. **One export is missing, and question 14 adds it.** Everything else the script reads is already exported: the help text, `execute`, `next` and the stage lists of `film`, `edit` and `web`. `ui` has no stage module, so the prototype read its two stages by running `next` (`work` at the quick tier, `intake` then `work` at standard and full). The command table is not exported, and `execute` refuses an unknown option before it looks up a command and has no dry run. So the first prototypes took the command list from the help, and proved the one command the help leaves out, `source add`, through `execute` (it answers `COMMAND_DEFERRED`). That could not see a help line and a list entry that agree on an invented action. All 16 deliberately broken inputs (11 for the checks, 5 for the table) were caught, for example a renamed `film check` through the help.
11. **What proves the 90 actions that hide inside handlers.** 18 of the 20 handlers compare the action with quoted names, and those names are exactly the rows of the appendix; the other two hand over to a module that has its own list. None prints the actions it accepts, so an error cannot be used to list them. Three of them (`change`, `component-first`, `component-first-v2`) and `verify --gate` read one option before they look at the action, so a wrong name hides behind "option required" unless the test gives that option. With it, 20 of 21 cases answer "unknown" to a made-up action, which is what lets a test see a wrong name. 68 of the 90 rows are named in some test file (a text search). Trying the change on a copy in the temp folder: about 45 lines changed; 151 cases (every name, a made-up action, no action, each gate) answer the same before and after except 5, all of them a made-up action. `next` and `decide` read only options and used to ignore a stray word (`next zzz` ran `next`; `decide --stage intake --answer looks good` recorded `looks` and dropped `good`); nothing in the tests, the guides, the README or the commands that `next` prints passes one. Ten legitimate calls with every documented flag answered identically before and after.

## The six classes on the 142 commands

An earlier design review asked for six groups. I call them classes so the word "group" can stay for the headings of the map. Each class is one allowed pair of the two labels.

| Class | How the list says it | Commands |
| --- | --- | --- |
| Public workflow action: `skill/SKILL.md`, the repo skill, a `next` action or a workflow guide sends you there | active + public | **16** |
| Expert or manual tool: works and is listed, you pick it up yourself | active + expert | **87** (10 of them have no guide yet) |
| Internal dependency: maintainers, release, QA, helper work; left out of the author map | active + internal | **33** |
| Alias: another spelling of an active command | alias + internal | **3** |
| Deferred stub: refuses to run | deferred + internal | **1** |
| Removal candidate: a maintainer decides; nothing is removed here | removal-candidate + internal | **2** |
| **Total** | | **142** |

By kind: 45 checkers, 39 generators, 19 maintainer-release, 18 vendored-upstream (copied from an outside project), 9 evidence-capture, 8 creative-guide, 4 evaluation. Across the whole first list (168 entries): public 31, expert 94, internal 37, alias 3, deferred 1, removal candidate 2.

The rows behind these counts are in the appendix, with the evidence for each row and a watch list of the rows that need your decision.

## Decisions

Each can be reversed. The reason is in `design.md` section 3.

| # | Decision | Reason in one line | Reversed by |
| --- | --- | --- | --- |
| D1 | One new JSON file, next to its script and not shipped (only the map ships); the four existing lists stay as they are | None of them can hold guides, scripts and 142 rows without breaking its own contract; the file is about 84 KB and only the script and the test read it | Q2 |
| D2 | Entries describe and never decide | That is what keeps the list from being a fourth entry command | Q1 |
| D3 | Two labels, six allowed pairs | "Is it alive" and "who is shown it" are different questions | Q3 |
| D4 | "Internal" only for maintainer, release, QA and helper work; undocumented author tools are shown as "no guide yet" | The help lists them, so hiding them would give two answers | Q4, Q5 |
| D5 | Stages are the workflow's own, written `film:check`, only on public entries | The tests can prove a stage claim; they cannot prove "used on demand" | none |
| D6 | Checks are one-way where the facts are one-way | A wording change in a guide must not fail QA | none |
| D7 | The map is written by a repository script | No new `designer-pipeline` command | none |
| D8 | Help and `next` texts stay hand-written and are checked | Generating them needs a second list (of every flag) or changes texts that tests compare exactly | Q1 |
| D9 | One small change to shipped code: the command table lists every action | The script reads what is already exported but cannot reach the command table. About 45 lines in `cli-core.cjs` fix that and make the list exact, because the dispatcher then refuses any action the table does not list, and any stray word after a command that takes none (Q14, your yes) | Q14 |
| D10 | The three entry commands are not merged | Merging changes what `next` and `route` do | Q1 |
| D11 | 15 guide entries, not all 68 guides | Nothing routes from the list, so leaving the other guides out hides them from no one | none |
| D12 | Wrapper scripts are recorded as other spellings, not as entries | 21 of them repeat a command; ten have no reference at all | Q6 |
| D13 | Every check is a function that the test also runs on a broken input | A check that only runs on the real repository could be broken and stay green | none |
| D14 | Every script that starts with `#!` is accounted for | A new script cannot appear without someone saying what it is | none |
| D15 | The tool list comes before the web capability skills | Step 2's own review: do not add routing while three lists disagree | none |

## The checks on one page

One new test, run by `node scripts/qa.cjs`. Every failure names the command, file or stage that disagrees. Each check is also run on a deliberately broken input and must report its own code.

- **The list is valid**, and about 23 broken copies are each rejected with their own code (a `guide` that points at a heading the file does not have is one of them).
- **Commands, help and jobs.** The help names exactly the entries that are not stubs, and the stub is shown to refuse to run. Every command the job registry names is alive and shown.
- **The command table.** It gives exactly the command entries of the list (142 rows), and each listed action of the 20 handler commands is recognised by its handler (84 rows are run in empty temp folders; none may answer "unknown"). An action or gate that the table does not list is refused before the handler runs.
- **`next`.** Every command, guide and stage that any `next` action names is in the list, public, and placed at that stage by the list.
- **Every public command is named** by a `next` action or by its stage in the workflow guide, and **every public guide** by `SKILL.md`, the repo skill or a `next` action.
- **`skill/SKILL.md` and the repo skill** name only guides and commands that are in the list, never an alias or a removal candidate, and each names the workflow guide of film, edit and web.
- **Command examples resolve** in the scripts and the shipped guides.
- **Every script that starts with `#!`** is an entry, a spelling of one, or on a short list of scripts that other commands start.
- **The map is current.** A hand-edited or stale map fails, and the message names the command that writes it again.

No test reads the wording of a guide. No test says that a summary is true.

## Open questions (defaults in bold)

1. **Merge the three entry commands now?** **No, not now.** Merging changes what `next` and `route` do, so it needs its own change and its own tests. Revisit it if any one of these happens:
   - the checks fail twice in two releases because two entry commands disagree;
   - a real run or an evaluation shows an author using `route` where `next` was right, or the other way round;
   - evaluations for `next` on `edit`, `web` and `ui` exist and show routing failures;
   - `ui` gets real stages;
   - a maintainer has to edit three lists for one change more than once.

   Or merge now, as its own change.
2. **Where does the list live?** **One new JSON file in `scripts/`, next to its script, not shipped.** Or in `skill/references/` next to `job-registry.json` (it would ship about 84 KB that no command reads), or extend `job-registry.json` (its schema forbids extra fields and it exists to map words to 11 jobs), or a JavaScript module (harder for documents and tests to read).
3. **Two labels (`status` and `exposure`) with six allowed pairs?** **Yes.** Or one field with six values. Two labels keep "is it alive" apart from "is the author shown it", and the check enforces the six pairs either way.
4. **The 10 tools with no guide yet** (`evidence check`, `verify --gate state-coverage`, `patterns search`, `toolchain receipt-check`, `execution finalize`, `adapter receipt-check`, `tokens check`, `ui-ir check`, `design-code-map check`, `film capture-timeline`): **shown, in a section called "No guide yet".** Or hidden as internal (the help would still list them, so the two would disagree), or write guides first.
5. **`doctor`.** **Hidden from authors:** it checks the package. Or shown, because an author with a broken install needs it.
6. **The two removal candidates**, `verify --gate artifact` and `verify --gate plan`: **keep them for now; a maintainer decides.** Or remove them in a separate change, or write a guide and a test for each. The ten wrapper scripts that no file mentions are handled the same way.
7. **`foundation check`.** **The command is official, the two scripts that the guides teach are its other spellings, and the guides are fixed later.** Or the scripts are official.
8. **`component-first check` (version 1) or `component-first-v2 check`: which do authors run first?** **No default is stated; both are listed as expert tools.** `AGENTS.md` says to extend the version 1 gates, which points at version 1. Or name one.
9. **How far the command-example check looks.** **The scripts, `skill/SKILL.md`, the repo skill and the guide entries that are Markdown files.** It found 116 examples and one wrong command (three times). Or all 68 Markdown guides in `skill/references` (195 examples in the first, wider rule, with two false alarms).
10. **`docs/cli-and-reference-providers.md`.** **Not checked here:** step 1 adds its missing commands once. Or check it against the list too.
11. **A size test for `skill/SKILL.md` (5,120 bytes).** **Not here:** `add-web-capability-skills` plans it. This change adds one bullet of about 80 bytes. Or add the test here.
12. **May the person who writes the test run that one file by name?** **Yes.** `AGENTS.md` forbids only the bare `node --test`, and `qa.cjs` runs the same command. Or only through `node scripts/qa.cjs`, so nobody sees the test fail before the last step.
13. **Do the script and the list ship with the skill?** **No, both stay in the repository; only the generated map ships.** No command uses them while it runs. Or ship them so `doctor` could check the list later.
14. **Check the command table itself?** **Yes (your answer).** T6 changes one shipped file, `cli-core.cjs`, by about 45 lines:
    - the 20 commands that choose their action inside their own code (`change`, `verify`, `component` and 17 more) list their actions in the command table, as the other 22 already do;
    - the ten commands that take no action (`doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package`, `route`, `next`, `decide`) say so with an empty list;
    - the dispatcher refuses an action, or a `verify --gate` value, that the table does not list, and a stray word after a command with an empty list (`next` and `decide` included, as the other eight already do), before the handler runs;
    - a new export, `commandPaths()`, gives every command and action of the table.
    - **What it proves.** Every command and action that the CLI accepts is in the table; the dispatcher refuses anything else, a stray word after `next` or `decide` included. The tool list, the table and the help agree row for row (`source add` is in the table and the list and not in the help). The handler of each listed action recognises it, for 84 of the 90 rows that used to be hidden: the test runs each in an empty temp folder and requires that none answers "unknown". A help line and a list entry can no longer agree on an invented action.
    - **What it does not prove.** That an action works: only that it is recognised (68 of the 90 rows are named in some test). That `designmd sync` is recognised: it may use the network, so it is read in the code and not run. The 5 `component-first` rows are compared with the module's own list instead of run. That the test can see a wrong name in every handler was measured in the trial (20 of 21 cases) and cannot be repeated by the permanent test. That the old wording of the refusals is gone: no test asserts it.
    - **What a user sees.** Only the answer to an action that is not listed: the same code and exit code, but the words of the dispatcher (`unknown command: change foo`), given before the handler asks for its options. In the trial that is 5 of 151 cases; every listed action answers as before. And a stray word after `next` or `decide`, which used to be ignored, is now refused like the other eight action-less commands: `UNKNOWN_ARGUMENT`, exit 1, `next does not accept an action`. A call without a stray word answers exactly as before (ten legitimate calls with every documented flag, and the ten commands called alone, gave identical answers). Nothing in the repository passes a stray word to them. An unquoted answer of two words (`decide --answer looks good`) used to lose its second word without a message; it is now refused.
    - **Later, only if wanted:** rewrite the 20 handlers as one function per action (`split-command-handlers-by-action`, about 705 lines, with tests). A full list does not need it.

## What only you can judge

1. Whether each summary of a shown entry (103 commands, 7 scripts, 15 guides) is plain and true. The 16 public commands and the `film check` family were read against code, and a reviewer re-checked 45 rows; the rest come from the inventory and the help line.
2. Whether the 10 tools with no guide should be shown as "no guide yet", given a guide, or hidden.
3. Whether the generated map reads well to a new author. Only reading it end to end tells.
4. Which spelling is official for `foundation check`, and which version of `component-first` authors run first.
5. Removal: the two removal candidates and the ten wrapper scripts that no file mentions.
6. Whether the stage placement of each guide (for example `web-motion.md` at `web:build`) matches how authors really work.
7. Whether `verify composition` and `composition capture` stay public once step 1's wording is final.

## Sequence and cost

1. **T0, gate:** confirm that step 1 is committed (the web change is), and read three rows again against step 1's final wording.
2. **In parallel:** T1 the script (no shipped code changes); T2 the list; T4 the small edits (`skill/SKILL.md`, the repo skill, `CONTRIBUTING.md`); T6 the command table change (about 45 lines in `cli-core.cjs`, after step 1 is committed, because step 1 edits the same file).
3. **T3:** the test, the map and the map's line in the package list, after all four.
4. **T5:** write the changelog and `qa.md`, delete the three prototypes, run `node scripts/qa.cjs` once.

No file has two owners. Estimates, not measured: a list of about 85 KB, a map of about 25 KB, a script of about 500 lines, a test of about 550 lines.

## Residuals found, not changed here

Ten wrapper scripts that no file mentions; four files that no route reaches (three guides and one schema; `vite-devtools.md` gets a link through the list); `pipeline-reference.md` (1,214 lines) repeats four smaller guides; the gates of the control phases have no writer, so `run` past a gated phase was read in code and not run; the routing evaluations cover `route` only and nothing evaluates `next` for `edit`, `web` or `ui`.

## Not verified

Nothing is implemented, and `node scripts/qa.cjs` has not run with the new files. The prototypes ran first at `bbf7fa4` with the web edits uncommitted and again at `b631fcd` (the web change committed), on Windows, with the same numbers; they use only what shipped modules already export, and three of them are in the change folder (`prototypes/`). Step 1 is written and not committed, and none of its edits exists, so I read its documents, not its final files. The prototype models the T4 edits of the two `SKILL.md` files in memory; the real edits were not made. `designmd sync`, `film blocks` and `source audit` were read in code and not run. The summaries of expert commands were checked against code only for a sample of 45 rows. Visual Acceptance does not apply.

## On approval

Answer the questions (or "default"). Make sure step 1 is committed (the web change is `b631fcd`). Run `T0`, then `T1`, `T2`, `T4` and `T6` in parallel, then `T3`, then `T5`. `add-web-capability-skills` follows and adds three guide entries.

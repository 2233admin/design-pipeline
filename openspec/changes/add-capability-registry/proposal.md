# Add a tool list

The change id keeps the working name of the first draft, `add-capability-registry`. In the text, the new list is the **tool list** and the readable page made from it is the **tool map**.

## Why

Someone who starts a design job is told where to go by five places, and they do not agree:

- `skill/SKILL.md` names a few guides and says "every command: `--help`".
- The `next` texts name 10 of the 142 command rows; the workflow guides add 6 more.
- `--help` lists 141 rows in one flat list that a person writes by hand.
- The repo skill, `.claude/skills/design-pipeline/SKILL.md` (the file Claude Code reads when it works on this repository), names other guides than `next` does. Its three route bullets send film work to `product-film-direction.md`, edit work to `film-edit.md` and web work to `pipeline-reference.md`, while `next` sends the author to `workflow-film.md`, `workflow-edit.md` and `workflow-web.md`. Task T4 changes the three bullets to name the workflow guides (`pipeline-reference.md` stays for `ui`), and a check keeps them that way.
- Three entry commands pick the next step, each with its own stage words: `next` and `decide` (the workflow stages), `route` (it picks one of 11 jobs from `job-registry.json`, the file that maps the user's words to jobs), and the OpenSpec change commands `status`, `plan`, `run` (they follow the phases of a change). The brief called them routers.

An inventory of the commands and guides found these problems:

- 25 command rows that no guide under `skill/references` names (three of them are named in `skill/evals/film/README.md`);
- four files that no route reaches (three guides and one schema);
- ten scripts that no file mentions;
- a `pipeline-reference.md` of 1,214 lines that four smaller guides mostly copy.

It also found plain mistakes, such as `film edit auto` printed as a next step when the command is `film-edit`, and `film check` described as smaller than it is. Step 1 (`fix-tool-guidance-errors`) corrects those. Nothing yet makes the same kind of mistake visible the next time.

An earlier design review gave the direction. A hand-written stage map would become a fourth place that tells authors where to go, and it would drift. So make one machine-readable list, check the other surfaces against it, and generate the readable map from it. The user asked for one list of which tool or guide to use at which stage, with not everything shown to authors. This change gives one checked list of what exists and where it is taught. `next` and `--help` stay the source for what they say, and the test keeps the list and them in step.

## What Changes

1. `scripts/tool-list.json`: one JSON list of 168 entries: one for each of the 142 rows of the command table (the 141 rows that `--help` lists, and `source add`, the one command the help leaves out), the 11 standalone scripts that have no command, and 15 guides (the 13 documents and the kit folder that `skill/SKILL.md`, the repo skill or a `next` action name, plus the generated map). It lives next to its script in the repository and is not shipped (`design.md` D1). Each entry says:
   - what it is (id, one official command, script or guide, kind);
   - who uses it (audience) and which deliverables it serves;
   - where a `next` action or workflow guide places it (stages, only for public entries);
   - whether the author is shown it and whether it is alive (exposure and status);
   - a map heading, a plain summary and the guide to read (a file, or a file and one heading of it);
   - other spellings, and a reason when it is hidden or retired.

   The list also names the six scripts that other commands start and nobody runs by hand.
2. The six classes asked for are applied to the 142 rows by two fields and six allowed pairs: 16 public workflow actions, 87 expert or manual tools (10 of them with no guide yet), 33 internal dependencies, 3 aliases, 1 deferred stub and 2 removal candidates. The exact rows are in `appendix-command-rows.md`.
3. `skill/references/tool-map.md`: the readable stage map, generated from the tool list and never edited by hand. It is the one new shipped file.
4. `scripts/tool-list.cjs`: a repository script that checks the tool list, reads the help, finds command examples and writes the map (`--check`, `--write`). It is not shipped and adds no `designer-pipeline` command.
5. `tests/tool-list.test.cjs`, in the manifest and run by `node scripts/qa.cjs`. It checks that:
   - the tool list is valid, and each kind of broken tool list is rejected (a `guide` that points at a heading that is not there is one of them);
   - the help and the job registry agree with it;
   - every command, guide and stage that `next` names is in the tool list and public at that stage, and every public command is named by `next` or its workflow guide (a public guide by `next`, `SKILL.md` or the repo skill);
   - `skill/SKILL.md` and the repo skill name only entries that are in the tool list, and each names the workflow guide of film, edit and web;
   - command examples in the scripts and the shipped guides resolve, and every script that starts with `#!` is accounted for;
   - the map is current;
   - each of these checks reports its own code when its rule is broken on purpose;
   - the command table gives exactly the command entries of the tool list (`commandPaths()`), the dispatcher refuses an action that the table does not list, and each listed action is recognised by its handler (`design.md` section 6, check b).
6. One small change to shipped code, in `skill/scripts/cli-core.cjs` only (task T6, about 45 lines). The 20 commands that pick their action inside their own code now list their actions in the command table, the ten commands that take no action say so with an empty list, the dispatcher refuses an action or `--gate` value that the table does not list and a stray word after `next` or `decide` (as it already does after the other eight), and `commandPaths()` exports the rows. That is what lets the test compare the tool list and the help with the table row for row, including the 90 rows whose actions used to exist only inside handlers. Nothing else under `skill/scripts` or `skill/adapters` changes. The visible effect is only the answer to an action that is not listed (the same code and exit code, other words, given before the handler reads its options) and to a stray word after `next` or `decide` (now refused with `UNKNOWN_ARGUMENT`, as after the other eight); a call without one answers exactly as before. The repository script and the test read the help, the stage lists and `next` through what shipped modules already export: `publicHelp` and `execute` (`cli-core.cjs`), `initState`, `nextAction` and `decide` (`workflow-core.cjs`), and the `stages` of the `film`, `edit` and `web` modules. `ui` has no stage module, so it is read by running `next` through its stages.
7. Routing and housekeeping: one bullet in `skill/SKILL.md`; in the repo skill, the three route bullets now name the workflow guides and one line points at the tool map; one paragraph in `CONTRIBUTING.md`; one file (the map) in `package-resources.json`, the list of files the package must contain; a `CHANGELOG.md` entry.

## Decisions taken

By the author, reversible, each with its reason in `design.md` section 3:

- **Where and how:** one new JSON file next to its script and not shipped, only the map ships (D1); not an extension of `job-registry.json`, `pipeline-phases.json`, `component-capabilities.json` or the command table; entries describe and never decide, so the tool list is not a fourth entry command (D2).
- **The six classes:** two fields with six allowed pairs (D3); `internal` only for maintainer, release, QA and plumbing work, and undocumented author tools stay `expert` with `noGuide` (D4).
- **Stages and checks:** stages written `deliverable:stage`, only on public entries (D5); one-way checks where the facts are one-way (D6); every check is a function the test drives with a broken input (D13); every script that starts with `#!` is accounted for (D14).
- **The map and the other surfaces:** the map is generated by a repository script (D7); help and `next` texts stay hand-written and are checked (D8); one small change to shipped code, in the command table (D9).
- **Scope:** the three entry commands are not merged (D10); 15 guide entries (D11); wrapper scripts are recorded as other spellings (D12); the tool list comes before the web capability skills (D15).

## Awaiting the user

Fourteen open questions with defaults are in `docs/superpowers/specs/2026-09-30-capability-registry.md`. Question 14 (check the command table itself) was answered yes; what T6 proves and what it cannot is in `design.md` section 11. The classification of the appendix is a proposal: which rows are shown, hidden or marked as removal candidates is for the user to read and change.

## What this change does not claim

It does not say any tool is good or that authors will choose better tools. The tool list says what exists, who is shown it and where it is taught, and the tests keep the other surfaces honest about it. It does not check that a summary is true. It does not prove that an action works: it proves that the command table lists the action, that the tool list and the help agree with the table, and that the action's handler recognises it; 6 of the 90 handler rows are not run (`design.md` section 11 says which, and what else is not proved). It was not implemented or run with the new files when this was written: the prototypes ran on the current tree, inside this change folder. Visual Acceptance does not apply; nothing here is a page or a film.

## Not in scope

- Merging the three entry commands, or giving `ui` more stages (`design.md` section 8 lists what evidence would justify it).
- Any change to a command, an option, `--help`, a `next` text or a gate; generating the help or `next` from the tool list.
- Removing anything: the two `removal-candidate` rows and the ten unreferenced wrapper scripts are only recorded.
- Rewriting the 20 handlers as one function per action (about 705 lines in `cli-core.cjs`, `design.md` section 11). It is the named follow-up `split-command-handlers-by-action`; a full list does not need it.
- Reorganising the 159 top-level files of `skill/references` (68 guides, 20 data files, 71 schemas) or the copies inside `pipeline-reference.md`; `docs/cli-and-reference-providers.md` (step 1 lists its missing commands once); a `.schema.json` file; usage counts.

## Builds on

`fix-tool-guidance-errors` (step 1; not committed yet, and it must be committed first), `add-web-treatment-and-section-briefs` (committed as `b631fcd`; it edited `skill/SKILL.md` and other files this change reads), `optimize-skill-progressive-disclosure` (`skill/SKILL.md`), `redesign-user-workflow` and `split-film-edit-workflows` (the stage lists), `add-job-dispatcher-route` and `stage0-job-plan-binding` (the job registry), `add-evidence-driven-design-runtime` (the change commands). `add-web-capability-skills` follows this change and adds three guide entries later: `references/web-treatment.md`, `references/web-review.md` and `evals/web/README.md` (exposure `internal`). The rule for that change is in `tasks.md`, "Rules for later changes".

# Tool list delta

## ADDED Requirements

### Requirement: One list holds the commands, standalone scripts and guides

The repository SHALL keep one JSON file, `scripts/tool-list.json`, with the schema id `design-pipeline.tool-list.v1`, the version `"1"`, an ordered list `groups`, a list `internalScripts` of `{ script, reason }` and a list `entries`. Every row of the command table (each command, each pair of a command and an action, and each value of `verify --gate`; these are the rows that `--help` lists plus `source add`, the one command that `--help` leaves out), every standalone script that has no command, and every guide that `skill/SKILL.md`, the repo skill (`.claude/skills/design-pipeline/SKILL.md`) or a `next` action names SHALL have exactly one entry. A guide is a file under `skill/` whose path ends in `.md`, or a folder whose path ends in `/`. Every script under `skill/scripts` whose first line starts with `#!` SHALL be the `official` script of an entry, be written in the `aliases` of an entry as `node skill/scripts/<file>`, or be listed with a reason in `internalScripts`. An entry SHALL have an `id`, an `official` object holding exactly one of `command`, `script` or `doc`, a `kind` (`creative-guide`, `generator`, `checker`, `evidence-capture`, `evaluation`, `maintainer-release` or `vendored-upstream`), a non-empty `audience` list (`author`, `reviewer`, `maintainer`, `internal`), a `deliverables` list (`film`, `edit`, `web`, `ui`), a `stages` list, an `exposure`, a `status` and a `group` taken from `groups`. The `id` of a command entry SHALL be its words joined by `-` (`verify --gate x` becomes `verify-gate-x`), the `id` of a script entry SHALL be `script-` followed by the file name without `.cjs`, and the `id` of a guide entry SHALL be `doc-` followed by the path of the guide under `skill/` without a leading `references/`, without the ending `.md` or `/`, and with each remaining `/` turned into `-` (`references/workflow-film.md` gives `doc-workflow-film`, `evals/web/README.md` gives `doc-evals-web-README`). Ids and `official` values SHALL be unique, no spelling in `aliases` SHALL equal the `official` value of another entry, and every `script` and `doc` SHALL exist (a `command` is checked against `--help`, see the requirement on the help text). The map SHALL be listed in `required` of `skill/references/package-resources.json`. The list file SHALL stay in `scripts/`, outside the folder that is packaged, so it is not shipped.

#### Scenario: The real tool list is valid

- **WHEN** the list file is checked
- **THEN** the check SHALL report no problem
- **AND** every row of `commandPaths()` SHALL have one entry (the rows that `--help` lists, and `source add`).

#### Scenario: An entry with two official forms is rejected

- **WHEN** an entry holds both `command` and `doc` in `official`
- **THEN** the check SHALL report the code `OFFICIAL_ONE` and name the entry.

#### Scenario: A repeated id or a repeated official form is rejected

- **WHEN** two entries share an `id` or an `official` value
- **THEN** the check SHALL report `ID_DUPLICATE` or `OFFICIAL_DUPLICATE` and name both entries.

#### Scenario: A script nobody accounts for is reported

- **WHEN** a script under `skill/scripts` starts with `#!` and is neither an official script, nor an alias, nor listed in `internalScripts`
- **THEN** the check SHALL report `SCRIPT_UNACCOUNTED` and name the file.

#### Scenario: The package carries the map

- **WHEN** `required` of `skill/references/package-resources.json` is read
- **THEN** it SHALL contain `references/tool-map.md`.

### Requirement: Each entry says whether it is alive and who is shown it

`status` SHALL be `active`, `alias`, `deferred` or `removal-candidate`. `exposure` SHALL be `public` (`skill/SKILL.md`, the repo skill, a `next` action or a workflow guide sends the author to it), `expert` (it works and the map lists it, but it is not a workflow step) or `internal` (maintainer, release, QA or plumbing work, left out of the author map). Only six pairs of `status` and `exposure` SHALL be allowed: `active` with `public`, `expert` or `internal`, and each of `alias`, `deferred` and `removal-candidate` with `internal`; any other pair SHALL be rejected with `PAIR`. An entry that is not `active`, or that is `internal`, SHALL carry a `reason`. An entry that is `public` or `expert` SHALL carry a `group` and a `summary` of at most 160 characters. A command or script entry that is `public` or `expert` SHALL carry a `guide`, a path under `skill/` that exists (the one document to read for it), optionally followed by `#` and the anchor of a heading of that document (the words of the heading in lower case, each space turned into `-`; `references/workflow-film.md#check` names the section `## check`), or `noGuide: true`, which SHALL be allowed on `expert` entries only. A `guide` whose file does not exist, or whose heading anchor matches no heading of the file, SHALL be reported as `GUIDE_MISSING`. An entry with status `alias` SHALL carry `aliasOf`, the id of an `active` entry. An entry with an empty `deliverables` list SHALL be `internal`. A `deferred` command entry SHALL refuse to run with the code `COMMAND_DEFERRED`.

#### Scenario: A pair that is not one of the six is rejected

- **WHEN** an entry has status `alias` and exposure `expert`
- **THEN** the check SHALL report `PAIR` and name the entry.

#### Scenario: A shown entry needs its words

- **WHEN** an `expert` entry has no `summary`, or a command entry that is `expert` has neither `guide` nor `noGuide`
- **THEN** the check SHALL report `SUMMARY_REQUIRED` or `GUIDE_REQUIRED` and name the entry.

#### Scenario: A hidden entry says why

- **WHEN** an `internal` entry or an entry that is not `active` has no `reason`
- **THEN** the check SHALL report `REASON_REQUIRED` and name the entry.

#### Scenario: An alias points at a live entry

- **WHEN** an entry has status `alias` and `aliasOf` names an entry that is not `active`, or names no entry
- **THEN** the check SHALL report `ALIAS_TARGET` and name the entry.

#### Scenario: A deferred command refuses

- **WHEN** a `deferred` command entry is run through the CLI
- **THEN** the result SHALL carry the code `COMMAND_DEFERRED`.

#### Scenario: A removal candidate is only a proposal

- **WHEN** an entry has status `removal-candidate`
- **THEN** its command SHALL still appear in `--help`
- **AND** the check SHALL reject the entry if it has no `reason`.

### Requirement: Stages are the workflow's own, written per deliverable

`stages` SHALL hold pairs written `deliverable:stage`. Each pair SHALL name a stage that `next` can return for that deliverable, and its deliverable SHALL be one of the entry's `deliverables`. The stage list of `tier` standard and `mode` replicate SHALL contain every stage that any tier of that deliverable has in the modes `brief`, `replicate` and `freeform`, in the same order. Only `public` entries SHALL have stages; an `expert` or `internal` entry is used on demand, at any stage, and SHALL have an empty `stages` list. The tool list SHALL NOT define stage words, phase words, tiers, keywords or priorities of its own.

#### Scenario: An unknown stage is rejected

- **WHEN** an entry lists `film:cut`, or lists `web:build` without `web` in `deliverables`
- **THEN** the check SHALL report `STAGE_UNKNOWN` and name the entry.

#### Scenario: Only public entries carry stages

- **WHEN** an `expert` entry lists `film:check`
- **THEN** the check SHALL report `STAGES_NOT_PUBLIC` and name the entry.

#### Scenario: The standard replicate list covers every stage

- **WHEN** the stage lists of every deliverable, tier and mode are compared
- **THEN** each list SHALL be contained in the standard replicate list of its deliverable, in the same order.

### Requirement: The tool list matches the help text and the job registry

The commands that `--help` names SHALL be exactly the command entries whose status is not `deferred`; `--help` SHALL be compared with the tool list by which rows exist and never by exposure. Every command that `skill/references/job-registry.json` names as primary or secondary knowledge SHALL be an `active` entry that is `public` or `expert`.

#### Scenario: A help line without an entry fails

- **WHEN** `--help` names a command that has no entry, for example a line naming a new action is added to the help and the tool list is not updated
- **THEN** the check SHALL report `HELP_ENTRY` and its message SHALL name the command and the action.

#### Scenario: An entry that the help does not name fails

- **WHEN** an entry that is not `deferred` is missing from `--help`
- **THEN** the check SHALL report `HELP_ENTRY` and its message SHALL name that entry.

#### Scenario: A deferred entry that the help names fails

- **WHEN** `--help` names a command whose entry is `deferred`
- **THEN** the check SHALL report `HELP_ENTRY` and its message SHALL name that command.

#### Scenario: A deferred stub is not in help

- **WHEN** the tool list has a `deferred` command entry that `--help` does not name
- **THEN** the check SHALL pass.

#### Scenario: A job never points at an alias

- **WHEN** a job of `job-registry.json` names a command whose entry has status `alias`
- **THEN** the check SHALL report `JOB_TARGET` and its message SHALL name the job and the command.

### Requirement: The command table lists every command and action, and the dispatcher accepts only those

`skill/scripts/cli-core.cjs` SHALL export `commandPaths()`, which returns one item per command of the command table, in table order: `{ command, actions }`, where `actions` is the list of the actions the command accepts (an empty list for a command that takes no action; it is never `null`), and, for `verify` only, also `gates`, the list of the `--gate` values it accepts. Each of the 20 commands that run their own handler and take actions (`change`, `evidence`, `verify`, `patterns`, `design-system`, `component`, `component-first`, `component-first-v2`, `design-skill`, `high-fidelity`, `mengto`, `shadcnio`, `prism`, `holosticker`, `designmd`, `iart`, `toolchain`, `execution`, `adapter`, `adaptation`) SHALL list its actions in the table, and each of the ten commands that take no action (`doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package`, `route`, `next` and `decide`) SHALL say so with an empty list. The dispatcher SHALL refuse an action that the table does not list, and for `verify` a `--gate` value that the table does not list, before the handler runs or reads an option, with exit code 1: with the code `UNKNOWN_COMMAND` for a command that lists actions, with `UNKNOWN_GATE` for a gate, and with `UNKNOWN_ARGUMENT` and the words `<command> does not accept an action` for a stray word after a command whose list is empty (eight of the ten commands already answered so). An action that the table lists, and a call with no action, SHALL reach the handler exactly as before. The command entries of the tool list SHALL be exactly the rows that `commandPaths()` gives: a command with no action is one row, a command with actions is one row per action, and `verify` has one more row per gate.

#### Scenario: A table row without an entry fails

- **WHEN** `commandPaths()` gives `component frobnicate` and no entry has that command
- **THEN** the check SHALL report `TABLE_ENTRY` and its message SHALL name the row.

#### Scenario: An entry that the table does not give fails

- **WHEN** an entry has a command that is not a row of `commandPaths()`
- **THEN** the check SHALL report `TABLE_ENTRY` and its message SHALL name the entry.

#### Scenario: An action that the table does not list is refused before the handler runs

- **WHEN** `change nosuchaction` is run with no other option
- **THEN** the result SHALL carry the code `UNKNOWN_COMMAND` and exit code 1, and not `OPTION_REQUIRED`.

#### Scenario: A gate that the table does not list is refused

- **WHEN** `verify --gate nosuchgate` is run with no other option
- **THEN** the result SHALL carry the code `UNKNOWN_GATE` and exit code 1.

#### Scenario: A listed action is recognised by its handler

- **WHEN** each listed action and gate of the 20 commands is run in an empty temp folder with `--root`, and with the one input that `change`, `component-first-v2` and `verify --gate` read before the action
- **THEN** no answer SHALL carry `UNKNOWN_COMMAND` or `UNKNOWN_GATE`
- **AND** `designmd sync`, which may use the network, SHALL not be run, and the actions of `component-first` SHALL equal `check` and the `PUBLIC_STAGES` of its module.

#### Scenario: A listed action that its handler does not have fails

- **WHEN** the table lists `component frobnicate` and the handler of `component` has no such action
- **THEN** the check SHALL report `DEAD_ACTION` and its message SHALL name the row.

#### Scenario: A command that takes no action is listed with an empty list

- **WHEN** `commandPaths()` is read
- **THEN** `doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package`, `route`, `next` and `decide` SHALL have an empty `actions` list
- **AND** no command SHALL have `actions` equal to `null`.

#### Scenario: A stray word after a command that takes no action is refused

- **WHEN** any of `doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package`, `route`, `next` and `decide` is run with one stray word after it
- **THEN** the result SHALL carry the code `UNKNOWN_ARGUMENT` and exit code 1.

#### Scenario: A call with every documented flag is not refused

- **WHEN** `next` is run with `--project-root`, `--deliverable`, `--tier`, `--mode`, `--director` and `--replace`, and `decide` with `--project-root`, `--stage`, `--choice`, `--verdict` and `--answer`
- **THEN** no answer SHALL carry `UNKNOWN_ARGUMENT`
- **AND** the state that `readState` gives back SHALL hold what the flags said.

### Requirement: `next` names only public entries of the tool list, at the stages the tool list states

For every deliverable, every tier and the modes `brief` and `replicate`, and for every stage of that deliverable, the action that stage produces, on an empty project and on a project that already has every file the stages test for, SHALL name only entries of the tool list. Every `designer-pipeline` command in it SHALL be an `active` command entry with exposure `public` whose `stages` contain the pair `deliverable:stage`. Every guide path in it SHALL be an `active` guide entry. The start action of a project with no state SHALL name `next`. For every `public` command or guide entry, each pair in its `stages` SHALL be named by a `next` action at that pair, or by the section headed with the stage id in `references/workflow-<deliverable>.md`; the three workflow guides themselves SHALL be exempt.

#### Scenario: A next action names a command that is not in the tool list

- **WHEN** a stage action names `designer-pipeline film verify --project-root .` and no entry has that command
- **THEN** the check SHALL report `NEXT_NAMES` and its message SHALL name the stage and the command.

#### Scenario: A next action names an expert command

- **WHEN** a stage action names a command whose entry has exposure `expert`
- **THEN** the check SHALL report `NEXT_NAMES` and its message SHALL name the command and its exposure.

#### Scenario: A claimed stage is not real

- **WHEN** a public entry lists `film:build` and neither a `next` action nor the `## build` section of `references/workflow-film.md` names it
- **THEN** the check SHALL report `STAGE_UNPROVEN` and its message SHALL name the entry and the pair.

#### Scenario: A deliverable without a stage module is still checked

- **WHEN** an action of `ui`, which has no stage module, names a command
- **THEN** it SHALL be an `active` command entry with exposure `public` whose `stages` contain the pair `ui:<stage>` of the stage that returned it, like the action of any other deliverable.

#### Scenario: A stage that the check cannot read stops it

- **WHEN** a deliverable has no stage module and `next` returns a stage that the check does not know how to finish
- **THEN** the check SHALL stop, SHALL NOT pass, and its message SHALL name the deliverable and the stage.

### Requirement: SKILL.md and the repo skill name only entries of the tool list

Every guide path that `skill/SKILL.md` names, and every such path that the repo skill (`.claude/skills/design-pipeline/SKILL.md`) names, SHALL be an `active` guide entry. A guide path in a text is a path under `references/` or `evals/`, written with or without a leading `skill/`, that ends in `.md` or in `/`. Every `designer-pipeline` command that either file names SHALL be an `active` command entry. Every `public` guide entry SHALL be named by `skill/SKILL.md`, by the repo skill or by the text of a `next` action. Each of `skill/SKILL.md` and the repo skill SHALL name `references/workflow-film.md`, `references/workflow-edit.md` and `references/workflow-web.md`, the guides that `next` sends the author to.

#### Scenario: SKILL.md names a guide that has no entry

- **WHEN** `skill/SKILL.md` names `references/web-treatment.md` and no guide entry has that path
- **THEN** the check SHALL report `SKILL_NAMES` and its message SHALL name the path.

#### Scenario: The repo skill names an alias

- **WHEN** the repo skill names `designer-pipeline high-fidelity check`
- **THEN** the check SHALL report `SKILL_NAMES` and its message SHALL name the command and its status.

#### Scenario: A data file is not a guide

- **WHEN** the repo skill names `scripts/tool-list.json`
- **THEN** the check SHALL NOT report it, because it is not under `references/` or `evals/` and does not end in `.md` or `/`.

#### Scenario: A public guide is named nowhere

- **WHEN** a guide entry is `public` and none of `skill/SKILL.md`, the repo skill and the `next` actions names it
- **THEN** the check SHALL report `GUIDE_UNNAMED` and its message SHALL name the guide.

#### Scenario: A file under `evals/` is checked like any other guide

- **WHEN** the repo skill names `skill/evals/web/README.md` and no guide entry has the path `evals/web/README.md`
- **THEN** the check SHALL report `SKILL_NAMES` and its message SHALL name the path.

#### Scenario: A route bullet that drops a workflow guide fails

- **WHEN** the repo skill no longer names `references/workflow-web.md`
- **THEN** the check SHALL report `SKILL_NAMES` and its message SHALL name the guide and the file.

### Requirement: Command examples in code and shipped guides resolve

In every `.cjs` file under `skill/scripts`, in `skill/SKILL.md`, in the repo skill and in every guide entry that is a Markdown file, a text of the form `designer-pipeline <first> <second>` SHALL name an existing command entry when `<first>` is the first word of a command entry, `<second>` is written in lower-case letters, digits and hyphens (or is `--gate` with a value), and at least one command entry has `<first>` as its first word and a second word. A second word that is missing (the text ends after the command), that starts with `<` or `-`, or that follows a first word that starts no command entry SHALL NOT be checked.

#### Scenario: A wrong command example fails

- **WHEN** a script contains `designer-pipeline film edit auto --project-root .`
- **THEN** the check SHALL report `LITERAL_UNKNOWN` and its message SHALL name the file and `film edit`.

#### Scenario: A command group named alone passes

- **WHEN** a guide says `The public command group is designer-pipeline adaptation.`
- **THEN** the check SHALL pass.

#### Scenario: A word that is not a command is ignored

- **WHEN** a guide says `the designer-pipeline skill`
- **THEN** the check SHALL pass.

### Requirement: The stage map is generated from the tool list and kept current

`skill/references/tool-map.md` SHALL be produced by `node scripts/tool-list.cjs --write` from the tool list, taking the order of stages from the stage lists of the workflow and not from the tool list. The mode `--check` SHALL NOT write any file, and SHALL exit with 1 when the tool list is invalid or when the map differs from what the tool list produces (`MAP_STALE`). The map SHALL list each `public` entry in the row of each stage pair it holds; SHALL list every `public` or `expert` entry that serves all four deliverables once, in a single section that applies to every deliverable; SHALL list every other `expert` entry, and every other `public` entry that holds no stage pair, once under each deliverable it serves; SHALL list the parts of an umbrella command under the umbrella (an entry with `includedIn` for a deliverable is listed only under its umbrella there); SHALL list entries that have `noGuide` in a section of their own; SHALL list aliases, deferred entries and removal candidates only in a last section; and SHALL contain no `internal` entry. It SHALL contain no date and SHALL use line feeds only. Its header SHALL say that it is generated in the source repository and is not edited by hand.

#### Scenario: A hand-edited map fails

- **WHEN** a line of `skill/references/tool-map.md` is changed by hand
- **THEN** the check SHALL report `MAP_STALE` and its message SHALL name the command that regenerates the map.

#### Scenario: A tool list edit without regeneration fails

- **WHEN** an entry's `summary` changes and the map is not regenerated
- **THEN** the check SHALL report `MAP_STALE`.

#### Scenario: A public entry sits at its stages

- **WHEN** the map is read
- **THEN** the row of stage `check` under `film` SHALL name `film check`, and the row of stage `plan` SHALL name `film scaffold` and `verify film-storyboard`
- **AND** the parts of `film check` (for example `verify audio`) SHALL be listed under it and not in the on-demand list of `film`.

#### Scenario: A public guide with no stage is still listed

- **WHEN** the map is read
- **THEN** `references/film-edit.md`, which is public, serves `edit` and holds no stage pair, SHALL be listed in the on-demand list of `edit`.

#### Scenario: Internal entries stay out of the map

- **WHEN** the map is read
- **THEN** it SHALL contain no entry whose exposure is `internal`
- **AND** it SHALL contain each alias in the last section.

#### Scenario: The check does not write

- **WHEN** `node scripts/tool-list.cjs --check` runs
- **THEN** no file in the repository SHALL change.

### Requirement: Each check is shown to fail when its rule is broken

The test SHALL run every check on the real repository and expect no problem, and SHALL run each check on a deliberately broken input and expect its own code: a tool list with one mistake for each code of the structure check, among them a `guide` heading that the file does not have; a help text and a job registry that disagree with the tool list (`HELP_ENTRY`, `JOB_TARGET`); a command table with a row that has no entry, an entry that the table does not give, and a listed action whose handler answers `UNKNOWN_COMMAND` (`TABLE_ENTRY`, `DEAD_ACTION`); a `next` action that names a command that is not in the tool list, an expert command or a claimed stage that nothing names (`NEXT_NAMES`, `STAGE_UNPROVEN`); a `SKILL.md` or repo skill text that names a guide with no entry or an alias or that leaves out a workflow guide, and a public guide that nothing names (`SKILL_NAMES`, `GUIDE_UNNAMED`); a script text with a wrong command example (`LITERAL_UNKNOWN`); and a map that differs from the tool list (`MAP_STALE`). The test SHALL also assert the content rules of the map (no internal entry, parts under their umbrella, aliases in the last section, public guides with no stage listed on demand).

#### Scenario: A broken input is reported with its code

- **WHEN** a check is run on an input broken in the way its rule forbids
- **THEN** it SHALL report the code of that rule and name the entry, the command, the file or the stage.

#### Scenario: A healthy repository reports nothing

- **WHEN** every check is run on the repository as committed
- **THEN** every check SHALL report no problem.

### Requirement: The tool list adds no entry command, gate, receipt, schema file or command word, and changes shipped code in one place only

The change SHALL NOT add a workflow stage, a gate, a finding code of an existing gate, a receipt, a `.schema.json` file, a `designer-pipeline` command, action or flag. It SHALL NOT change the text of `--help`, of any `next` action or of any command result, with two exceptions: the answer to an action or `--gate` value that the command table does not list (its words and the moment it is given, as the requirement on the command table says; its code and exit code stay), and the answer to a stray word after `next` or `decide` (now `UNKNOWN_ARGUMENT` with exit code 1, as the eight other commands that take no action already answer). It SHALL NOT edit any file under `skill/scripts` or `skill/adapters` except `skill/scripts/cli-core.cjs`, and in that file it SHALL only list actions, refuse actions and gates that are not listed, and export `commandPaths()`. The repository script SHALL read the help text, the stage lists and the actions of `next` only through what shipped modules export: `publicHelp`, `execute` and `commandPaths` of `cli-core.cjs`; `DELIVERABLES`, `TIERS`, `initState`, `nextAction` and `decide` of `workflow-core.cjs`; and `stages` of the modules in `skill/scripts/workflows/`. `skill/references/job-registry.json`, `skill/references/pipeline-phases.json` and `skill/references/component-capabilities.json` SHALL NOT change. The help text and the `next` action texts SHALL stay written by hand and SHALL be checked against the tool list, never generated from it. No `designer-pipeline` command SHALL read the tool list; only the repository script and the test read it.

#### Scenario: Only the command table changes

- **WHEN** `git diff --stat` of `skill/scripts` and `skill/adapters` against the commit this change starts from is read
- **THEN** it SHALL list only `skill/scripts/cli-core.cjs`.

#### Scenario: A listed action answers as before

- **WHEN** a listed action of any command is run before and after this change with the same arguments
- **THEN** the code and the exit code of the answer SHALL be the same.

#### Scenario: A call without a stray word answers as before

- **WHEN** each of the ten commands that take no action is run with no word after it, and `next` and `decide` with every documented flag, before and after this change
- **THEN** the exit code and the whole answer SHALL be the same
- **AND** a stray word after `doctor`, `status`, `plan`, `run`, `resume`, `explain-block`, `package` or `route` SHALL be refused with the same words as before.

#### Scenario: The other lists are untouched

- **WHEN** `git diff --stat` of `job-registry.json`, `pipeline-phases.json` and `component-capabilities.json` against the commit this change starts from is read
- **THEN** it SHALL be empty.

### Requirement: Maintainers change the tool list with the command or the guide

`CONTRIBUTING.md` SHALL tell a maintainer to add, rename or remove a list entry whenever a command, an action, a standalone script or a guide that `skill/SKILL.md`, the repo skill or `next` names is added, renamed or removed, and to run `node scripts/tool-list.cjs --write` afterwards. Every failing check SHALL name the entry, the command or the file that disagrees.

#### Scenario: A new action without an entry names itself

- **WHEN** an action is added to a command and the tool list is not updated
- **THEN** the failure message SHALL contain the command and the action.

#### Scenario: A missing guide file names its path

- **WHEN** an entry's `guide` points at a file that does not exist
- **THEN** the check SHALL report `GUIDE_MISSING` with that path and the entry.

#### Scenario: A missing heading names itself

- **WHEN** an entry's `guide` is `references/workflow-film.md#nosuch` and no heading of that file gives the anchor `nosuch`
- **THEN** the check SHALL report `GUIDE_MISSING` with the path, the heading and the entry.

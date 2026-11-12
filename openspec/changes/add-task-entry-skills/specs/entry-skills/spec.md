# Entry skills delta

Where a scenario says "read at closure", no test can check it; task T6 reads the entry texts against the list in `design.md` section 9.5 and writes the result in `qa.md`. Every other scenario is checked by a test that `node scripts/qa.cjs` runs.

## ADDED Requirements

### Requirement: The package has one index skill and five entry skills

The package SHALL contain the index skill `skill/SKILL.md`, whose frontmatter name is `design-pipeline`, and exactly five entry skills named `dp-create`, `dp-reference`, `dp-preview`, `dp-review` and `dp-resume`. Each entry skill SHALL be named for one user task: make something new; take a reference apart; see a few directions or a rough sample first; check or judge a finished piece; continue a job or say where it stands. A further entry skill SHALL need its own OpenSpec change, and the total SHALL NOT exceed six entries. The names are draft names until a person has run the host table of the design (D17).

#### Scenario: The set is fixed

- **WHEN** the folders under `skill/.entries` are listed
- **THEN** their names SHALL equal `dp-create`, `dp-reference`, `dp-preview`, `dp-review` and `dp-resume`
- **AND** the frontmatter name of `skill/SKILL.md` SHALL equal `design-pipeline`.

#### Scenario: A sixth entry that this change does not list is rejected

- **WHEN** `skill/.entries/dp-extra/SKILL.md` exists
- **THEN** the entry test SHALL fail and name the folder.

### Requirement: Entry skills live in a hidden folder and are the only extra SKILL.md files

Each entry skill SHALL be one file, `skill/.entries/<name>/SKILL.md`, in a folder that holds no other file. The folder `.entries` SHALL start with a dot, so that a host that lists nested skills does not list the packaged copies. The `SKILL.md` files under `skill/`, outside the vendored `upstream` folders, SHALL be exactly `skill/SKILL.md` and the five entry files. The check that finds them SHALL walk dot folders. Where `add-web-capability-skills` has already added its check "exactly `skill/SKILL.md`", this change SHALL change that check to a folder rule that holds no names (any other `SKILL.md` outside `upstream` folders sits at `skill/.entries/<folder>/SKILL.md`); the exact five names SHALL be checked once, in the entry test, from one constant list. This requirement replaces, where that change has landed, its rule that `skill/SKILL.md` is the only `SKILL.md` outside `upstream` folders; if that change is archived by then, this requirement is written as a `MODIFIED` block for it.

#### Scenario: The allow-list holds

- **WHEN** the tree under `skill/` is walked, dot folders included and `upstream` folders skipped
- **THEN** the `SKILL.md` files found SHALL be `skill/SKILL.md` and the five entry files, and no other.

#### Scenario: A stray file or a stray skill is rejected

- **WHEN** `skill/.entries/dp-create/notes.md` exists, or a `SKILL.md` exists at `skill/references/x/SKILL.md` outside an `upstream` folder
- **THEN** the entry test SHALL fail and name the path.

#### Scenario: A name that differs from its folder is rejected

- **WHEN** the frontmatter name of `skill/.entries/dp-preview/SKILL.md` is not `dp-preview`
- **THEN** the entry test SHALL fail and name the file.

### Requirement: Every description is one plain line a host accepts

The index and each entry SHALL have frontmatter with exactly the keys `name` and `description`, each on one line. `name` SHALL equal the folder name (for the index, `design-pipeline`), be lower-case letters and digits joined by `-`, and have at most 64 characters. The description SHALL have 1 to 1,024 characters and SHALL contain no colon followed by a space, no colon at the end, no space followed by `#`, no `<` or `>` and no backtick. Its first sentence (the text up to the first period followed by a space, or to the end) SHALL have at most 80 characters. It SHALL have a sentence that starts with `NOT for`; the test checks that the marker is there and where, not what follows. It SHALL hold double-quoted trigger phrases: at least three for an entry and at least two for the index, at least one with a Chinese character and at least one with Latin letters. A description SHALL NOT name a skill outside this package; it MAY point to a sibling entry of this package by name. Each entry description SHALL say in one sentence when to use the entry even if the user does not name the package, and SHALL settle the overlap with its sibling entries in its own words; the phrases of `dp-resume` SHALL name a film, an edit, a web page or a UI, and the `NOT for` sentence of `dp-create` SHALL exclude small edits to code in an existing app (read at closure, below).

#### Scenario: The real descriptions pass

- **WHEN** the structure rules are run on the index and the five entries
- **THEN** no problem SHALL be reported.

#### Scenario: Each rule fails on its own mistake

- **WHEN** a copy of a real description gets one mistake: a colon and a space, a colon at the end, a space then `#`, an angle bracket, a backtick, a first sentence of 81 characters, no `NOT for` sentence, no quoted phrase with a Chinese character, no quoted phrase with Latin letters, or 1,025 characters
- **THEN** the check SHALL report that rule and name the file.

#### Scenario: A description names no outside skill (read at closure)

- **WHEN** a description is read
- **THEN** it SHALL name no skill that a user may not have, and its `NOT for` sentence SHALL use plain words for what belongs elsewhere (code review, pull requests, hand-off notes, small edits to code in an existing app).

#### Scenario: Each entry says when to use it and settles overlaps (read at closure)

- **WHEN** the five entry descriptions are read
- **THEN** each SHALL have one sentence that says when to use the entry even if the user does not name the package
- **AND** a request that names two tasks SHALL go to the entry that holds its first action: `dp-create` quotes a rebuild phrase, `dp-reference` says it is not for making or rebuilding the piece, and `dp-review` says that a request to check and fix starts there
- **AND** no phrase of `dp-resume` SHALL be a bare "continue" or "what is the next step" without a film, an edit, a web page or a UI.

### Requirement: Trigger phrases are not shared between descriptions

The double-quoted trigger phrases, compared without regard to case, SHALL be different across the index and all five entries. This stops copied phrases; it does not show that the meanings do not overlap. No test SHALL read the wording of a description or of an entry text beyond the structure rules of this capability, and no test SHALL assert which skill a host or a model loads for a sentence.

#### Scenario: Two skills claim one phrase

- **WHEN** the same quoted phrase appears in the descriptions of two skills
- **THEN** the entry test SHALL fail and name both.

#### Scenario: The sample sentences are a document, not a test

- **WHEN** `tests/entry-skills.test.cjs` is read
- **THEN** it SHALL hold no table of sample sentences and no assertion about a host's choice
- **AND** the sample sentences and near-misses SHALL be kept in the change's design document and copied into its `qa.md` for the person's host run.

### Requirement: An entry hands over and holds no rules

Each entry SHALL consist of, in order: a locator sentence; "Ask once"; "Hand over", a table with one row per medium (for `dp-reference`, one row per kind of reference; for `dp-resume`, one row per situation); "Before you say done"; and "Do not". The locator sentence SHALL say that the folder the host prints for the entry is the entry's own, that the `design-pipeline` skill folder sits next to it (or, when the index sent the agent here, is the folder that holds `.entries`), and that `design-pipeline` holds `scripts/designer-pipeline.cjs` and `references/`, which every path in the entry is inside. `dp-create` SHALL also hold the sections `## Loop` and `## Talking to the user` that move into it from the index, placed after "Hand over" and before "Before you say done". An entry SHALL NOT contain a keyword list, a score or a rule that picks a command from the user's words. Neither the index nor any entry SHALL contain a command that runs `route`: `designer-pipeline route` or `designer-pipeline.cjs route` followed by an option, or a line inside a code fence that starts with that command; a sentence that only names `route` in plain words is allowed. Every item in "Do not" SHALL carry its reason in the same bullet, and an entry SHALL point at the guide section that defines a list (for example the Required Sections of `references/reference-spec.md`, or the `check` and `probe` sections of the workflow guides) and SHALL NOT restate it (both read at closure, below). Every `designer-pipeline <command> [<action>]` written in the index or an entry SHALL name a command that the CLI help lists; every `references/...` path they name SHALL exist under `skill/`; each entry SHALL have at most 6,144 bytes, the index at most 5,120 bytes, and each file fewer than 500 lines.

#### Scenario: A wrong command is caught

- **WHEN** an entry writes `designer-pipeline film edit check`
- **THEN** the command-name test SHALL fail and name the file and the text.

#### Scenario: A command that runs `route` is rejected

- **WHEN** the index or an entry holds `designer-pipeline route` followed by an option, or a line inside a code fence that starts with `designer-pipeline route`
- **THEN** the entry test SHALL fail and name the file.

#### Scenario: Plain words that name `route` pass

- **WHEN** an entry holds a sentence such as "Run `route` to pick a command. It is a second way to decide what happens next, and two ways disagree."
- **THEN** the entry test SHALL NOT fail.

#### Scenario: A missing guide path is caught

- **WHEN** an entry names `references/no-such-guide.md`
- **THEN** the entry test SHALL fail and name the path.

#### Scenario: The shape is read (read at closure)

- **WHEN** an entry is read
- **THEN** it SHALL have the five parts in order and a hand-over row for each medium it claims, every row SHALL name an existing command or guide section, each "Do not" item SHALL carry its reason, and no list that a guide defines SHALL be copied into the entry.

### Requirement: The medium is asked once

An entry that needs a medium SHALL tell the agent to take it from `deliverable` in `.design-pipeline/state.json` when that file exists, and then to call `next` without `--deliverable`. When there is no state file and the user's words do not name the medium, the entry SHALL tell the agent to ask one question that offers film (also 3D shots and a score), edit, web page and UI. `dp-create` and `dp-preview` SHALL pass the answer to `next --deliverable` only when the folder has no state file. `dp-reference` and `dp-review` SHALL use the medium only to choose a row and SHALL create no project state. An entry SHALL NOT ask for the medium more than once, and SHALL NOT ask when project state holds it. A user who runs `dp-reference` and then `dp-create` is asked again, because `dp-reference` keeps no state.

#### Scenario: The medium comes from project state (read at closure)

- **WHEN** the text of `dp-review` is read
- **THEN** it SHALL tell the agent to read `deliverable` from `.design-pipeline/state.json` before it asks anything, and to call `next` without `--deliverable` when the file exists.

#### Scenario: `dp-reference` and `dp-review` write no state (read at closure)

- **WHEN** the texts of `dp-reference` and `dp-review` are read
- **THEN** neither SHALL tell the agent to run `next --deliverable`.

### Requirement: The installer puts each entry next to the main skill

`scripts/install-local.cjs` SHALL, before it copies anything, look at `<source>/.entries/*/` and refuse a bad entry folder. It SHALL install each folder `<source>/.entries/<name>` to `<root>/<name>`, using the same `--root` as the main skill; when `--target` is not `<root>/design-pipeline` the main skill SHALL go where `--target` says and the entries SHALL still go to `<root>/<name>`. A source with no `.entries` folder SHALL install the main skill only and give `entries: []`. Every folder name SHALL be lower-case letters and digits joined by `-` and have at most 64 characters; each folder SHALL hold a `SKILL.md` whose name equals the folder name; two skills SHALL NOT install to one folder; each target SHALL stay below `--root`, SHALL NOT be a link and SHALL NOT lie inside the source. A target that already exists SHALL be refused unless `--replace` is given. Every folder the installer installs SHALL get a file `.installed-by-design-pipeline.json` with the keys `package` (`design-pipeline`), `skill` (the folder's skill name) and `version` (text), written into the staged copy after `doctor` has passed and never into the source; only the installer reads it. An existing entry target SHALL be replaced (with `--replace`) only if it is a real folder whose marker parses and names this package and this skill. Otherwise the installer SHALL stop before it copies or changes anything, exit 1, name the folder, say that design-pipeline did not install it and that `--replace` does not change that, and tell the user to move or rename it or use another `--root`; this check SHALL come before the message that asks for `--replace`. An existing main target keeps today's rule: it needs `--replace` and is then replaced whether or not it has a marker. All copies SHALL be staged first and `doctor` SHALL run on the main copy as it does today. When the swap fails, every earlier change SHALL be put back; across several folders this is best effort with backup and rollback. The main copy SHALL keep `.entries`. The result SHALL keep the schema id `design-pipeline.install-result.v1` and add `entries`, the list of names installed. The installer SHALL NOT remove an entry that the source no longer holds.

#### Scenario: A fresh install puts every skill in place once

- **WHEN** a package with `.entries/dp-create` and `.entries/dp-review` is installed into an empty root
- **THEN** the root SHALL hold `design-pipeline`, `dp-create` and `dp-review`, one folder each
- **AND** `design-pipeline/.entries` SHALL hold both entry folders
- **AND** the result's `entries` SHALL list `dp-create` and `dp-review`.

#### Scenario: A second install is refused

- **WHEN** the same install runs again without `--replace`
- **THEN** it SHALL exit 1 and change nothing.

#### Scenario: A replacement updates every folder

- **WHEN** the source changes and the install runs with `--replace`
- **THEN** the main skill and each entry SHALL hold the new content.

#### Scenario: An upgrade from an install without entries installs them

- **WHEN** a root holds `design-pipeline` and no entry folder, and the install runs with `--replace`
- **THEN** `design-pipeline` SHALL be replaced and each entry SHALL be installed as a new folder
- **AND** a failure injected in any rename of that run SHALL put `design-pipeline` back and leave no entry folder.

#### Scenario: Every installed folder gets a marker and the source stays clean

- **WHEN** a package with `.entries/dp-create` and `.entries/dp-review` is installed into an empty root
- **THEN** `design-pipeline`, `dp-create` and `dp-review` SHALL each hold `.installed-by-design-pipeline.json` with `package` equal to `design-pipeline`, `skill` equal to the folder name and a `version` text
- **AND** the source tree SHALL hold no marker file.

#### Scenario: A folder of the user's is never replaced

- **WHEN** the root holds a folder `dp-review` that has no marker, or a marker for another package or another skill, or a marker that is not JSON, or holds a file or a link named `dp-review`
- **THEN** the install SHALL exit 1, with and without `--replace`, and name the folder
- **AND** that path SHALL be byte for byte as it was, and nothing else in the root SHALL be created or changed.

#### Scenario: A marked folder is replaced and its marker refreshed

- **WHEN** the root holds an earlier install and the install runs with `--replace` from a source with a new version
- **THEN** each folder SHALL hold the new content and a marker with the new version.

#### Scenario: An old main folder without a marker is replaced with `--replace`

- **WHEN** the root holds a `design-pipeline` folder without a marker and the install runs without `--replace`
- **THEN** it SHALL exit 1 and change nothing
- **AND** with `--replace` the folder SHALL be replaced and SHALL then hold a marker.

#### Scenario: A bad entry is refused before any change

- **WHEN** an entry folder is named `Bad_Name`, has a name of more than 64 characters, has no `SKILL.md`, or its `SKILL.md` names a different skill
- **THEN** the installer SHALL exit 1, SHALL have copied nothing, and the root SHALL be as before.

#### Scenario: A failure in any rename leaves the earlier tree

- **WHEN** a failure is injected in the Nth `renameSync` of a fresh install or of a replacement, for every N up to the number of renames the run makes
- **THEN** every folder SHALL hold its previous content and its previous marker (a fresh install leaves none), and no name that contains `.tmp-` or `.backup-` and no lock file SHALL remain.

#### Scenario: A dropped entry stays behind

- **WHEN** a replacement runs from a source that no longer holds `.entries/dp-preview`
- **THEN** the old `dp-preview` folder SHALL remain in the root.

#### Scenario: A source without entries installs the main skill only

- **WHEN** a package with no `.entries` folder is installed
- **THEN** only the main skill SHALL be installed
- **AND** the result's `entries` SHALL be an empty list.

#### Scenario: A custom target still puts the entries in the root

- **WHEN** the install runs with `--target <root>/my-skill`
- **THEN** the main skill SHALL be at `<root>/my-skill` and each entry SHALL be at `<root>/<name>`.

#### Scenario: The packaged installer installs the entries

- **WHEN** the package archive is extracted and its installer runs into an isolated root, as `scripts/qa.cjs` does
- **THEN** the root SHALL hold the index and the five entry folders, one each.

### Requirement: The package and its list carry the entries

`required` in `skill/references/package-resources.json` SHALL contain `.entries/dp-create/SKILL.md`, `.entries/dp-reference/SKILL.md`, `.entries/dp-preview/SKILL.md`, `.entries/dp-review/SKILL.md` and `.entries/dp-resume/SKILL.md`. `scripts/package.cjs` SHALL NOT be changed. An installed tree SHALL pass `doctor`.

#### Scenario: The archive carries the five files

- **WHEN** the package is built
- **THEN** the archive SHALL contain `design-pipeline/.entries/<name>/SKILL.md` for the five names.

#### Scenario: A missing entry fails the build

- **WHEN** `skill/.entries/dp-create/SKILL.md` is missing
- **THEN** packaging SHALL fail and name the resource.

#### Scenario: An installed tree passes doctor

- **WHEN** the package is installed and `doctor` runs on the installed main folder
- **THEN** it SHALL report ready.

### Requirement: The index stays a working front door

`skill/SKILL.md` SHALL keep the name `design-pipeline`, have at most 5,120 bytes and fewer than 500 lines, keep the sections `## Where the details are` and `## Always`, name `references/product-film-direction.md` and the three workflow guides, hold a table that names the five entries, and hold the fallback sentence that names `.entries/`. The `next` loop, the first-call tables and "Talking to the user" SHALL live in `dp-create`. This change SHALL NOT change `tests/helpers/skill-surface.cjs`: the index keeps every name that the tests which use it read.

#### Scenario: The names the tests need are still there

- **WHEN** `tests/hyperframes-routing.test.cjs` reads `skill/SKILL.md`
- **THEN** it SHALL find `references/product-film-direction.md`.

#### Scenario: The front-door tests pass unchanged

- **WHEN** `node scripts/qa.cjs` runs the eight tests that read the front door through `tests/helpers/skill-surface.cjs`
- **THEN** they SHALL pass with that helper unchanged.

#### Scenario: The index names each entry and the fallback

- **WHEN** `skill/SKILL.md` is read
- **THEN** it SHALL name `dp-create`, `dp-reference`, `dp-preview`, `dp-review` and `dp-resume` and the path `.entries/`.

### Requirement: Entries keep tool results and human acceptance apart

`dp-review` SHALL run what the `check` or `probe` section of the workflow guide for the medium lists and SHALL NOT copy that list; SHALL report in two headed parts, one for what the tools checked (the command, its exit code and each finding with its `fix`) and one for what needs a person's eye; SHALL list every check that did not run, with the reason, and SHALL NOT call such a check passed; SHALL say that a check run inside a project that has state records its result there; SHALL call `decide` only when `next` asks; and SHALL record no Visual Acceptance. `dp-create` SHALL report gate results and the user's accept or reject apart, SHALL say a gate passed only when its record says `passed`, and at the quick tier of film, edit and web, where there is no delivered file, SHALL name the draft and the gate results. `dp-preview` SHALL label its results samples, SHALL NOT call `deliver`, SHALL make a sample in a folder of its own, and SHALL NOT use `next` for a `ui` sample. `dp-reference` SHALL say that its `reference.md` has the sections that `references/reference-spec.md` lists under Required Sections, what was not observed, and what `next` notices of the file and what it does not. `dp-resume` SHALL run `next` for a project, `status` and `explain-block` for a change folder, run `resume` only after the user says continue and only when the folder holds `plan.json`, and say that `resume` writes and that `status` and `resume` cannot be used on a `next` project.

#### Scenario: `dp-review` states what it did not run (read at closure)

- **WHEN** the text of `dp-review` is read
- **THEN** it SHALL tell the agent to list unrun checks with their reasons and never to call them passed.

#### Scenario: `dp-review` leaves the verdict to the person (read at closure)

- **WHEN** the text of `dp-review` is read
- **THEN** it SHALL forbid a call to `decide` unless `next` asked and forbid recording Visual Acceptance.

#### Scenario: `dp-review` and `dp-reference` point at the guide instead of copying it (read at closure)

- **WHEN** the texts of `dp-review` and `dp-reference` are read
- **THEN** `dp-review` SHALL tell the agent to run what the `check` or `probe` section of the workflow guide for the medium lists
- **AND** `dp-reference` SHALL name the Required Sections of `references/reference-spec.md` without listing them
- **AND** neither SHALL hold a second definition of a finished `reference.md` or of the gates that a check runs.

#### Scenario: `dp-preview` keeps a sample apart from the real job (read at closure)

- **WHEN** the text of `dp-preview` is read
- **THEN** it SHALL tell the agent to make a sample in its own folder, to label it a sample, and never to call `deliver`.

#### Scenario: `dp-resume` writes nothing unless told (read at closure)

- **WHEN** the text of `dp-resume` is read
- **THEN** it SHALL allow `resume` only after the user says continue
- **AND** `next` run twice on a project SHALL give the same answer and leave `.design-pipeline/state.json` unchanged, as it does today.

### Requirement: The tool list and map know the entries

Once `scripts/tool-list.cjs` exists, its `SKILL_NAMES` check SHALL also read the five entry files: every `designer-pipeline` command an entry names SHALL be an `active` entry of the tool list. The check SHALL NOT compare the guide paths of the entry files with the list, because the entries name guides that the list does not carry. The generated `skill/references/tool-map.md` SHALL have a `## Ways to start` section with one row per entry: its name, the first sentence of its description, and the commands and guide paths its text names, in the order it names them, the guide paths as plain text. No field and no row SHALL be added to the tool list or its schema. When that check is added, `tests/entry-names.test.cjs`, which holds the command-name check of the entry files, SHALL be deleted in the same step; the check that no entry holds a command that runs `route` SHALL stay in `tests/entry-skills.test.cjs`.

#### Scenario: An entry names a command that is not in the list

- **WHEN** an entry names a command that has no `active` entry
- **THEN** the check SHALL report `SKILL_NAMES` and name the entry file.

#### Scenario: The map has the section and is current

- **WHEN** the map is generated from the tool list and the entry files
- **THEN** it SHALL hold `## Ways to start` with five rows
- **AND** a map that differs from the generated one SHALL fail with `MAP_STALE`.

#### Scenario: The list gains no field

- **WHEN** the tool list is validated after this change
- **THEN** its top-level keys and entry keys SHALL equal those before.

#### Scenario: The command-name test is replaced and the route check stays

- **WHEN** the tool list check reads the five entry files
- **THEN** `tests/entry-names.test.cjs` SHALL no longer exist and `scripts/test-manifest.json` SHALL not list it
- **AND** an entry that holds a fenced `designer-pipeline route --query x` line SHALL still fail the entry test.

### Requirement: No new router, gate, receipt, schema or command

This change SHALL NOT add a gate, a finding code, a receipt, an analysis or result schema, a workflow stage, a workflow-state field, a `designer-pipeline` command or option, or an entry command. It SHALL add only entry text, the shrunken index, the installer fan-out with the `entries` field of the install result and the install marker, structure tests, registration and documents. The install marker is a plain file of three keys that only the installer reads; it is not a receipt, a schema or a state field of the pipeline, it has no schema id, and no `designer-pipeline` command, gate or `doctor` check reads it. The change SHALL edit no file under `skill/scripts/` and no schema file under `skill/references/`.

#### Scenario: Contracts are unchanged (read at closure)

- **WHEN** the files this change touched are listed at closure
- **THEN** none SHALL be under `skill/scripts/`, and none SHALL be a schema file under `skill/references/`
- **AND** the CLI help text SHALL equal the copy that T0 saved, except that the install result gains the field `entries`.

#### Scenario: The three entry commands are unchanged (read at closure)

- **WHEN** the same list is read
- **THEN** it SHALL show no edit to the code of `next`, `decide`, `route`, `status`, `plan` or `run`.

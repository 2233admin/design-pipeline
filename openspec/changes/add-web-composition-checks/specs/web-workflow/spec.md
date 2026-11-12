# Web workflow delta

## ADDED Requirements

### Requirement: The web probe stage is finished by one gate record over the probe file, the page it names and the first-screen evidence

At every tier, `next` for the `web` deliverable SHALL treat the `probe` stage as finished only when all of
these hold: the probe file `interaction.json` in the project folder is a valid probe file (by the
validator that `verify interaction` uses); its `url` names a regular file whose real path is inside the
project folder (an http(s) address, a link that leads outside the folder, and a folder do not); every file
of the list exists; and the `interaction` gate passed and is current over the list. The list SHALL be
`interaction.json`, that page file, and for each of the sizes `375x812`, `768x1024` and `1440x900` the
files `evidence/composition/<size>/screenshot.png`, `elements.json` and `result.json`. `index.html` SHALL
be in the list only when `url` names it. A gate is current when its record is not older than the newest
file time among the listed files, by the rule `gatePassed` already applies (with its 50 ms tolerance). The
stage SHALL read one gate record, `interaction`, and SHALL NOT treat a missing file as current. The web
workflow judges the page file the probe names, inside the project; a page at a web address, or anywhere
else outside the project, can only be judged by running the check yourself, and changes to such a page
are invisible to `next`.

#### Scenario: First-screen evidence is missing

- **WHEN** `next` runs for a standard web project whose probe file names `index.html`, whose `index.html` exists and whose `interaction` gate is recorded `passed`, and no first-screen evidence exists
- **THEN** the action `stage` SHALL be `probe` and its `command` SHALL contain `designer-pipeline verify interaction --probe interaction.json`
- **AND** `next` SHALL NOT return the `review` stage.

#### Scenario: The page is edited after the check

- **WHEN** the `interaction` gate passed with every listed file present, and the page file that `url` names is then edited so that its file time is newer than the record
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command.

#### Scenario: A failed record keeps probe open

- **WHEN** the `interaction` gate is recorded `failed` and every listed file is present
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command.

#### Scenario: A passed and current record finishes probe

- **WHEN** a standard web project's `interaction` gate is recorded `passed`, every listed file exists, and no file is newer than the record
- **THEN** `next` SHALL return the `review` stage.

#### Scenario: A deleted evidence file reopens probe

- **WHEN** the gate passed and one of the nine evidence files is then deleted
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command, although the record is still `passed`.

#### Scenario: A replaced evidence file reopens probe

- **WHEN** the gate passed and any one of the nine evidence files then has a file time newer than the record
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command.

#### Scenario: A record from before this change does not finish probe

- **WHEN** the `interaction` gate is recorded `passed` by the previous version of the command, so that no first-screen evidence exists
- **THEN** `next` SHALL return stage `probe` with the same one command, `verify interaction`.

#### Scenario: The quick tier uses the same rule

- **WHEN** a quick web project has a probe file that names `index.html`, that page, the nine evidence files and a `passed` record that is current
- **THEN** `next` SHALL return `done`
- **AND** the same project without the nine evidence files SHALL return stage `probe`.

#### Scenario: The probe names another local page, which then changes

- **WHEN** the probe file's `url` is `demo.html`, both `demo.html` and `index.html` exist, the `interaction` gate is recorded `passed`, the nine evidence files exist and no file is newer than the record
- **THEN** `next` SHALL return the `review` stage
- **AND** after `demo.html` is edited so that its file time is newer than the record, `next` SHALL return stage `probe` with the `verify interaction` command
- **AND** an edit to `index.html` alone, with `demo.html` unchanged, SHALL NOT reopen `probe`.

#### Scenario: The probe names a page in a subfolder

- **WHEN** the probe file's `url` is `pages/demo/index.html`, that file exists inside the project folder, `index.html` also exists in the project folder (the `build` stage, which this change does not edit, still needs it), and the gate passed with the nine evidence files in `evidence/composition/` next to the probe file
- **THEN** `next` SHALL return the `review` stage
- **AND** after `pages/demo/index.html` is edited, `next` SHALL return stage `probe` with the `verify interaction` command.

#### Scenario: The build stage is not changed

- **WHEN** the only page of a web project is `pages/demo/index.html`, the probe file names it, and no `index.html` exists in the project folder
- **THEN** `next` SHALL return stage `build`, as it does before this change.

#### Scenario: The probe's url is an http address

- **WHEN** the probe file's `url` is `http://localhost:5173/`, the `interaction` gate is recorded `passed`, the nine evidence files exist and no file is newer than the record
- **THEN** `next` SHALL return stage `probe`, not `review`
- **AND** the action's `command` SHALL say that the probe points at that address, which is not a file inside the project, SHALL state that the workflow judges the page file the probe names inside the project and that a page elsewhere can only be judged by running the check yourself, and SHALL say to change `url` to the page file and then run `designer-pipeline verify interaction --probe interaction.json` again.

#### Scenario: The probe's url leaves the project folder

- **WHEN** the probe file's `url` is `../outside.html`, or an absolute path, the `interaction` gate is recorded `passed` and the nine evidence files exist
- **THEN** `next` SHALL return stage `probe`
- **AND** the action's `command` SHALL say that the probe file is not valid and SHALL contain the validator's reason.

#### Scenario: A folder link leads outside the project folder

- **WHEN** the probe file's `url` goes through a folder inside the project folder that is a link whose real target lies outside it, and the gate passed with the nine evidence files
- **THEN** `next` SHALL return stage `probe`
- **AND** the action's `command` SHALL say the same as for an http address: that the probe points at `url`, which is not a file inside the project, the rule, and to change `url` to the page file.

#### Scenario: The probe's url names a folder

- **WHEN** the probe file's `url` names a folder inside the project folder, the `interaction` gate is recorded `passed` and the nine evidence files exist
- **THEN** `next` SHALL return stage `probe`, with the same text as for an http address.

#### Scenario: The probe file is missing or not valid

- **WHEN** a record is `passed` and the nine evidence files and `index.html` exist, but `interaction.json` is missing, or is not a valid probe file
- **THEN** `next` SHALL return stage `probe`
- **AND** for a missing file the action SHALL ask for `interaction.json` as before, and for an invalid one it SHALL say that the probe file is not valid.

### Requirement: verify interaction also checks the first screen at three sizes and records one verdict

After `verify interaction` has captured and evaluated the probes, it SHALL capture the page the probes
drove at `375x812`, `768x1024` and `1440x900`, in that order, into `evidence/composition/<size>/` next to
the probe file, check each picture with the `page` profile of the composition gate, and write
`screenshot.png`, `elements.json` and `result.json` for each size. It SHALL write `<outDir>/interaction.json`
only after both halves were measured, and SHALL record the gate `interaction` once, as `passed` only when
every probe and every size passed. The result SHALL keep the schema id `design-pipeline.interaction-result.v1`
and its existing fields, and SHALL add `checks` (`interaction` and `composition`, each `passed` or
`failed`), `composition` (the first-screen summary) and `next`; its `status` SHALL be `failed` when either
half failed. Exit codes SHALL stay 0 (passed), 2 (a measurement happened and failed) and 1 (a usage or
contract error, or a measurement that never happened, which writes no result and records nothing). The
command SHALL accept no new option and SHALL keep accepting an http(s) `url`, which it captures, checks
and gives a verdict for like a file page, so that it stays usable on its own. When the page is not a
regular file inside the project folder (an http(s) address, a link that leads outside the folder, a
folder), the `next` field of the result SHALL end with a plain sentence that says the page is not a file
inside the project, that `designer-pipeline next` therefore cannot count it as finished whatever the
verdict says, to point `url` at the local page file to finish, and that a page that is not such a file can
only be judged by running the check yourself; when both checks passed, this sentence SHALL replace "Run
`designer-pipeline next`". The decision which pages count SHALL be made by the same function that `next`
uses. The evidence folder SHALL be next to the probe file whatever `--output` says.

#### Scenario: Both halves pass

- **WHEN** the command runs with a capture that gives a recording that passes and good pictures, in a project that has workflow state
- **THEN** the exit code SHALL be 0, `state.gates.interaction.status` SHALL be `passed`, the nine evidence files and the result SHALL exist, and `checks` SHALL be `passed` for both halves
- **AND** `composition.viewports` SHALL list the three sizes in order, and `state.gates` SHALL have no key other than `interaction`.

#### Scenario: A failed size fails the gate and names the size

- **WHEN** the picture at `768x1024` is nearly empty and everything else is good
- **THEN** the exit code SHALL be 2, the record SHALL be `failed`, `checks.composition` SHALL be `failed` and `checks.interaction` SHALL be `passed`
- **AND** all nine files and the result SHALL be written, and `next` (the field of the result) SHALL contain `768x1024`.

#### Scenario: A failed probe fails the gate and the pictures are still written

- **WHEN** the recording shows a frozen target and the pictures are good
- **THEN** the exit code SHALL be 2, `checks.interaction` SHALL be `failed` and `checks.composition` SHALL be `passed`
- **AND** all nine evidence files SHALL be written.

#### Scenario: Both failing halves are named

- **WHEN** a probe fails and a size fails in the same run
- **THEN** `checks` SHALL be `failed` for both halves and `next` SHALL name the interaction check and every failed size.

#### Scenario: A first-screen capture that never happens records nothing

- **WHEN** the capture at `768x1024` fails
- **THEN** the exit code SHALL be 1, the error code SHALL be `KERNEL_FAILED` and the message SHALL contain `768x1024`
- **AND** no result SHALL be written by that run and `state.gates.interaction` SHALL be unchanged.

#### Scenario: A failed run cannot leave an old pass looking current

- **WHEN** the gate passed, and a later run fails at the second size after writing the pictures of the first size
- **THEN** `next` SHALL NOT return `done` or `review`, because the written pictures are newer than the old record.

#### Scenario: The existing failure split and help line are kept

- **WHEN** the probe file is malformed, or `--probe-file` is used, or `--output` leaves `--root`, or the browser tool is missing
- **THEN** the exit code, error code and message SHALL be as before this change, and nothing SHALL be written or recorded
- **AND** the help line SHALL still contain `verify interaction --probe <interaction.json> [--output <evidence-dir>] [--chrome <exe>] [--puppeteer-module <path>]`.

#### Scenario: The result keeps its contract

- **WHEN** the result is compared with the result before this change
- **THEN** its `schema` SHALL be `design-pipeline.interaction-result.v1`, every old field SHALL be present with its old meaning except that `status` is the verdict of both halves, and the new fields SHALL be `checks`, `composition` and `next` only.

#### Scenario: The output option moves only the result

- **WHEN** the command runs with `--output my-evidence`
- **THEN** the result SHALL be in `my-evidence/interaction.json` and the pictures SHALL be in `evidence/composition/` next to the probe file.

#### Scenario: An http(s) page gets a plain notice

- **WHEN** the probe file's `url` is an http(s) address that answers, the captures work and both halves pass
- **THEN** the exit code SHALL be 0, the pictures SHALL be taken from that address, and `state.gates.interaction.status` SHALL be `passed` in a project that has workflow state
- **AND** the `next` field of the result SHALL end with the sentence that `designer-pipeline next` cannot count this page as finished because it is not a file inside the project, and SHALL NOT tell the user to run `designer-pipeline next`
- **AND** `next` itself SHALL return stage `probe` for that project, with the text of the first requirement.

#### Scenario: A failing http(s) page keeps both messages

- **WHEN** the probe file's `url` is an http(s) address and the recording shows a frozen target
- **THEN** the exit code SHALL be 2 and `checks.interaction` SHALL be `failed`
- **AND** the `next` field SHALL hold the interaction failure sentence, then the request to run the command again, then the sentence that `designer-pipeline next` cannot count this page as finished.

#### Scenario: A link leading outside the project gets the same notice

- **WHEN** the probe file's `url` goes through a folder inside the project folder that is a link whose real target lies outside it, and the command passes
- **THEN** the exit code SHALL be 0 and the `next` field SHALL end with the same sentence
- **AND** `next` itself SHALL return stage `probe`.

#### Scenario: A page file inside the project gets no notice

- **WHEN** the probe file's `url` names a regular file inside the project folder, in a subfolder or at the root, and the command passes
- **THEN** the `next` field SHALL be the sentence that both checks passed and to run `designer-pipeline next`, with no sentence about the page not counting.

### Requirement: The probe action names one command

When the probe file exists, is valid and its `url` names a regular file inside the project folder, the
`probe` action SHALL return `designer-pipeline verify interaction --probe interaction.json` with a `why`
that says the first screen is checked at each of the three sizes, which findings fail the check
(including unreadable text anywhere on the page and a page with almost nothing on it), which only warn,
and that any edit to the page file means running it again. When the probe file is missing, the action
SHALL ask for it as before. When the page is elsewhere (an http(s) address, a link that leads outside
the folder, a folder), the action's `command` SHALL say that the probe points at `url`, which is not a
file inside the project, SHALL state the rule once (the workflow judges the page file the probe names
inside the project; a page anywhere else can only be judged by running the check yourself), and SHALL say
to change `url` to the page file. When the probe file is not valid, it SHALL say that it is not valid,
with the validator's reason. Each of these SHALL end by telling the user to run `designer-pipeline verify
interaction --probe interaction.json` again. When `url` names a file that does not exist, the action
SHALL return the same command, which reports the missing page. The stage ids of `web`, their order per
tier, the counts `remaining` and the `n/m` in `line`, and the `guide` anchors SHALL NOT change.

#### Scenario: The first steps are as before

- **WHEN** `next` runs for a web project at `probe` with no `interaction.json`, and then with `interaction.json` but no record
- **THEN** the first action SHALL ask for `interaction.json`
- **AND** the second SHALL be `designer-pipeline verify interaction --probe interaction.json`.

#### Scenario: The page file is missing

- **WHEN** the probe file's `url` names a file that does not exist
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command.

#### Scenario: Stage ids, order and counts are unchanged

- **WHEN** the web stages are listed for the quick, standard and full tiers
- **THEN** the ids and their order SHALL equal those before this change
- **AND** `remaining` at the `build` stage of a standard project SHALL equal 4.

### Requirement: A rejection still reopens probe

`decide --stage review --verdict reject` SHALL keep its behaviour and SHALL NOT be edited: it removes the
`film`, `edit` and `interaction` gate records. A web project whose review is rejected SHALL therefore
return to `probe`, and the next run of `verify interaction` SHALL check both halves again.

#### Scenario: A rejection, then the command, then review

- **WHEN** a standard web project's review is rejected with a reason and nothing is edited
- **THEN** `next` SHALL return stage `probe` with the `verify interaction` command
- **AND** after the gate is recorded `passed` with current evidence again, `next` SHALL return `review`.

### Requirement: The web build and review texts name the sizes and the evidence

The web `build` action at the `standard` and `full` tiers SHALL say that the first screen has to work at
375x812, 768x1024 and 1440x900 and that `probe` checks it. The `quick` tier's `build` action SHALL NOT
change. The web `review` action's `show` list SHALL name `evidence/composition/<size>/screenshot.png` and
the warnings in `evidence/composition/<size>/result.json`. No field of either action SHALL contain the
words video, contact sheet (or `contact-sheet`), footage or beat. The film and edit `review` actions SHALL
NOT change.

#### Scenario: The build action names the sizes

- **WHEN** `next` runs for a standard web project whose concept is chosen and that has no `index.html`
- **THEN** the `build` command SHALL contain `375x812`, `768x1024` and `1440x900`
- **AND** the quick tier's `build` command SHALL NOT.

#### Scenario: The review action names the evidence

- **WHEN** `next` runs for a standard web project whose gate passed and is current
- **THEN** the serialized `review` action SHALL contain `evidence/composition/` and `result.json`
- **AND** it SHALL NOT match `video`, `contact.sheet`, `footage` or `beat` (case-insensitive).

### Requirement: No new stage, gate, record key, schema id, state field or CLI option

This change SHALL NOT add a workflow stage, a gate id or a key in `state.gates`, change `recordGate` or
`decide`, add a field to the workflow state, add a schema id, or add a CLI command, option or flag. After
a run, `state.gates` SHALL hold the key `interaction` with the shape `{ status, at }` and no key
`composition`.

#### Scenario: The state contract is unchanged

- **WHEN** the command records its verdict for a web project
- **THEN** the stored record SHALL equal `{ status, at }` with no other key, and `state.gates` SHALL have no key `composition`
- **AND** the state `schema` SHALL still equal `design-pipeline.workflow-state.v1`.

#### Scenario: Done lists the one gate

- **WHEN** a standard web project is finished
- **THEN** the `done` action's `evidence.gates` SHALL contain `interaction` and no `composition`.

#### Scenario: The option registries are unchanged

- **WHEN** the CLI's `KNOWN_OPTIONS` and `BOOLEAN_OPTIONS` are compared with their content before this change
- **THEN** they SHALL be equal.

### Requirement: The web guide says what the check sees and does not see

`references/workflow-web.md` SHALL describe the one command of `probe` and its two checks, the nine
evidence files, which findings fail the check and which only warn, that any edit to the page file that
the probe's `url` names, the probe file or an evidence file reopens the stage, that `--output` moves only
the result, and that the check does not find overlapping text, clipped text, text running out of its box,
sideways scrolling or layout below the first screen (below it, only text contrast, near-miss alignment
and type sizes are read). It SHALL state the rule once and plainly: the workflow judges the page file the
probe names, inside the project; a page at a web address, or anywhere else outside the project, can only
be judged by running the check yourself, and changes to such a page are invisible to `next`; the command
accepts such a page, tells you in its result that `next` cannot count it, and `next` says what to change.
It SHALL NOT say or suggest that the workflow supports remote pages. It SHALL keep one `##` heading per
stage id. `references/web-direction.md` SHALL point its first-screen evidence at the files and say they
show the first screen only.

#### Scenario: Every web guide anchor resolves

- **WHEN** the web stages for each tier are listed
- **THEN** `workflow-web.md` SHALL have a `## <stage id>` heading for each.

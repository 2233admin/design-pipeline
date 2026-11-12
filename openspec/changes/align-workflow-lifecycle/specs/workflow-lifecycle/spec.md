# Workflow lifecycle delta

## ADDED Requirements

### Requirement: Every deliverable follows the same six steps

Every stage of `film`, `edit`, `web` and `ui` SHALL belong to exactly one of six steps: `intake`,
`direction`, `make`, `verify`, `review`, `deliver`. The six names SHALL be the constant `STEPS`
exported from `skill/scripts/workflows/shared.cjs`. Each stage object SHALL carry a `step`, and the
`next` output SHALL return it. Stages sit in steps by stage id:

- `film`: `intake` is intake; `reference` and `concepts` are direction; `plan` and `build` are make;
  `check` is verify; `review` is review; `deliver` is deliver.
- `edit`: `intake` and `analyze` are intake; `reference` and `style` are direction; `cut` and `render`
  are make; `check` is verify; `review` is review; `deliver` is deliver.
- `web`: `intake` is intake; `reference` and `concepts` are direction; `build` is make; `probe` is
  verify; `review` is review; `deliver` is deliver.
- `ui`: `intake` is intake; `reference` and `concepts` are direction; `work` is make; `probe` is
  verify; `review` is review; `deliver` is deliver.

A step is a label. It SHALL NOT choose the next stage; the stage list does. The `step` SHALL be read by
three things only: the `next` output, the required-steps test, and the art-director rule. The
art-director note (the `director` field) SHALL be added to every `ask` whose step is `direction` or
`review`. That includes the `style` ask of `edit`.

#### Scenario: Every stage has a valid step and steps never go backwards

- **WHEN** the stage lists of `film`, `edit`, `web` and `ui` are built for every tier (`quick`, `standard`, `full`) and every mode (`brief`, `replicate`, `freeform`)
- **THEN** every stage SHALL carry a `step` that is one of `STEPS`
- **AND** the stage's `step` SHALL equal the one named for its id above
- **AND** walking any list in order, the index of the `step` in `STEPS` SHALL never fall.

#### Scenario: The next output returns the step

- **WHEN** `next` runs for a project at any stage
- **THEN** its result SHALL include `step`, equal to the `step` of the first unfinished stage
- **AND** the stage that `next` picks SHALL be the same as when the `step` values are ignored.

#### Scenario: The edit style ask carries the director note

- **WHEN** `next` runs for a standard `edit` project with the art-director mode on, at the `style` stage
- **THEN** the `ask` SHALL carry a `director` note
- **AND** the `ask` of every stage whose step is `direction` or `review`, in `film`, `web` and `ui` as well, SHALL carry it.

#### Scenario: Stage ids of film, edit and web stay

- **WHEN** the stage ids per tier and mode of `film`, `edit` and `web` are compared with those before this change
- **THEN** they SHALL be equal, with one exception: `web` at `quick` in `replicate` mode gains `reference` as its first stage (see "Modes mean one thing")
- **AND** no stage id SHALL be renamed.

### Requirement: Tiers and modes only remove stages from one master list

Each deliverable SHALL have one master list, which is its `standard` tier list in `replicate` mode:

- `film`: `intake`, `reference`, `concepts`, `plan`, `build`, `check`, `review`, `deliver`.
- `edit`: `intake`, `analyze`, `reference`, `style`, `cut`, `render`, `check`, `review`, `deliver`.
- `web`: `intake`, `reference`, `concepts`, `build`, `probe`, `review`, `deliver`.
- `ui`: `intake`, `reference`, `concepts`, `work`, `probe`, `review`, `deliver`.

The master list SHALL hold every stage of every tier and mode of that deliverable, in order. The stage
list of every tier and mode SHALL be an ordered subset of it: a tier or a mode SHALL NOT add a stage
and SHALL NOT change the order. The `full` list SHALL equal the `standard` list. The `freeform` list
SHALL equal the `brief` list. No stage id and no `decide --stage` value SHALL be renamed. A stage
SHALL be absent from a list (or, under `freeform`, finished with nothing) only for one of these reasons:

- the `quick` tier (intake, the concept or style pick, review, deliver, and the reference study
  unless the mode is `replicate`; `edit` keeps `analyze` at `quick` because `cut` reads what it
  writes);
- `freeform` mode (the reference study; the `reference` stage stays in the list and is finished with
  nothing);
- a recorded decline of references in `brief` mode (`decide --stage reference --answer none`); this
  SHALL NOT be allowed in `replicate` mode;
- the nature of the deliverable: `edit` has `reference` only in `replicate` mode, and only `film` has
  an early gate (`storyboard`, in its `plan` stage).

An agent SHALL NOT skip a stage for any other reason.

#### Scenario: Every list is an ordered subset of its master list

- **WHEN** the stage ids of all 36 cells (4 deliverables, 3 tiers, 3 modes) are listed
- **THEN** each list SHALL be an ordered subset of the master list of its deliverable
- **AND** the `standard` list in `replicate` mode SHALL contain every stage id that appears in any other cell of that deliverable.

#### Scenario: Full and standard have the same stages

- **WHEN** the stage ids at `full` and at `standard` are compared for each deliverable and each mode
- **THEN** they SHALL be equal
- **AND** the `freeform` list of every cell SHALL equal the `brief` list of that cell.

#### Scenario: An agent cannot waive the reference in replicate

- **WHEN** a project in `replicate` mode is at the stage `reference` and receives `decide --stage reference --answer none`
- **THEN** the call SHALL be refused
- **AND** the project state SHALL be unchanged.

### Requirement: The ui deliverable follows the same steps as web

The stage lists of `ui` SHALL be:

- `quick`: `work`, `probe`. In `replicate` mode `reference` comes first: `reference`, `work`, `probe`.
- `standard` and `full`: `intake`, `reference`, `concepts`, `work`, `probe`, `review`, `deliver`, in
  every mode.

The stage `work` SHALL be finished when `interaction.json` exists. It SHALL NOT be finished by a
`deliver` decision. The stage `probe` of `ui` SHALL be its own stage: it SHALL run `verify interaction
--probe interaction.json` and use the existing gate `interaction`. Its finish rule SHALL list
`interaction.json`, the page file that the probe's relative `url` names (a file inside the project folder)
and the same nine evidence files that web lists under `evidence/composition/<size>/`, which the same
command writes. As for `web`, an http(s) `url`, a `url` that leads outside the folder, a page file that
does not exist, or a missing or invalid probe file SHALL keep `probe` open. It SHALL NOT list a fixed
`index.html`. It SHALL read the probe with the function that `web` uses, `probeBinding` in
`skill/scripts/composition-page-core.cjs`, so that one probe file gives both deliverables the same list.
The three-size first-screen check of `add-web-composition-checks` runs inside `verify
interaction`, so `ui` gets it through the same command and `ui.cjs` SHALL NOT add code for it. The stage
`review` of `ui` SHALL be its own stage with the same decision contract as the
web review (the same finish rule and `record` string as the shared review), and its text SHALL say
`screen`. `ui` SHALL NOT import stage objects from `web.cjs`. The stage `concepts` SHALL have its own `ui`
prompt; its finish rule and its `decide` string SHALL be the shared ones. The `ui` intake questions SHALL
NOT change. There SHALL be no `deliver` stage at `quick`.

A guide `skill/references/workflow-ui.md` SHALL exist with one `##` heading per `ui` stage id, and every
guide anchor that `next` returns for `ui` SHALL resolve to a heading of that file. This slice SHALL NOT
change the CLI and SHALL NOT add a gate, a receipt or a schema.

#### Scenario: The ui stage ids per tier and mode

- **WHEN** the stage ids of a `ui` project are listed for `quick`, `standard` and `full` in `brief`, `replicate` and `freeform` mode
- **THEN** they SHALL equal the lists above
- **AND** each SHALL be an ordered subset of `intake`, `reference`, `concepts`, `work`, `probe`, `review`, `deliver`.

#### Scenario: ui quick cannot finish without a fresh interaction pass

- **WHEN** a `ui` project at `quick` has `interaction.json` and no passed `interaction` record
- **THEN** `next` SHALL be at `probe`, not `done`
- **AND** with a passed `interaction` record whose inputs are fresh, `next` SHALL be `done`
- **AND** a `deliver` decision SHALL NOT change either result.

#### Scenario: A ui project without index.html can finish probe

- **WHEN** a `ui` project at `quick` has no `index.html`, has `interaction.json` whose `url` is `screen.html`, has `screen.html`, has the nine evidence files, and has a passed `interaction` record
- **THEN** `next` SHALL be `done`
- **AND** deleting `screen.html` or any one of the nine evidence files SHALL reopen `probe`
- **AND** when the `url` of the probe is an `http` URL, `next` SHALL stay at `probe`, as for `web`.

#### Scenario: ui replicate at quick starts at reference

- **WHEN** a `ui` project is created at `quick` in `replicate` mode
- **THEN** the first stage SHALL be `reference`
- **AND** the waiver of `reference` SHALL be refused.

#### Scenario: Every ui stage names a guide heading that exists

- **WHEN** `next` runs at each stage of a `ui` project and the guide anchor it returns is read
- **THEN** the anchor SHALL name `workflow-ui.md` and a `##` heading that exists in it
- **AND** the headings of `workflow-ui.md` SHALL include one for each `ui` stage id.

#### Scenario: The other deliverables and the ui intake do not change

- **WHEN** `next` runs at `intake`, `concepts` and `review` for `film`, `edit` and `web`
- **THEN** each output SHALL equal the output before this change, apart from the added `step` field and the `director` note where "Every deliverable follows the same six steps" adds it
- **AND** the `ui` intake question ids SHALL still be `product`, `audience`, `scope`, `assets`
- **AND** the web `review` output SHALL equal its output before this change.

### Requirement: Modes mean one thing

In `replicate` mode the `reference` stage SHALL NOT be waivable at any tier of any deliverable. That
holds for `film`, `edit`, `web` and `ui`. At the `quick` tier of `web` and `ui`, `replicate` mode SHALL
add `reference` as the first stage. When the waiver is refused, `next` SHALL NOT offer a `then` line
for it. In `freeform` mode the `reference` stage SHALL be finished with no file and no decision, and
it SHALL stay in the list, so that the stage ids of `freeform` equal those of `brief`. This
requirement SHALL NOT set any content rule for `freeform`; that belongs to
`add-web-capability-skills`.

#### Scenario: Freeform finishes the reference with nothing

- **WHEN** a project in `freeform` mode, at a tier and for a deliverable that lists `reference`, has no `reference.md` and no `reference` decision
- **THEN** `reference` SHALL count as finished and `next` SHALL move on
- **AND** the stage ids of every `freeform` cell SHALL equal those of the `brief` cell of the same deliverable and tier.

#### Scenario: Replicate cannot be waived anywhere

- **WHEN** `decide --stage reference --answer none` is sent to a `replicate` project that is at the stage `reference`, for each deliverable at each tier
- **THEN** the call SHALL be refused and the state SHALL be unchanged
- **AND** the `reference` action SHALL NOT offer a `then` line that records the waiver.

#### Scenario: Replicate at web quick starts with the reference

- **WHEN** a `web` project is created at `quick` in `replicate` mode
- **THEN** the stage ids SHALL be `reference`, `build`, `probe`.

### Requirement: Ceremony is the same for every deliverable

Ceremony per tier SHALL be the same for `film`, `edit`, `web` and `ui`:

- `quick` SHALL keep the make and verify stages. `edit` also keeps `analyze`. `replicate` mode adds
  `reference`. `quick` SHALL ask nobody: no intake reply, no pick, no verdict. Every gate of the
  verify stage SHALL still pass.
- `standard` SHALL keep the whole master list. It SHALL ask for the intake reply and for two human
  decisions: the pick (one of three concepts, or `mad` or `pv` for `edit`), and the verdict on the
  draft (accept or reject).
- `full` SHALL have the same stage ids and the same decisions as `standard`. The first make action
  SHALL carry a structured field `openspec: "required"`. That action is `plan` for `film`, `cut` for
  `edit`, `build` for `web` and `work` for `ui`. No other action of any tier SHALL carry the field.

`deliver` SHALL be recorded by the agent; it is not a third human decision. The field is an
instruction to the agent. This requirement SHALL NOT claim that `next` checks that an OpenSpec change
folder exists, and `next` SHALL carry on whether or not it does.

#### Scenario: Quick asks nobody

- **WHEN** the stage lists of all four deliverables at `quick` are read, in `brief` mode
- **THEN** none SHALL contain `intake`, `concepts`, `style`, `review` or `deliver`
- **AND** each SHALL contain its make stage and its verify stage.

#### Scenario: Standard asks for the intake reply and two decisions

- **WHEN** the stage list of each deliverable at `standard` is read
- **THEN** it SHALL contain `intake`
- **AND** it SHALL contain one pick stage (`concepts`, or `style` for `edit`) and `review`.

#### Scenario: Full film opens the change at plan

- **WHEN** `next` runs for a `film` project at `full` at the stage `plan`
- **THEN** the action SHALL carry `openspec: "required"`
- **AND** the `plan` action at `quick` and at `standard` SHALL NOT carry the field
- **AND** the `build` action at `full` SHALL NOT carry it.

#### Scenario: Full edit opens the change at cut

- **WHEN** `next` runs for an `edit` project at `full` at the stage `cut`
- **THEN** the action SHALL carry `openspec: "required"`
- **AND** the `cut` action at `quick` and at `standard` SHALL NOT carry the field
- **AND** the `render` action at `full` SHALL NOT carry it.

#### Scenario: Full web opens the change at build

- **WHEN** `next` runs for a `web` project at `full` at the stage `build`
- **THEN** the action SHALL carry `openspec: "required"`
- **AND** the `build` action at `quick` and at `standard` SHALL NOT carry the field
- **AND** the `probe` action at `full` SHALL NOT carry it.

#### Scenario: Full ui opens the change at work

- **WHEN** `next` runs for a `ui` project at `full` at the stage `work`
- **THEN** the action SHALL carry `openspec: "required"`
- **AND** the `work` action at `quick` and at `standard` SHALL NOT carry the field
- **AND** the `probe` action at `full` SHALL NOT carry it.

#### Scenario: Full has the same stages as standard

- **WHEN** the stage ids at `full` and `standard` are compared for each deliverable
- **THEN** they SHALL be equal
- **AND** `next` SHALL still reach the stage after the first make stage when no change folder exists.

### Requirement: A decision answers the question being asked

`decide --stage X` SHALL be refused unless the first unfinished stage is X. The pick uses `--stage
concept`, which SHALL match the stage ids `concepts` and `style`; `intake`, `reference`, `review` and
`deliver` SHALL match themselves. The refusal SHALL use the error code `OUT_OF_TURN`. Its message SHALL
name the current stage and say to run `next`. The project state SHALL be unchanged by a refusal. The turn check SHALL come first: a call that is out of turn SHALL be refused with `OUT_OF_TURN` even when its answer would also be refused for another reason (for example a `deliver` answer that names a missing file).
At `standard` and `full`, `decide --stage review --verdict reject` SHALL also be accepted while `deliver`
is the first unfinished stage and when every stage is finished (`done`), because a person may change
their mind before or after delivery. Every other out-of-turn call SHALL be refused with `OUT_OF_TURN`,
and at `done` its message SHALL say the job is done. At `quick` there is no review, so every call at
`done` SHALL be refused.

A concept pick for `concepts` SHALL be refused while `concepts.md` does not exist. A `deliver` decision
SHALL need `--answer`, which SHALL be a URL (`scheme://...`) or a path to a file that exists inside the
project root; otherwise the call SHALL fail with the existing code `INPUT_MISSING`. The refusal of a
waiver in `replicate` mode SHALL keep its message. Nothing else about `decide` SHALL change. This
requirement cannot tell a person from an agent: it stops answers that come early or late, not an agent
that answers for the user at the right time.

#### Scenario: An early review accept is refused

- **WHEN** a `film` project at `standard` is at `intake` and `decide --stage review` is called with an accept
- **THEN** the call SHALL fail with the code `OUT_OF_TURN`
- **AND** the error message SHALL contain the stage id `intake`
- **AND** the project state SHALL be byte-for-byte unchanged.

#### Scenario: Answering review and deliver first no longer skips the person

- **WHEN** a `film` project at `standard` gets `decide` for `review` (accept) and then for `deliver` (`final.mp4`), before its other stages are done
- **THEN** the first call SHALL be refused with `OUT_OF_TURN`
- **AND** the second call SHALL be refused too
- **AND** after the other stages are done in order, `next` SHALL ask the person to review the draft and SHALL NOT be `done`.

#### Scenario: Deliver at quick is refused

- **WHEN** `decide --stage deliver --answer https://example.com/x` runs for a `ui` project at `quick`
- **THEN** the call SHALL fail with the code `OUT_OF_TURN`
- **AND** the state SHALL be unchanged.

#### Scenario: A pick without concepts.md is refused

- **WHEN** `decide --stage concept` runs at the stage `concepts` and no `concepts.md` exists
- **THEN** the call SHALL be refused
- **AND** no pick SHALL be recorded.

#### Scenario: The style pick matches the concept value

- **WHEN** `decide --stage concept` is called with the answer `mad` for an `edit` project whose first unfinished stage is `style`
- **THEN** the call SHALL be accepted.

#### Scenario: Deliver with a missing file is refused

- **WHEN** the first unfinished stage is `deliver` and `decide --stage deliver --answer final.mp4` runs with no such file inside the project root
- **THEN** the call SHALL fail with the code `INPUT_MISSING`
- **AND** `delivered` SHALL NOT be set
- **AND** the same holds for a call with no `--answer`, and for a path outside the project root.

#### Scenario: Deliver with a URL is accepted

- **WHEN** the first unfinished stage is `deliver` and `decide --stage deliver --answer https://example.com/film` runs
- **THEN** the call SHALL be accepted and `delivered` SHALL be recorded.

#### Scenario: After delivery only a reject is accepted

- **WHEN** a `film` project at `standard` is `done` and `decide --stage review --verdict reject` runs with a reason
- **THEN** the call SHALL be accepted, a project rule SHALL be added and `delivered` SHALL be cleared
- **AND** `decide --stage intake --answer x` at `done` SHALL be refused with `OUT_OF_TURN`, and its message SHALL say the job is done.

#### Scenario: A reject is accepted while deliver is open

- **WHEN** a `film` project at `standard` has an accepted review and is at the stage `deliver`, and `decide --stage review --verdict reject` runs with a reason
- **THEN** the call SHALL be accepted and a project rule SHALL be added
- **AND** `decide --stage review --verdict accept` at `deliver` SHALL be refused with `OUT_OF_TURN`.

#### Scenario: A quick job at done accepts no decision

- **WHEN** a `film` project at `quick` is `done` and any `decide` call runs
- **THEN** the call SHALL be refused with `OUT_OF_TURN`
- **AND** the state SHALL be unchanged.

### Requirement: A stage is not finished while a file its gate read is missing

`gatePassed` in `skill/scripts/workflows/shared.cjs` SHALL return false when the record of the gate is
not `passed`, or when any entry of the list of inputs is empty (`null`, `undefined` or an empty path) or
names a file that does not exist on disk. A file that exists with no bytes SHALL NOT count as missing.
Otherwise the clock rule that exists today SHALL stay. This SHALL hold for every gate that uses
`gatePassed`: `storyboard`, `film`, `edit` and `interaction`, and any gate added later. The rule SHALL
change no stage list, no CLI command and no stored record.

#### Scenario: A deleted probe file reopens probe

- **WHEN** a `web` project at `quick` has every file its `probe` lists (today `interaction.json` and `index.html`; after `add-web-composition-checks`, `interaction.json`, the page file the probe's `url` names and the nine evidence files) and a passed `interaction` record, and `interaction.json` is deleted
- **THEN** `next` SHALL NOT be `done`
- **AND** `next` SHALL be at `probe`.

#### Scenario: Deleting any listed input of any gate stops next from advancing

- **WHEN** each of the gates `storyboard` (film `plan`), `film` (film `check`), `edit` (edit `check`) and `interaction` (web `probe`) is recorded as passed with every listed input present, and then one listed input is deleted
- **THEN** the stage that runs the gate SHALL NOT be finished
- **AND** `next` SHALL NOT be `done` and SHALL NOT be at a later stage.

#### Scenario: The helper itself refuses a missing file or an empty entry

- **WHEN** `gatePassed` is called with a passed record and a list that holds a path that does not exist, and again with a list that holds a null entry
- **THEN** it SHALL return false both times
- **AND** with every path present and not newer than the record it SHALL return true
- **AND** a listed file that exists with no bytes SHALL NOT be treated as missing.

### Requirement: A passed gate rests on the files it read

A gate record SHALL have the shape `state.gates.<gate> = { status, at, inputs }`, where `inputs` maps
each project-relative path (forward slashes) to the SHA-256 hash of that file. `at` SHALL be kept for
people to read and SHALL NOT be compared with a file time. The fingerprints of files a check reads SHALL
be taken before it reads them; the fingerprints of files the command writes itself (for example the
nine picture and result files that `verify interaction` writes for a web page) SHALL be taken right after they are written; both SHALL be taken
before the record is stored. A record with no `inputs` SHALL never count. A stage that runs a gate SHALL
be finished only if
every declared input file exists, each hash equals the record, and the set of paths equals the
record's set. No clock SHALL be involved.

Each verify stage SHALL declare one input list per gate it runs: as a list of gates, each with its own
`inputs(state, root)`. `plan` of `film` SHALL list `storyboard`; `check` of `film` SHALL list `film`;
`check` of `edit` SHALL list `edit`; the `probe` of `web` and the `probe` of `ui` SHALL each list one
gate, `interaction`, with one input list. `snapshot(root, gate, paths)` in
`skill/scripts/workflow-core.cjs` SHALL return the map of hashes of the files that the stage which
declares the gate lists for it, or of only the listed `paths` when they are given, or `null` when there is
no state file or no stage declares the gate. A call site that reads some files and writes others SHALL
call it twice, the files it reads before the check and the files it writes right after the write, and
join the two maps. `recordGate(root, gate, status,
inputs)` SHALL store the record and return `{ recorded: true }`, or return `{ recorded: false, reason }`
when `inputs` is `null`. Each file SHALL be hashed at most once per `next` call.

The input lists SHALL be: for `storyboard`, `storyboard.json`; for `film`, `storyboard.json`,
`score-grid.json` (when it exists), `index.html`, `compositions/*.html`, the local script files those pages
load with `<script src>`, `.design-pipeline/hyperframes-catalog.json` (when it exists) and the newest
render; for `edit`, `edit.json`, `edit/analysis.json` and the render; for `interaction` of `web`,
the list that web's `probe` builds after `add-web-composition-checks` (`interaction.json`, the page file
that the probe's relative `url` names, and the nine evidence files under `evidence/composition/<size>/`;
before that change, `interaction.json` and `index.html`); for `interaction` of `ui`, `interaction.json`, the
page file that the probe's relative `url` names and the same nine evidence files. For both, an http(s)
`url`, a `url` leading outside the project folder, a page file that does not exist, or a missing or
invalid probe file keeps `probe` open (the command may still run and record, but `next` does not finish
the stage).

The draft of `film` SHALL be the newest render, for `next` and for `film check` alike. A `verify` or
`film check` result SHALL say `recorded: false` and the reason when there is no state file next to the
checked file. A gate that no stage of the deliverable declares SHALL NOT be recorded. This requirement
SHALL NOT claim the record covers files that a page loads other than the local scripts a film page loads
with `<script src>`, or a page served over `http`.

#### Scenario: Different bytes with an old file time reopen the stage

- **WHEN** a `film` project at `quick` has both gates recorded as passed, and different bytes are written to `storyboard.json` with its file time set an hour back
- **THEN** `next` SHALL return to the stage that runs the `storyboard` gate.

#### Scenario: A file time moved with the same bytes does not reopen it

- **WHEN** the file time of `out.mp4` is moved forward and its bytes are not changed
- **THEN** `next` SHALL NOT reopen `check`.

#### Scenario: A deleted input reopens the stage

- **WHEN** a `web` project at `quick` has every file its `probe` lists and a passed `interaction` record, and `interaction.json` is deleted
- **THEN** `next` SHALL be at `probe`, not `done`.

#### Scenario: A newer render reopens check

- **WHEN** a `film` project at `quick` has `out.mp4` and both gates passed, and a newer `renders/newer.mp4` is added
- **THEN** `next` SHALL reopen `check`
- **AND** `next` and `film check` SHALL pick the same render.

#### Scenario: An edit to a file the film check read reopens check

- **WHEN** a `film` project at `quick` has both gates passed, and a local script file that `index.html` loads with `<script src>` is changed
- **THEN** `next` SHALL return to `check`
- **AND** the same holds for `index.html`, a file under `compositions/` and `score-grid.json` when it exists.

#### Scenario: A record without inputs does not finish a stage

- **WHEN** a passed gate record is written by hand with no `inputs`
- **THEN** the stage that runs the gate SHALL NOT be finished
- **AND** the same holds for a record whose set of paths differs from the declared one.

#### Scenario: A pass with no state file is reported as not recorded

- **WHEN** `verify film-storyboard` runs on `sub/storyboard.json` in a folder with no `.design-pipeline/state.json`
- **THEN** the result SHALL include `recorded: false` and a reason
- **AND** the check status and exit code SHALL be those of the check itself
- **AND** `film check` in the same situation SHALL include `recorded: false` and a reason.

#### Scenario: An undeclared gate is not recorded

- **WHEN** `snapshot(root, gate, paths)` runs for a gate that no stage of the project's deliverable declares
- **THEN** it SHALL return `null`
- **AND** `recordGate` with that `null` SHALL return `recorded: false` and SHALL store nothing.

### Requirement: A person's verdict is about the draft they saw

A verdict SHALL be stored as `state.decisions.drafts[i] = { verdict, reason, at, subject }`, where
`subject` maps each path to its SHA-256 hash and equals the merged `inputs` of every gate of the
verify stage at the time of the verdict. The latest verdict whose `subject` equals the current snapshot
of the draft SHALL decide: an `accept` counts only while it is that latest verdict. A verdict with no
`subject` SHALL never count. A draft whose latest verdict is a `reject` SHALL get a `run` action that
says to rebuild and that carries the `record` string of the review decision, so that a person's accept of
the unchanged draft can still be recorded; it SHALL NOT get a second `ask`. Any new
verdict SHALL clear `state.decisions.delivered`. Rejection SHALL still add a project rule and clear the
verify records.

#### Scenario: An accept for an old draft is ignored

- **WHEN** a `film` project at `standard` has an `accept` and a `deliver` record, then different bytes are written to `out.mp4` and the `film` gate is passed again
- **THEN** `next` SHALL ask for a review of the new draft, not return `done`
- **AND** the old `accept` SHALL remain in `drafts` but SHALL NOT count.

#### Scenario: A rejected draft that comes back unchanged is rebuilt

- **WHEN** a draft is rejected and the same bytes pass the gate again
- **THEN** the action SHALL be a `run` action about rebuilding
- **AND** it SHALL NOT be an `ask`
- **AND** it SHALL carry the `record` string of the review decision.

#### Scenario: A person can overturn an earlier reject of the same draft

- **WHEN** a draft is rejected, the same bytes pass the gate again, and an `accept` is then recorded for that draft
- **THEN** the `review` stage SHALL be finished
- **AND** the earlier `reject` SHALL remain in `drafts`.

#### Scenario: A new verdict clears delivery

- **WHEN** a verdict is recorded while `state.decisions.delivered` is set
- **THEN** `state.decisions.delivered` SHALL be cleared.

#### Scenario: A verdict without a subject never counts

- **WHEN** `drafts` holds an `accept` with no `subject`
- **THEN** the `review` stage SHALL NOT be finished.

#### Scenario: Rejection keeps its old effects

- **WHEN** a verdict `reject` with a reason is recorded
- **THEN** a project rule SHALL be added from the reason
- **AND** the `film`, `edit` and `interaction` gate records SHALL be cleared.

### Requirement: done separates what was checked from what was decided

The evidence of `done` SHALL keep `delivered`, `gates` and `drafts`, and SHALL add `acceptance`, which
SHALL be `accepted` when a person's `accept` counts, and `not asked` when the tier has no review.
`gates` (Conformance) and `drafts` with `acceptance` (Visual Acceptance) SHALL NOT be merged into one
value. A gate result SHALL NOT claim acceptance.

#### Scenario: Quick done says nobody was asked

- **WHEN** a project at `quick` reaches `done`, for each of the four deliverables
- **THEN** `acceptance` SHALL be `not asked`
- **AND** `drafts` SHALL be empty.

#### Scenario: Standard done after an accept says accepted

- **WHEN** a project at `standard` reaches `done` after an `accept` that counts
- **THEN** `acceptance` SHALL be `accepted`.

#### Scenario: The old evidence keeps its shape

- **WHEN** `done` is returned for any tier
- **THEN** `delivered`, `gates` and `drafts` SHALL still be present with the shape they had before this change
- **AND** `gates` SHALL NOT contain a verdict and `drafts` SHALL NOT contain a gate result.

### Requirement: A ui delivery discloses changes to the host project's existing tests

When a `ui` job starts in an existing project (the project root holds `package.json`), `next
--deliverable ui` SHALL store in the state file, as `hostTests`, the test files found in the working
tree: files named `*.test.*` or `*.spec.*` with a JS or TS extension, and JS or TS files under a folder
named `tests` or `__tests__`, skipping `node_modules`, dot folders, `dist`, `build`, `out` and
`coverage`. For each it SHALL keep the path, the SHA-256 of the content, the titles (the first string
literal of `it(`, `test(` or `describe(`, with `.only`, `.skip`, `.todo`, `.concurrent`, `.sequential`
or `.fails`, or an `x`/`f` prefix), the number of lines with `expect(` or `assert(` and the number of
lines. The snapshot is the working tree, not git, so test edits made before the job started SHALL NOT
count. Files of other frameworks have no titles and are still tracked by path and content.

The comparison with the snapshot SHALL be made again from the working tree at every `next` and every
`decide`; nothing about the current tests SHALL be cached in the state, so delivering first and changing
tests afterwards SHALL NOT finish the job.

- a snapshot test file that is gone SHALL refuse `decide --stage deliver` (`status` `failed`, one
  finding `host-test-file-deleted` per file naming its titles, CLI exit 2, nothing recorded) and SHALL
  keep `work` unfinished at every `next`, even after a delivery, with those findings in the action;
- a content change of a snapshot test file SHALL NOT refuse anything: matching titles needs the meaning
  of the code, so a person decides. A change is weakening when a snapshot title is gone (removed or
  renamed) or the file has fewer titles or fewer assertion lines than in the snapshot. While weakening
  changes exist, `next` SHALL list the stage `test-review` after `work`, showing per weakened file the
  removed and added titles and the test, assertion-line and line counts before and after, and it SHALL
  be finished only when the last test-review verdict is `accept` and was recorded for exactly the
  current weakening changes (their digest); a verdict about older changes SHALL NOT count. Purely
  additive changes (no title gone, no count lower) and new test files SHALL need no verdict and SHALL
  be listed in the `done` evidence;
- state without `hostTests` (an older version) SHALL only report that the tests were not checked.

`decide --stage test-review --verdict accept|reject --answer <reason>` SHALL be refused when no
weakening changes exist, and SHALL otherwise record the verdict with the digest of the current changes in
`decisions.testReviews`, apart from the draft verdicts of `review` (Visual Acceptance). `reject` SHALL
clear the delivery (the job goes back to `work`) and add the reason as a project rule. The ask SHALL say
that the verdict is meant to be the user's and that the tool cannot prove who typed it.

`next --deliverable ... --replace` on a state that has `hostTests` SHALL be refused (exit 1, naming the
files) while a snapshot test file is gone, or weakened without an `accept` for exactly the current
changes; otherwise it SHALL start over with a new snapshot. When the job is `done`, `evidence` SHALL hold
`testChanges` (`since`, per changed file whether it is `weakening`, the removed and added titles and the
counts before and after, and `added`) and `testReviews`.

`test-review` is a disclosure-and-consent ask, not a gate and not an integrity guarantee: the snapshot,
the verdict and the state file are all writable by an agent (removing `hostTests` drops the checks to the
report of an older state). `SKILL.md` SHALL say so and name the host's CI or PR review against the merge
base, and the external evaluator in trials, as the real enforcement.

#### Scenario: A deleted test file refuses the delivery

- **WHEN** a `ui` job starts in a folder with `package.json` and `components/panel-registry.test.ts`, and the file is deleted before `decide --stage deliver`
- **THEN** the CLI SHALL exit 2 with `status` `failed` and a finding `host-test-file-deleted` naming the file and its titles
- **AND** `next` SHALL still be at `work`.

#### Scenario: The user's earlier test edit does not count

- **WHEN** a committed test file has an uncommitted edit before the first `next`, and the job adds only a new test file
- **THEN** the delivery SHALL be recorded with no changed file, the new file listed under `added`, and `next` SHALL be `done`.

#### Scenario: Changed tests wait for a person's verdict

- **WHEN** the job renames one test title and removes one assertion line in a snapshot test file, then delivers
- **THEN** `next` SHALL ask `test-review` listing the removed and added title and `assertionLines` `2 -> 1`
- **AND** after `reject` with a reason `next` SHALL be at `work` with the reason among `rules`
- **AND** after another delivery and `accept`, `next` SHALL be `done` with `completed` `work`, `test-review` and the two verdicts in `evidence.testReviews`, and `evidence.drafts` empty.

#### Scenario: Extending an existing test needs no verdict

- **WHEN** the job adds one test with one assertion to a snapshot test file and delivers
- **THEN** `next` SHALL be `done` with `completed` `work` only, and `evidence.testChanges.changed` SHALL list the file with `weakening` false, the added title, `tests` `3 -> 4` and `assertionLines` `2 -> 3`
- **AND** `decide --stage test-review` SHALL be refused, and `--replace` SHALL start over
- **AND** when instead a title is renamed while a test is added, `next` SHALL ask `test-review` naming the removed title.

#### Scenario: Changing tests after delivery reopens the job

- **WHEN** a job delivers with its tests untouched and then deletes a snapshot test file
- **THEN** `next` SHALL be at `work` with a `host-test-file-deleted` finding
- **AND** when the file comes back with one assertion line fewer, `next` SHALL ask `test-review`
- **AND** after `accept`, a further edit of that file SHALL make `next` ask `test-review` again.

#### Scenario: Starting over cannot hide unconfirmed test changes

- **WHEN** a snapshot test file loses an assertion line and `next --replace` is run for `ui` or `film`
- **THEN** it SHALL be refused naming the file as weakened
- **AND** after the deletion of that file it SHALL be refused naming it as deleted
- **AND** after delivery and an `accept` of the changes, `--replace` SHALL start over with a snapshot of the confirmed files
- **AND** in a job whose snapshot files are unchanged, `--replace` SHALL start over with a new snapshot.

#### Scenario: Old state only reports

- **WHEN** the state has no `hostTests` and a test file was deleted
- **THEN** the delivery SHALL be recorded and the result SHALL say the tests were not checked.

### Requirement: No new router, gate, receipt schema or stage rename

This change SHALL NOT add a fourth entry command, a gate id, a receipt, a schema file, or a stage
rename. It SHALL NOT rename a stage id or a `decide --stage` value, including `concept` against
`concepts`. The fields `step`, `openspec`, `inputs`, `subject`, `acceptance`, `hostTests`,
`decisions.testReviews` and `evidence.testChanges` SHALL be additive to records and outputs that
exist. The only added `decide --stage` value and `ui` stage SHALL be `test-review`, and the only finding
code SHALL be `host-test-file-deleted` (a refused `deliver`, not a gate). The only new error code SHALL
be `OUT_OF_TURN`. The state schema id `design-pipeline.workflow-state.v1` SHALL NOT change.
`add-web-composition-checks` adds no gate id: its check runs inside the existing `interaction` gate,
and this change SHALL NOT define another.

When the changes that hold older sentences are archived, two are superseded by this one: the `ui` stage
ids and order pinned by the `tool-guidance` requirement "The ui intake asks about what is built" (its
sentence and its scenario "The ui stages do not move"), and the requirement "fresh gate results" of
`split-film-edit-workflows` (fresh by content, not by file time). The requirements "ceremony tiers",
"two human decisions" and "project state" of `redesign-user-workflow` are kept, and this change makes
them true for every deliverable. None of these is in `openspec/specs/` yet, so this change adds
requirements of its own and does not use MODIFIED.

#### Scenario: Ids, values and exit codes stay

- **WHEN** the state schema id, the stage ids of `film` and `edit` and of `web` (apart from the one `web` quick `replicate` case named in "Modes mean one thing"), the `decide --stage` values (apart from the added `test-review`), and the CLI exit codes are compared with those before this change
- **THEN** they SHALL be equal.

#### Scenario: The help lists the same commands

- **WHEN** the command names in `designer-pipeline --help` are compared with those before this change
- **THEN** they SHALL be the same
- **AND** no gate id, receipt or schema file SHALL have been added by this change, and no finding code other than `host-test-file-deleted`.

#### Scenario: The only new error code is OUT_OF_TURN

- **WHEN** the error codes of `decide` and `next` are compared with those before this change
- **THEN** the only code added SHALL be `OUT_OF_TURN`
- **AND** a missing or bad `deliver` answer SHALL still use `INPUT_MISSING`.

# Design

Follows `AGENTS.md`, `openspec/project.md` and `skill/references/plain-language.md`. Words are plain
on purpose; the words this design needs are explained in section 0. Every decision has its reason, and
section 11 gives the fallback for the open ones. Nothing here is built: this change is a design, a spec
and a plan, and writing it edits no file under `skill/`, `tests/` or `scripts/`.

## 0. Words used

- **Deliverable**: what is being made. One of `film`, `edit`, `web`, `ui`.
- **Tier**: how much ceremony. `quick`, `standard` or `full`.
- **Mode**: how the job starts. `brief` (the default), `replicate` (reproduce a reference the user
  gave) or `freeform` (the user gave no direction).
- **Stage**: one step of the `next` loop, with a fixed id such as `intake`, `plan` or `probe`. Each
  deliverable has its own list of stages per tier. Stage ids are not renamed by this change.
- **Step**: one of six common names for what a stage does (section 3.1). A step is a label. It never
  chooses the next stage; the stage list does.
- **Gate**: a check that must pass. A gate finds known failure shapes. It never says a result is
  good.
- **Gate record**: the note that `next` keeps in `.design-pipeline/state.json` that a gate ran and what
  it said (`state.gates.<gate>`).
- **Snapshot**: a short code (a SHA-256 fingerprint) worked out from the contents of each file a
  check read. Change one byte and the code changes.
- **Draft**: what a person is asked to judge: a video, a page or a screen.
- **Master list**: the stage list of a deliverable at `standard` tier in `replicate` mode. It holds
  every stage that any tier or mode of that deliverable uses (section 3.3).
- **Conformance** and **Visual Acceptance**: what the gates found, and what a person decided about
  the look and feel. `AGENTS.md` keeps them apart; so does this design.
- **Receipt**: a saved record that a check ran, with fingerprints. `AGENTS.md` names several kinds; this
  design adds none.
- **Schema**: the agreed shape of a saved file. Its id is a version label.
- **Entry command**: a command that tells you what to do next. There are three today: `next` with
  `decide`; `route` with `toolchain` and `execution`; and `change`, `status`, `plan` and `run`. The
  brief called them routers.
- **Finish rule**: the test a stage uses to say it is finished.
- **Ordered subset**: a shorter list that keeps the same stages in the same order.
- **Art-director mode**: a setting that sends the concept pick and the review to a named stronger model.
- **Wave**, **integrator**, **manifest**, **fixture**: a wave is a group of slices built together; the
  integrator is whoever merges the slices and runs `node scripts/qa.cjs`; the manifest is
  `scripts/test-manifest.json`, the list of test files that QA runs; a fixture is a small made-up
  project that a test builds.
- **Slice**: one part of the work, built by one worker. Section 8 lists them, S0 to S10.

## 1. How the facts were gathered

Read on 2026-09-30 in the working tree at `b631fcd`, with these uncommitted edits from other
changes present: `fix-tool-guidance-errors` (the `ui` intake in `skill/scripts/workflow-core.cjs`,
comments in `workflows/shared.cjs` and `workflows/web.cjs`, cases in `tests/workflow-next.test.cjs`,
tier text in `skill/SKILL.md`). Line numbers are of that tree and move when those land. Where a fact
is a guess it is marked `[INFERENCE]`.

Each "R" below is a throwaway script that called the real functions or the real CLI in a temporary
folder outside the repository. Nothing in the repository was written. The state calls are
`initState`, `decide`, `recordGate` and `nextAction` from `skill/scripts/workflow-core.cjs`.

- **R1 Matrix.** For each deliverable, tier and mode (36 cells), list the stage ids that `next` walks
  (`stages(state)` of `film.cjs`, `edit.cjs`, `web.cjs`; for `ui` the walk of `nextAction`). Then
  compare each stage's action text at `standard` and at `full`.
- **R2 Early answers.** Film, standard tier. First call `decide` for `review` (accept) and for
  `deliver` (`final.mp4`). Then do the other stages in order: intake, reference `none`, `concepts.md`
  and a pick, `storyboard.json` with a passed `storyboard` record, `out.mp4` with a passed `film`
  record. Then `nextAction`.
- **R3 Old verdict, new draft.** Film, standard. Walk to the review stage, accept, record `deliver`
  with `final.mp4` (the file does not exist). `nextAction`. Then write different bytes to `out.mp4`
  (written now: a future file time would look stale under today's clock rule), check `nextAction`,
  record a fresh `film` pass, check `nextAction` again.
- **R4 Clock, not content.** Film, quick, both gates recorded as passed. Write different bytes to
  `storyboard.json` and set its file time one hour back: `nextAction`. Then move only the file time of
  `out.mp4` forward without changing bytes: `nextAction`.
- **R5 Missing input.** Web, quick. `index.html` and `interaction.json` exist and the `interaction`
  record is passed. Delete `interaction.json`. `nextAction`.
- **R6 Two draft rules.** Film, quick, `out.mp4` present, both records passed. Add
  `renders/newer.mp4` with a later file time. `nextAction`.
- **R7 A bare claim.** `ui`, quick. `decide --stage deliver` with no answer. `nextAction`.
- **R8 Modes.** `initState` with `replicate` for web quick, `ui` standard and `ui` quick, then the first
  stage. A search of `skill/` and `tests/` for code that reads `freeform`.
- **R9 A pass recorded nowhere.** CLI: `next` (film, quick), `film scaffold --output .`, copy
  `storyboard.json` to `sub/`, `verify film-storyboard --storyboard sub/storyboard.json`, then read
  `.design-pipeline/state.json`, then `next`. Repeat with the file in the project root.
- **R10 Art director.** Edit and web, standard, with `director` set. Does the `style` ask and the
  `concepts` ask carry a `director` note?
- **R11 Cost of hashing.** SHA-256 of a 100 MB buffer in memory under Node v26.3.1. (Disk reads are
  not included.)
- **R12 Which gates lean on earlier stages.** For each gate, record it as passed with every input
  present, then delete one input at a time: film quick (`storyboard.json`, then `out.mp4`), edit quick
  (`edit.json`, then `renders/edit.mp4`), web quick (`interaction.json`, then `index.html`).
  `nextAction` after each. Also a search for `sha256` and `createHash` in `workflow-core.cjs` and
  `workflows/*.cjs` (none), and for code that reads the result file `verify interaction` writes,
  `evidence/interaction.json` (none; it is written at `cli-core.cjs:849` and is not an input of `probe`).

## 2. What the four workflows do today

### 2.1 Stage lists (R1)

| Deliverable | quick | quick, replicate | standard and full | standard and full, replicate |
| --- | --- | --- | --- | --- |
| film | plan, build, check | reference, plan, build, check | intake, reference, concepts, plan, build, check, review, deliver | same |
| edit | analyze, cut, render, check | analyze, reference, cut, render, check | intake, analyze, style, cut, render, check, review, deliver | intake, analyze, reference, style, cut, render, check, review, deliver |
| web | build, probe | build, probe | intake, reference, concepts, build, probe, review, deliver | same |
| ui | work | work | intake, work | intake, work |

Sources: `film.cjs:46-49`, `edit.cjs:52-56`, `web.cjs:81-84`, `workflow-core.cjs:42-45`. The lists for
`freeform` equal those for `brief` in every cell. `standard` and `full` have the same list for every
deliverable.

### 2.2 What a tier changes today

- **film, edit:** only the list. `standard` and `full` are identical, stage ids and action text
  (R1). `edit` also treats `style` as finished at quick and cuts as `mad` (`edit.cjs:24, 31`).
- **web:** `full` changes the `command` and the `why` line of the `build` action: the command starts "Open
  an OpenSpec change under `openspec/changes/<id>/` and build..." and the reason says "Full tier keeps
  OpenSpec lineage" (`web.cjs:55-57, 62`). Quick's `build` text has no treatment sentence (`web.cjs:61`).
- **ui:** `full` changes the `command` and the `why` line of `work` the same way; quick and standard
  say "no OpenSpec" (`workflow-core.cjs:43`).
- **The promise:** `skill/SKILL.md:35` says `full` "adds an OpenSpec change and full lineage" for all
  four deliverables. The 2026-09-28 design says the same (`openspec/changes/redesign-user-workflow/design.md:30-34`)
  and its requirement reads "OpenSpec artifacts SHALL be required only at the full tier"
  (`.../specs/design-pipeline/spec.md:12-14`).
- **The reference:** `skill/references/pipeline-reference.md` has no section on tiers. Its "Start
  Here" step 5 says "Create or update the OpenSpec change artifacts before implementation" (line 26)
  and line 50 says OpenSpec is the source of truth for meaningful changes.

### 2.3 What a mode changes today

- **replicate:** film adds `reference` at quick (`film.cjs:47`); edit adds it at every tier
  (`edit.cjs:53-55`). The waiver `decide --stage reference --answer none` is refused when the mode is
  `replicate` (`workflow-core.cjs:110`, `shared.cjs:49`). Web quick has no reference stage, and `ui`
  has none at any tier, so replicate changes nothing there (R8).
- **freeform:** accepted (`workflow-core.cjs:19`), advertised (`skill/SKILL.md:37`, help line
  `cli-core.cjs:397`), read by no code, used by no test (R8).

### 2.4 Where verify, review and deliver sit today

| | Verify stage and gate | Review | Deliver |
| --- | --- | --- | --- |
| film | `check`, gate `film` (`film.cjs:34-38`, recorded at `cli-core.cjs:1935`). It bundles storyboard, score grid, timeline, render, audio, composition and carry (`film-project-core.cjs:185-278`). `plan` has an early gate `storyboard` (`film.cjs:20-26`, `cli-core.cjs:801`). | shared (`shared.cjs:67-71`) | `film.cjs:40-44` |
| edit | `check`, gate `edit` (`edit.cjs:40-44`, `cli-core.cjs:1987`). It bundles the edit rules, render, audio and composition (`edit-project-core.cjs:81-120`). | shared | `edit.cjs:46-50` |
| web | `probe`, gate `interaction` (`web.cjs:67-73`, `cli-core.cjs:834-852`). Nothing else. | page text (`web.cjs:38-49`) | `web.cjs:75-79` |
| ui | none | none | none: `work` is finished by a `deliver` decision (`workflow-core.cjs:43`) |

Only four gates reach `next`: `storyboard`, `film`, `edit`, `interaction` (`cli-core.cjs:801, 850,
1935, 1987`). Every other check is invisible to it.

### 2.5 Human decisions today

- film and web: none at quick; at standard and full, two (pick one of three concepts; accept or
  reject the draft).
- edit: none at quick; at standard and full, two (`mad` or `pv`; accept or reject).
- ui: none at any tier. Only the reply to the intake questions.

The 2026-09-28 design says standard work has exactly two human decisions (Q3,
`redesign-user-workflow/design.md:11-12`), and its requirement "two human decisions" says the same
(`.../specs/design-pipeline/spec.md:16-18`). `ui` does not meet it.

## 3. The target

### 3.1 Six steps

Every job goes through the same six steps. A stage belongs to exactly one step.

1. **Intake.** The facts that change the result are written down (`brief.md`), or measured from what the
   user gave (edit's analysis of the footage and music).
2. **Direction.** The approach is chosen from real material before anything is made: references, and
   the person's pick.
3. **Make.** The thing is planned and built: a storyboard and a render, an edit list and a render, a
   page, some screens.
4. **Verify.** Gates check what exists now. This is the last step before a person sees a draft.
5. **Review.** A person looks at this draft and says accept or reject.
6. **Deliver.** The finished thing is named (a file that exists, or a URL) and that is recorded.

### 3.2 Where each stage sits

Cells say what changes: **same** (as today), **new** (added by this design) or **absent** (on purpose,
with the reason).

| Step | film | edit | web | ui |
| --- | --- | --- | --- | --- |
| Intake | `intake`: same | `intake`: same; `analyze`: same (it measures the footage and music the user gave) | `intake`: same (web questions) | `intake`: same (ui questions; standard and full) |
| Direction | `reference`, `concepts`: same | `reference`: same (replicate only); `style`: same (the pick is `mad` or `pv`) | `reference`, `concepts`: same | `reference`: **new**; `concepts`: **new** |
| Make | `plan`, `build`: same | `cut`, `render`: same | `build`: same | `work`: same id; it now ends when `interaction.json` exists, no longer on a `deliver` decision |
| Verify | `check`: same (`plan` also holds the early `storyboard` gate) | `check`: same | `probe`: same id; the same gate `interaction` also checks the first screen at three sizes (`add-web-composition-checks`) | `probe`: **new** (its own stage; it runs the same command and gate as web's, so it gets the same three-size check) |
| Review | `review`: same | `review`: same | `review`: same (page text) | `review`: **new** (page text, saying "screen") |
| Deliver | `deliver`: same | `deliver`: same | `deliver`: same | `deliver`: **new** |

One cell of an existing list changes: web at quick in replicate mode gets `reference` first (S4;
today it is `build`, `probe`). It is the only change to a film, edit or web stage list; every other new
stage belongs to `ui`.

Absent on purpose:

- **quick, every deliverable:** intake, the concept pick, review, deliver, and the reference study
  (unless the mode is replicate). Quick keeps a stage when a later stage reads what it writes: edit
  keeps `analyze` because `cut` reads `edit/analysis.json`. See section 6.
- **edit, outside replicate:** the `reference` stage (`edit.cjs:19-20`, `workflow-edit.md:24-28`).
  The reason is not written in the repository. [INFERENCE] The footage and music are the source, and
  `analyze` measures them.
- **web and ui:** no early gate in the make step (film has `storyboard`). Only a storyboard has a
  checkable shape before building. [INFERENCE]

### 3.3 One master list per deliverable

The master list is the standard-tier, replicate-mode list:

- film: intake, reference, concepts, plan, build, check, review, deliver
- edit: intake, analyze, reference, style, cut, render, check, review, deliver
- web: intake, reference, concepts, build, probe, review, deliver
- ui: intake, reference, concepts, work, probe, review, deliver

Rule: a tier or a mode may only remove stages from the master list. It never adds a stage and never
reorders. The in-flight tool list already requires this of every deliverable
(`openspec/changes/add-capability-registry/specs/tool-list/spec.md:72`), so this rule keeps that change
satisfied. It also means new stage ids are not needed for ceremony: `full` adds paperwork, not a
stage.

### 3.4 The picture

The one-page picture is in `docs/superpowers/specs/2026-09-30-workflow-lifecycle.md` (section "The
picture"). It shows the six steps, the two places a person decides, the quick shortcut, the
`full`-only paperwork and the reject loop.

## 4. Ceremony per tier

### 4.1 The rule

| Tier | Stages kept | People are asked | OpenSpec change | Gates |
| --- | --- | --- | --- | --- |
| quick | make and verify. Replicate adds the reference. Edit also keeps `analyze`, because `cut` reads what it writes. | nobody | not needed | every verify gate must pass |
| standard | the whole master list | the intake reply; two decisions (the pick; the verdict) | not needed | same |
| full | the whole master list (same as standard) | same as standard | required, opened before the first make stage | same |

The first make stage is `plan` for film, `cut` for edit, `build` for web and `work` for `ui`. That is
the point where direction is settled and making starts. Web and `ui` already open it there; film and
edit do not (D8).

What "an OpenSpec change" means in a user's project is what `skill/SKILL.md:76-77` and
`openspec/project.md` already say: a folder `openspec/changes/<id>/` with `proposal.md`, `design.md`
when the design needs one, `tasks.md` and spec deltas. It is an instruction, not a check: `next`
carries on whether or not the folder exists (as it does today for web and `ui`). To let a test prove the
rule without reading words, the first make action at `full` carries a structured field
`openspec: "required"`, and no other tier does.

### 4.2 Decision: film and edit at `full` match web and `ui`

Options: (a) make them match; (b) state that `full` is the same as `standard` for film and edit.

Chosen: (a). Reasons, each with evidence:

1. The front door promises it for every deliverable (`skill/SKILL.md:35`), and so does the design
   that created the tiers (Q15).
2. Without it, `full` selects nothing for two of four deliverables: same stages, same text (R1).
3. The film and web guides already send the reviewer to `qa.md` for creative review and rules R1 to
   R7 or W1 to W7 (`workflow-film.md:103-107`, `workflow-web.md:70`). A change folder is where a
   `full` job keeps that record.
4. The cost is one sentence and one field per stage module.

What (a) risks: OpenSpec in this repository is shaped around UI work (`pipeline-reference.md` "Stage
3: Design Spec"). For film and edit the change holds the brief, the chosen concept, the tasks and the
QA record; it asks for no `DESIGN.md` or `MOTION.md`. [INFERENCE] Not tried on a real `full` film. The
guide sentences written in S8 say what goes in.

(b) is honest but leaves a tier that does nothing. If the user prefers (b), S8 shrinks to a
correction of `skill/SKILL.md:35` and of the guides, and the `openspec` field stays on web and `ui`.

### 4.3 Human decisions per tier

| Tier | The user answers | The user decides | Recorded with |
| --- | --- | --- | --- |
| quick | nothing (the request is enough) | nothing | nothing |
| standard | the intake questions; may decline references (brief mode) | 1. the pick (one of three cards; `mad` or `pv` for edit) 2. accept or reject the draft | `decide --stage intake`, `reference`, `concept`, `review` |
| full | same as standard | same as standard | same |

`deliver` is recorded by the agent, not decided by a person. `full` adds no third decision: the change
is opened by the agent, and the person's verdict is about the draft, not the paperwork. The limit
(section 5.5): the CLI cannot tell a person from an agent, so `skill/SKILL.md` remains the only thing
that says "ask the user".

## 5. What "finished" means

### 5.1 The rule

A stage is finished only by evidence that exists now. There are three kinds:

1. **A file** that the stage's own step wrote (`brief.md`, `storyboard.json`, a render, `edit.json`,
   `index.html`, `interaction.json`).
2. **A person's answer**, recorded with `decide`, for the question `next` is asking now.
3. **A passed gate record** whose snapshot equals the fingerprints of those files today.

Six consequences:

- A gate record is about the exact files it read. Change one byte and the stage reopens. Touch a
  file without changing it and nothing reopens. No clock is involved.
- A missing file never counts. If a file the gate read is gone, the record is stale.
- A person's verdict is about the draft they saw. It carries the snapshot of the draft, and it counts
  only while the draft is unchanged. The latest verdict for a snapshot decides, so a person may overturn
  an earlier reject of the same draft by accepting it. A draft that was rejected and comes back
  unchanged is rebuilt, not shown again.
- A new verdict clears the record of delivery, because delivery belongs to the accepted draft.
- Delivery names something that exists: a URL, or a file inside the project.
- `decide` answers only the question being asked. An answer for a later stage is refused. At standard and
  full a reject of the review is also accepted while `deliver` is open and when every stage is finished: a
  person may change their mind before or after delivery.

`done` reports two separate groups: what the gates found (Conformance) and what a person decided
(Visual Acceptance). At quick it says that no person was asked. It never merges the two.

### 5.2 What each gate rests on

A record is only as strong as the list of files behind it. Each stage that runs a gate names its lists in
code, one list per gate it runs.

| Deliverable | Gate | Files the record must name | Known gap |
| --- | --- | --- | --- |
| film | `storyboard` | `storyboard.json` | none known |
| film | `film` | `storyboard.json`, `score-grid.json` (when it exists), `index.html`, `compositions/*.html`, the local script files those pages load with `<script src>` (the check scans them, and an error there fails it), `.design-pipeline/hyperframes-catalog.json` (when it exists; it supplies the block names), the newest render (the file `film check` itself picks) | text boxes: the picture check reads pixels only (`workflow-film.md:86-88`); `timeline.json` (the check writes it; it reads an old one when there is no `index.html`, or when the capture fails, and then the step is stale and cannot pass); `hyperframes.json` (it only chooses how the page is captured) |
| edit | `edit` | `edit.json`, `edit/analysis.json`, the render | none known |
| web | `interaction` | The list that web's `probe` builds after `add-web-composition-checks`, which reads `interaction.json`: `interaction.json`, the page file that the probe's relative `url` names (a file inside the project folder) and nine files under `evidence/composition/<size>/` (`screenshot.png`, `elements.json` and `result.json` at three sizes). An http(s) `url`, a `url` leading outside the folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open, and its action says what to change. The command writes the nine files before it records the gate, so they are fingerprinted right after they are written (5.3). | files the page loads (styles, scripts, images); a page served over `http` never finishes `probe` |
| ui | `interaction` | `interaction.json`, the page file that the probe's relative `url` names (a file inside the project folder) and the same nine evidence files as web (the same command writes them). The same rule as web: an http(s) `url`, a `url` leading outside the folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open. No fixed `index.html`: a `ui` project need not have one, and after S0 a listed file that is missing blocks the stage. `ui.cjs` gets the list from `probeBinding(root)` in `skill/scripts/composition-page-core.cjs` (added by S1), a plain helper that holds no stage. | as web; work with no page to open needs a small preview page in the project folder |

`film check` reads more than the `check` stage lists today (`film.cjs:36` lists `storyboard.json` and the
draft). It also reads `index.html`, `compositions/*.html`, `score-grid.json`, the script files those pages
load, and the block catalog (`film-project-core.cjs:191-236`; `film-timeline-core.cjs:300-322`). An edit to
any of them after a pass does not reopen `check` today. The list above fixes that.

[INFERENCE] The interaction capture already looks at every request the page makes
(`interaction-core.cjs:243-254`), so a later slice could take the list of local files from there. Not
verified, and not part of this design.

### 5.3 The records, in plain shape

```
state.gates.<gate>          = { status, at, inputs: { "<path>": "<sha256>" } }
state.decisions.drafts[i]   = { verdict, reason, at, subject: { "<path>": "<sha256>" } }
```

- `at` stays for people to read. It is no longer compared with a file time.
- Paths are relative to the project root and use forward slashes.
- Fingerprints of the files a check reads are taken before it reads them. Fingerprints of files the
  command writes itself (the nine picture and result files that `verify interaction` writes for a web
  page, in the same command and before it records the gate) are taken right after they are written. Both
  are taken before the record is stored, so a file that changes while a check runs cannot slip into the
  record.
- The `subject` of a verdict is the merged `inputs` of every gate of the verify stage, taken from the
  records at the time of the verdict. For web and `ui` that includes the nine picture and result files
  (see the risk in section 12).
- This extends the existing record. It is not a new schema: same file, same keys, same two functions
  (`recordGate`, `gatePassed`), one optional field each. The state schema id
  `design-pipeline.workflow-state.v1` does not change.
- It is not the component-first v1 Gate receipt (target, snapshot, policy digest), and it neither
  replaces nor reuses it.
- Nobody outside `workflow-core.cjs` and `shared.cjs` reads `state.gates` (searched in `skill/scripts`,
  `scripts` and `tests`). A reader outside this repository cannot be ruled out.
- The plan is to hash each file at most once per `next` call. Hashing 100 MB took about 48 ms in memory
  (R11).

### 5.4 Migration

A record with no `inputs` never counts, and a verdict with no `subject` never counts. Every project in
flight reruns each gate once and is asked to review once more. There is no legacy path.

### 5.5 What the rule cannot do

- It cannot tell a person from an agent. It stops answers that come early or late, not an agent that
  answers for the user at the right moment.
- It cannot see files a page loads (other than the local scripts a film page loads with `<script src>`), or a
  page served over `http`.
- It cannot check that an OpenSpec change exists.
- It cannot judge quality. Gates find failure shapes. Acceptance is a person's.

### 5.6 Names this design fixes

These are the names the spec, the tasks and the plan use.

- `STEPS` in `skill/scripts/workflows/shared.cjs`, a `step` on every stage, and `step` in the `next` output.
- A stage may carry `gates: [{ id, inputs(state, root) }]`, one entry per gate it runs.
- `snapshot(root, gate, paths)` in `workflow-core.cjs` returns the fingerprints of the files that the stage
  declaring the gate lists for it, or of only the listed `paths` when they are given, or `null` when there
  is no state file or no stage declares it. A call site that reads some files and writes others calls it
  twice (the files it reads before the check, the files it writes right after the write) and joins the two
  maps.
- `recordGate(root, gate, status, inputs)` stores the record and returns `{ recorded: true }`. When
  `inputs` is `null` it stores nothing and returns `{ recorded: false, reason }`; the CLI copies that
  into its result.
- The refusal of `decide` uses the error code `OUT_OF_TURN`, the only new code. A bad or missing `deliver`
  answer uses the existing code `INPUT_MISSING`.
- `openspec: "required"` on the first make action at `full`. `acceptance` on `done`.

### 5.7 Decision: how a gate record is judged fresh

The question: when may `next` treat a passed gate as still true?

- **Today.** A record is `{ status, at }` (`workflow-core.cjs:136`). `gatePassed` counts it when the status
  is `passed` and `at` plus 50 ms is not older than the newest file time of the files the stage lists
  (`shared.cjs:21-26`). A missing file has time 0, and an empty entry is dropped (`shared.cjs:13, 24`). The
  workflow modules contain no hash, and no code reads the result file that `verify interaction` writes
  (R12). One helper serves film, edit and web. Four gates use it: `storyboard`, `film`, `edit` and
  `interaction`.
- **How far the hole reaches.** Delete an input after a pass. Film and edit go back to an earlier stage
  (`plan`, `build`, `cut` or `render`), because those stages check their own files first. Web's
  `interaction.json` has no earlier stage, so `next` stays at `done` (R12). So the hole that can be reached
  today is one file, but it sits in the shared helper, and film and edit are safe only because of the order
  of their stages.
- **Older rules that already speak.** A recorded artifact that no longer exists is stale
  (`openspec/changes/redesign-user-workflow/specs/design-pipeline/spec.md:8-10`; design Q6 at
  `.../design.md:28-29`). So existence is already required, and today's code breaks it for
  `interaction.json`. "Fresh gate results" says a record counts only while it is not older than the files it
  checked (`openspec/changes/split-film-edit-workflows/specs/design-pipeline/spec.md:8-10`): the clock rule is
  what was specified.
- **Does the receipt rule of `AGENTS.md` apply?** It reads: keep "target, snapshot, policy digest and receipt
  lineage intact; when an upstream receipt changes, recompute or invalidate downstream evidence"
  (`AGENTS.md:12`). It names receipts. The ones with a target, a snapshot and a policy digest are the
  component-first v1 gate and the toolchain and execution receipts (for example
  `openspec/specs/design-pipeline/spec.md:1054`, "Component verification is provider-independent and
  hash-bound"; the repo skill says the same at `.claude/skills/design-pipeline/SKILL.md:15-18`). The
  workflow record has none of those fields (`workflow-core.cjs:136`) and no schema file. So the rule, as
  written, applies to v1 receipts only. Its purpose is also the workflow record's purpose: a change
  upstream makes later evidence stale. The clock rule meets that for an ordinary edit, and not for a file
  put back with an old file time. This design does not call the workflow record a receipt (5.3). It applies
  the purpose where it costs little (existence, now) and leaves content fingerprints as a decision (Q4).

Options:

| Option | What changes | Fixes | Leaves | Cost |
| --- | --- | --- | --- | --- |
| O1 Keep the clock rule as a documented limit | nothing; a plain note in the guides | nothing | R4, R5, R6, R9 | none |
| O2 Central existence rule (S0) | `gatePassed` treats a missing listed file, or an empty entry in the list, as not fresh; tests for all four gates | R5 in every gate, and the same edge in every list added later | R4, the 50 ms allowance, D6, D13 | about 10 lines and one test file |
| O3 Central existence, then content fingerprints (S0, then S5) | O2, then the record keeps fingerprints of the files it read | R4, R5, R6, R9 and the 50 ms allowance | files a page loads | large (S5); needs Q4 |
| O4 A guard in each stage that needs one | for example only in web | R5 for that stage | every other stage | small each; repeats; `add-web-composition-checks` already wrote one |

Recommended default: **O2 first, as S0, before S1; then the fingerprints of O3 as S5 (Q4).** Reasons:

- It is one central function, so film, edit and web are covered by one change, and the regression tests
  name every gate.
- It closes the hole that can be reached today for the price of one small change, and S1 can drop its own
  `exists()` guard.
- S5 needs S1's call site and is the largest slice, so it should not hold the web checks back.
- O1 is honest but leaves a stage finished with its probe file gone. O4 is the web-only guard, and it is
  rejected.

S0 edits `gatePassed` only. It changes no stage list, no CLI and no stored record. A project in flight
keeps working, and one whose listed file is gone goes back to the stage that needs it.

## 6. Skips, stated once

A stage may be skipped only for one of these reasons. An agent never skips a stage on its own.

| Reason | Stages it may skip | Never skipped |
| --- | --- | --- |
| **quick tier** | intake, the concept pick, review, deliver, and the reference study (unless replicate) | make, verify. The gate must pass. |
| **replicate mode** | none. It removes a right: the reference cannot be waived at any tier of any deliverable. | the reference |
| **freeform mode** | the reference study. There is nothing to study, so `reference` finishes with no file and no decision, and stays in the list. | everything else |
| **the user declines references** (brief mode, standard or full) | the reference study, recorded as `none` | not allowed in replicate |
| **the deliverable's nature** | edit's `reference` outside replicate; the early gate outside film | verify |

Freeform and a declined reference leave the same visible fact: `reference` is listed as completed and
there is no `reference.md`. The reason is in the state (`mode` is `freeform`, or `decisions.reference`
is `none`). `add-web-capability-skills` gives freeform its content meaning (the deviations are written
against the default template of the page type, `openspec/changes/add-web-capability-skills/design.md:257`);
this design gives it its stage meaning, and the two agree.

## 7. Defects and differences

### 7.1 Real defects

Each has its evidence and the slice that fixes it.

| # | Defect | Evidence | Fixed by |
| --- | --- | --- | --- |
| D1 | A person's review can be skipped. | `decide` never asks which stage is current (`workflow-core.cjs:99-130`). R2: with review and deliver answered first, `next` reached `done` with all eight stages completed and never asked the person. | S3 |
| D2 | An accepted review outlives the draft it judged. | Review is finished when any verdict is `accept` (`shared.cjs:69`). R3: after a different draft passed the gate, `next` said `done`; `drafts` still held the one old `accept`. | S6 |
| D3 | Delivery is a claim. | `workflow-core.cjs:126` stores `options.answer \|\| true`. R3: `final.mp4` did not exist and `next` said `done`. R7: `ui` quick reached `done` with evidence `{delivered: true, gates: {}, drafts: []}`. | S3 |
| D4 | Gate records go by clock, not content. | `shared.cjs:20-26`, `workflow-core.cjs:136`. R4: different bytes with an old file time still said `done`; a file time moved forward with the same bytes reopened `check`. The 50 ms allowance (`shared.cjs:15-20`) exists because two clocks disagree. | S5 |
| D5 | A missing input counts as fresh. | `mtime` returns 0 for a missing file (`shared.cjs:13`) and empty entries are dropped (`:24`). R5, R12: deleting `interaction.json` left `next` at `done`; deleting an input of film or edit sent `next` back to an earlier stage, because those stages check their own files first. The author of `add-web-composition-checks` met the same edge and guards it by hand. | S0 |
| D6 | Two rules pick the film draft. | `next` takes `out.mp4`, else the first `renders/*.mp4` (`film.cjs:10-16`); `film check` takes the newest non-empty `.mp4` (`film-project-core.cjs:165-172`). R6: a newer render in `renders/` left `next` at `done`. | S5 |
| D7 | `ui` has almost no flow. | Quick `work`; standard and full `intake`, `work` (`workflow-core.cjs:42-45`). `work` ends on a bare `deliver` (`:43`). No gate feeds it (`cli-core.cjs:801, 850, 1935, 1987`). No concepts, no review, no guide (`SUB_WORKFLOWS` has no `ui`, `:25`; `workflow-next.test.cjs:138-140` pins `guide === undefined`). The "two human decisions" requirement is unmet (2.5). `skill/SKILL.md:34` and `:45-47` had to be rewritten to say so. | S2 |
| D8 | `full` is `standard` for film and edit. | R1; `film.cjs:46-49`, `edit.cjs:52-56`. `skill/SKILL.md:35` promises an OpenSpec change. | S8 |
| D9 | Replicate is ignored where no reference stage exists. | Web quick (`web.cjs:82`) and `ui` at every tier. R8. `workflow-web.md:19-22` says replicate cannot be skipped. | S2, S4 |
| D10 | Freeform does nothing. | Accepted, advertised, unread (2.3). | S4 |
| D11 | A rejected draft can come back unchanged. | Rejection clears the `film`, `edit` and `interaction` records (`workflow-core.cjs:120-124`) and nothing else. `film check` on the same draft passes; review then asks about it again. `workflow-next.test.cjs:50-57` walks exactly that path. | S6 |
| D12 | Art-director mode skips edit's `style` question. | The rule lists the stage ids `concepts` and `review` (`workflow-core.cjs:91`). R10: `style` has no `director` note; web `concepts` has. | S9 |
| D13 | A pass can be recorded nowhere, silently. | `recordGate` returns when there is no state file next to the checked file (`workflow-core.cjs:134-135`). R9: `verify film-storyboard` on `sub/storyboard.json` said `passed` (exit 0), `gates` stayed `{}` and `next` stayed at `plan`. | S5 |
| D14 | The reference and the `next` text disagree about OpenSpec. | `pipeline-reference.md:26, 50` say to create OpenSpec artifacts before implementation. `workflow-core.cjs:43` says "no OpenSpec" at quick and standard; `web.cjs:62` says lighter tiers "skip specification ceremony". The reference has no section on tiers. | S8 |
| D15 | The web review names a `qa.md` that no step creates. | `workflow-web.md:70`. Only `film scaffold` writes `qa.md` (`film-project-core.cjs:135`). | S8 |

### 7.2 Differences kept on purpose

| # | Difference | Evidence and reason |
| --- | --- | --- |
| I1 | Quick has no intake, concepts, review or deliver. | Q14 (`redesign-user-workflow/design.md:30`) defines quick as "route, build, gates, evidence"; `workflow-next.test.cjs:64-69`. |
| I2 | Quick ends at the gate with no delivery record, in film, edit, web (and now `ui`). | Same. `done` will say that no person was asked (S7). |
| I3 | Edit has `style` where film and web have `concepts`. | The pick is `mad` or `pv` (`edit.cjs:22-26`); `workflow-next.test.cjs:71-83`. |
| I4 | Edit's reference exists only in replicate. | `edit.cjs:19-20`. Reason is not written; the guide will say it (S8). |
| I5 | Only film has an early gate. | `film.cjs:20-26`. |
| I6 | Web and `ui` review text speaks of a page or screen. | `web.cjs:38-49`; the web spec fixes it. |
| I7 | Film's `deliver` renders the final quality; edit and web only record. | `film.cjs:40-44`, `edit.cjs:46-50`, `web.cjs:75-79`. An edit's render is already the deliverable. |
| I8 | Intake wording differs by deliverable. | `shared.cjs:28-43`, `web.cjs:12-27`, `workflow-core.cjs:29-40`. |
| I9 | `decide --stage concept` is used for stage ids `concepts` and `style`. | `workflow-core.cjs:103, 112`. Left out on purpose by `fix-tool-guidance-errors` (its design, section 4) and here. |

## 8. The slices

Eleven slices, S0 to S10. S1 is another change's; the rest are tasks of this change. The order is the
order of building. S0 comes first: it is a small central fix that must land before S1. Most slices touch
`workflow-core.cjs` or the four stage modules, so the honest order is a chain. S3 and S4 run side by side
(they share no file). S7 and S8 share no file either, but they stay in order to keep the integrator's
runs simple.

`node scripts/qa.cjs` is the only sanctioned check. It has no scoped mode and fails unless
`git status` is the same at the end, so workers do not run it; the integrator runs it once at the end of
each wave. What it proves for every slice: `scripts/test-manifest.json` equals `tests/*.test.cjs`, every
`required` file of `package-resources.json` exists, the listed tests pass, and the package builds twice
and installs. Its `node --check` covers `skill/scripts/*.cjs`, `skill/adapters` and `scripts/*.cjs`, not
`skill/scripts/workflows/*.cjs` (`scripts/qa.cjs:111-115`), so a new module there is covered only by the
tests that load it. It does not prove any guide's wording. Film render cases need `ffmpeg` and skip
without it (`AGENTS.md`).

New test files are added by their slice; their manifest lines are added by the integrator at the end
of the wave, so two parallel slices never rewrite `scripts/test-manifest.json` together.

| Slice | Name | Size | Runs after |
| --- | --- | --- | --- |
| S0 | A missing input is never fresh | S | `fix-tool-guidance-errors` committed |
| S1 | Web page checks (`add-web-composition-checks`, external) | L | S0 |
| S2 | The `ui` flow | L | `fix-tool-guidance-errors` committed; S1 (both edit the workflow test, and `ui`'s `probe` calls `probeBinding`, which S1 adds) |
| S3 | `decide` answers only what `next` asks | M | S2 (they share `workflow-core.cjs` and the workflow test) |
| S4 | Modes mean one thing | M | S2; parallel with S3 |
| S5 | Gate records go by content | L | S3, S4 |
| S6 | A verdict is about the draft it judged | M | S5 |
| S7 | `done` says what was checked and what was decided | S | S6 |
| S8 | The full tier means one thing; guide fixes | M | S7 |
| S9 | Step labels and the required-steps test | M | S8 |
| S10 | Closure | S | S9 |

### S0 A missing input is never fresh

- **Owns:** `skill/scripts/workflows/shared.cjs` (`gatePassed` only); new `tests/workflow-freshness.test.cjs`.
- **Does:** `gatePassed` returns false when the record is not `passed`, or when any entry of the list of
  inputs is empty (`null`, `undefined` or an empty path, as `draftRender(root)` gives when there is no
  draft) or names a file that does not exist on disk. A file that exists with no bytes is not missing.
  Otherwise the clock rule stays as it is. No stage list, no CLI and no stored record changes. Section
  5.7 has the options and the reasons.
- **qa.cjs proves** (regression tests for every gate that uses `gatePassed`):
  - a direct test of `gatePassed`: a listed file that does not exist, or a `null` entry, gives false; all
    inputs present and fresh gives true;
  - for each of `storyboard` (film `plan`), `film` (film `check`), `edit` (edit `check`) and `interaction`
    (web `probe`): with the gate recorded as passed and every input present the stage is finished; delete
    each listed input in turn and `next` is not `done` (R12 is the fixture).
- **Does not prove:** a change of content, a file put back with an old file time, or the 50 ms allowance
  (S5).
- **Order note:** S0 runs after `fix-tool-guidance-errors` is committed (that change edits the top comment
  of `shared.cjs`; S0 edits only `gatePassed`) and before S1. Then S1's own check that its listed files
  exist is redundant and may go. S0's test file builds its web project in one small helper. S1 changes that
  helper to write a real probe document, the page file it names and the nine evidence files, because after
  S1 the web `probe` reads `interaction.json` and lists more files; S1 owns that one helper line.

### S1 Web page checks (external)

Owned by `add-web-composition-checks` (its files now exist: `proposal.md`, `design.md`, `tasks.md` and two
spec deltas). This design does not edit or restate it. What this design relies on:

- S0 lands first, so S1's own check that its listed files exist becomes redundant and may go. S1 also
  changes the one web helper in `tests/workflow-freshness.test.cjs` (S0 writes that file) to write a real
  probe document, the page file and the nine evidence files; without that, S0's web case would fail once S1
  lands.
- No new gate id. The existing gate `interaction` (command `verify interaction --probe interaction.json`,
  record `{ status, at }`) now also checks the page's first screen at 375x812, 768x1024 and 1440x900, and
  records one verdict: passed only if the probes and all three sizes pass.
- Web keeps the stage `probe`, at every tier (no quick exemption). It reads `interaction.json` and lists
  `interaction.json`, the page file that the probe's `url` names (a file inside the project folder) and the
  nine evidence files under `evidence/composition/<size>/`. It is finished when all of them exist and
  `gatePassed(state, root, "interaction", <that list>)`. An http(s) `url`, a `url` leading outside the
  folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open, and its
  action says what to change. The command itself still runs for an http(s) page.
- The new file `skill/scripts/composition-page-core.cjs` exports `probeBinding(projectDir)`. It reads
  `interaction.json` and answers `{ kind: "file", file, inputs }` (`inputs` is `interaction.json`, the page
  file and the nine evidence files), `elsewhere` (an http(s) address, or a path that leaves the folder or is
  not a regular file), `absent` (no such page file) or `invalid` (with a `reason`). It reads no workflow
  state and holds no stage. Web's `probe` uses it, and so does the `ui` probe in S2.
- The command writes the nine files before it calls `recordGate`, in one command. So S5 fingerprints them
  right after the write (section 5.3), and there is no new `recordGate` call site.
- It edits none of `recordGate`, `decide`, `workflows/shared.cjs`, `workflow-core.cjs` and `KNOWN_OPTIONS`.
  It keeps the clock rule, and S5 is the later step that replaces it. The `next` command string for
  `probe` is unchanged. Its result document `evidence/interaction.json` keeps its schema id and gains
  `checks`, `composition` and `next`.
- Its Appendix A also maps the six steps, as documentation of today's code. Where it differs from
  section 3.2 (film `plan` sits under Make here), section 3.2 is the target.

### S2 The `ui` flow

- **Owns:**
  - new `skill/scripts/workflows/ui.cjs` and new `skill/references/workflow-ui.md`;
  - `skill/scripts/workflow-core.cjs`, only `UI_INTAKE`, `codeStages`, `SUB_WORKFLOWS` and `stagesFor`;
  - `skill/references/package-resources.json`: two `required` entries, `scripts/workflows/ui.cjs` and
    `references/workflow-ui.md`, because that file lists every workflow module and guide by name (lines
    61-71);
  - `tests/workflow-next.test.cjs`: delete the case at 85-93 (it matches the words "OpenSpec change", and
    after S2 the stage after `intake` at `full` is `reference`, not `work`); extend the guide loop at
    123-141 to `ui` and drop the check at 138-140 that pins no guide; replace the `ui` pin at 345-368;
    leave the `ui` intake case at 330-343 as it is; any `deliver` call in the new `ui` walk passes an
    `https://` URL or a real file, so S3 has nothing more to fix;
  - rows of `scripts/tool-list.json`, only if `add-capability-registry` has already landed (otherwise that
    change adds them when it lands, and S10 checks they exist).
  - S2 does not edit `web.cjs`.
- **Does:**
  - The `ui` lists of 3.3. Quick: `work`, `probe` (`reference` first in replicate). Standard and full: the
    master list.
  - `work` ends when `interaction.json` exists. The agent writes that file in `work`, the same author as
    web's `probe`.
  - `probe` is `ui`'s own stage. It runs `verify interaction --probe interaction.json` and records the
    existing gate `interaction`. Its finish rule lists `interaction.json`, the page file that the probe's
    relative `url` names (a file inside the project folder) and the same nine evidence files that web lists,
    which the same command writes. As for web, an http(s) `url`, a `url` leading outside the folder, a page
    file that does not exist, or a missing or invalid probe file keeps `probe` open. It lists no fixed
    `index.html`: a `ui` project need not have one. `ui.cjs` calls `probeBinding(root)` from
    `skill/scripts/composition-page-core.cjs` (S1 adds it and lands first) and takes the list from its
    `inputs`, so it repeats neither the rule nor the nine names. That file holds no stage, and `ui.cjs`
    still imports no stage object from `web.cjs`.
  - `review` is `ui`'s own stage with the same decision contract as web's page review (the shared finish
    rule and `record` string). Its text says "screen".
  - After S1 the command `verify interaction` also checks the first screen at three sizes, so `ui` gets
    that check through the same command, with no code of its own in `ui.cjs` (Q7).
  - `concepts` has its own prompt: three cards about screens (the first task, the structure, the states,
    the look, the tools and any missing licence). Its finish rule and `decide` string are the shared ones.
  - The `ui` intake moves here unchanged. The `ui` guide has one `##` heading per stage id.
  - No CLI change, no gate, no receipt. `work` at `full` keeps its OpenSpec sentence until S8 adds the
    field.
- **qa.cjs proves:** the `ui` ids and order for every tier and mode, each a subset of the master list;
  every `ui` stage names a guide heading that exists; `ui` quick cannot finish without a passed
  `interaction` record; a `ui` project with no `index.html` finishes `probe` when `interaction.json`, its
  page file and the nine evidence files are present, and deleting any one of them reopens it (an http(s)
  `url` keeps it open); `ui` replicate starts at `reference` and cannot waive it; there is no `deliver` at
  quick; the film, edit and web outputs are unchanged (the existing cases that compare a whole output
  with the old output).
- **Does not prove:** that an interaction probe is the right check for work with no page (Q7); a run in
  a real browser (Chrome is needed).
- **Conflict to settle:** `fix-tool-guidance-errors` pins the `ui` stage ids and order
  (`.../specs/tool-guidance/spec.md:40-41, 50-54`; test at `workflow-next.test.cjs:345-368`). S2 replaces
  that pin and adds a requirement in this change; at archive time the pinned scenario is amended (the
  same step that change took for the web change).

### S3 `decide` answers only what `next` asks

- **Owns:** `skill/scripts/workflow-core.cjs` (`decide` only); new `tests/workflow-decide.test.cjs`;
  `tests/workflow-next.test.cjs`, line 58 (create `final.mp4` before that `deliver`, because rule (c)
  refuses a file that does not exist) and line 120 (the CLI case that records `deliver` at film quick
  now expects the refusal).
- **Does:**
  - (a) `decide --stage X` is refused unless the first unfinished stage is X (`concept` matches `concepts`
    or `style`). The message names the current stage and says to run `next`. The turn check comes first: a
    call that is out of turn gets `OUT_OF_TURN` even when its answer is also bad (for example a `deliver`
    that names a missing file before delivery is open).
  - (b) A concept pick for `concepts` is refused while `concepts.md` is missing.
  - (c) `deliver` needs `--answer`: a URL (`scheme://`) or a file that exists inside the project root.
  - (d) At standard and full, `decide --stage review --verdict reject` is also accepted while `deliver` is
    the open stage and when every stage is finished: a person may change their mind before or after
    delivery. Every other out-of-turn call is refused, and at `done` the message says the job is done. At
    quick there is no review, so every call at `done` is refused.
  - (e) Nothing else about `decide` changes; the replicate refusal keeps its message.
- **qa.cjs proves:** each refusal, by code and by the stage it names; R2 stops at the first early answer.
  A search of all `decide(` and `run("decide"...` calls in `tests/workflow-next.test.cjs` found three that
  the rules break: line 58 and line 120 (both fixed here) and line 365, the `ui` case that finishes `work`
  with `deliver` (replaced by S2). Every other call still passes.
- **Does not prove:** who is calling.
- **Order note:** S3 goes after S2. It could go first (it fixes the worst hole, D1, cheaply) only if its
  owner also fixes the `ui` case at line 365.

### S4 Modes mean one thing

- **Owns:** `skill/scripts/workflows/shared.cjs` (`reference()` finish rule); `skill/scripts/workflows/web.cjs`
  (replicate at quick adds `reference`); `skill/references/workflow-web.md`, `workflow-film.md`,
  `workflow-edit.md` (one sentence each); new `tests/workflow-modes.test.cjs`.
- **Does:** under freeform, `reference` is finished with no file and no decision, and stays in the
  list. Under replicate, web quick gets `reference` first. Together with S2 that makes replicate
  unwaivable at every tier of every deliverable. The test walks each cell to `reference` before it sends
  the waiver, because after S3 a waiver sent earlier is refused as out of turn.
- **qa.cjs proves:** freeform stage ids equal brief stage ids in every cell; freeform finishes
  `reference` with nothing on disk; replicate has an unwaivable reference in every cell (the waiver is
  refused and no `then` line is offered); the master-list rule holds for all 36 cells.
- **Does not prove:** any content rule for freeform (that belongs to `add-web-capability-skills`).

### S5 Gate records go by content

- **Owns:**
  - `skill/scripts/workflows/shared.cjs`: `gatePassed`; remove `CLOCK_SKEW_MS` and `mtime`;
  - `skill/scripts/workflow-core.cjs`: `snapshot`, `recordGate`, the record shape;
  - `skill/scripts/workflows/film.cjs`, `edit.cjs`, `web.cjs`, `ui.cjs`: each stage that runs a gate names
    it and gives one input list per gate; film's draft is the newest render;
  - `skill/scripts/film-project-core.cjs`: export `newestRender`;
  - `skill/scripts/cli-core.cjs`: every `recordGate` call site (S1 adds none; at the `interaction` site the
    nine evidence files are fingerprinted right after the command writes them). Each takes the
    fingerprints as in 5.3 (before the check for files it reads, right after the write for files it writes)
    and, when there is no state file, says `recorded: false`;
  - new `tests/workflow-gates.test.cjs`, and the one gate-recording helper line of each of
    `tests/workflow-decide.test.cjs` (S3) and `tests/workflow-freshness.test.cjs` (S0), which S5 changes to
    take the fingerprints before recording;
  - `tests/workflow-next.test.cjs`: every `recordGate` call in it (17 today; S1 and S2 add some) gets the
    fingerprints through one small helper; the cases "a gate result goes stale when its inputs change" and
    "a passed interaction gate goes stale when index.html changes" change bytes instead of file times,
    because the behaviour they prove stays; the case "a file written a few milliseconds after its gate
    still counts; a later edit does not" proves the 50 ms allowance, which is gone, so it is deleted.
- **Does:** section 5.1, first two consequences, and 5.2's lists. A record keeps `inputs`; a stage is
  finished only if every declared file exists and hashes to the recorded value and the set of files is the
  same. A record without `inputs` never counts.
- **qa.cjs proves:** R4 (bytes changed, old file time: reopens; time moved, same bytes: stays), R6 (`next`
  and `film check` pick the same render), R9 (no state file: the CLI says `recorded: false`), that a gate
  that is not declared by any stage of the deliverable is not recorded, that a hand-written record without
  `inputs` does not finish a stage, and that an edit to a script file a film page loads reopens `check`.
  A deleted input still reopens the stage (S0 proved that with the clock rule; S5 keeps it under the
  fingerprint rule).
- **Does not prove:** files a page loads (for web and `ui`); the film render path needs `ffmpeg`.

### S6 A verdict is about the draft it judged

- **Owns:** `skill/scripts/workflow-core.cjs` (`decide` review branch: store `subject`; clear
  `delivered`); `skill/scripts/workflows/shared.cjs` (`REVIEW` finish rule and action);
  `skill/scripts/workflows/web.cjs` and `ui.cjs` (each review uses the shared finish rule); new
  `tests/workflow-review.test.cjs`; `tests/workflow-next.test.cjs` (the reject and accept walks, only where
  they conflict).
- **Does:**
  - An `accept` counts only while the draft's snapshot equals its `subject`. The latest verdict for a
    snapshot decides, so a person can overturn an earlier reject of the same draft by accepting it.
  - A draft whose latest verdict is a reject gets a `run` action that says to rebuild, not a second `ask`.
    The action carries the `record` string of the review decision, so that a person's accept of the
    unchanged draft can still be recorded.
  - Any new verdict clears `delivered`. Rejection still adds a project rule and clears the verify records.
- **qa.cjs proves:** R3 (a changed draft needs a new review; the old `accept` is ignored); an unchanged
  rejected draft is never asked about again; an accept after a reject of the same draft counts; a new
  verdict clears `delivered`; a verdict without a `subject` never counts; the walk of the existing
  reject-then-accept case gives the same result.

### S7 `done` says what was checked and what was decided

- **Owns:** `skill/scripts/workflow-core.cjs` (the `done` branch of `nextAction`); new
  `tests/workflow-evidence.test.cjs`.
- **Does:** `done` keeps `gates` and `drafts` and adds `acceptance`: `accepted`, or `not asked` when
  the tier has no review. The one-line summary also says that nobody reviewed a quick job; no test reads
  that line. Nothing merges the two groups.
- **qa.cjs proves:** the field for every tier and deliverable; `gates` and `drafts` are unchanged in
  shape.

### S8 The full tier means one thing; guide fixes

- **Owns:** `skill/scripts/workflows/film.cjs` (`plan` action), `edit.cjs` (`cut` action), `web.cjs` and
  `ui.cjs` (the same field); `skill/references/workflow-film.md`, `workflow-edit.md`, `workflow-web.md`,
  `workflow-ui.md`; `skill/references/pipeline-reference.md` (line 26 only); new
  `tests/workflow-tiers.test.cjs`; `tests/workflow-next.test.cjs` (delete the two assertions that match the
  words "OpenSpec change" in the web case "web quick walks build then probe; standard adds ...", at 216 and
  226; S2 already deleted the `ui` case).
- **Does:** at `full`, the first make action of every deliverable carries `openspec: "required"` and one
  plain sentence; nothing else about the stage lists changes. The guides say what goes in the change and
  where the review record (`qa.md`) lives (default: it stays in the project root, where `film scaffold`
  writes it, and the change links to it); the edit guide says why its reference is replicate-only;
  `pipeline-reference.md` line 26 says "at the full tier".
- **qa.cjs proves:** the field is present on that action at `full` for all four deliverables and absent
  at quick and standard; stage lists at `full` equal `standard`; the deleted wording cases are replaced
  by field cases.
- **Does not prove:** that an OpenSpec change exists (Q3).

### S9 Step labels and the required-steps test

- **Owns:** `skill/scripts/workflows/shared.cjs` (`STEPS`, the table of required steps and the reasons
  for absences); `film.cjs`, `edit.cjs`, `web.cjs`, `ui.cjs` (`step` on each stage);
  `skill/scripts/workflow-core.cjs` (`step` in the `next` output; the art-director rule reads `step`);
  new `tests/workflow-lifecycle.test.cjs`.
- **Does:** every stage carries one of the six steps; `next` returns it. The art-director note is added at
  every `ask` whose step is `direction` or `review`. The `step` is read by three things only: the `next`
  output, the required-steps test, and the art-director rule. It never picks the next stage.
- **qa.cjs proves:** every stage of every deliverable, tier and mode has a valid step; steps never go
  backwards along the master list; each deliverable's required steps are present at each tier or listed as
  absent with a reason (section 3.2); edit's `style` ask now carries the director note (D12).
- **Why last:** it touches every stage module, and the mapping is only final once S2 lands. Labels could
  come earlier at the price of a merge with S1 and S2.

### S10 Closure

- **Owns:** `skill/SKILL.md` (the tier row, the decision line and one mention of `workflow-ui.md`; the
  file is 4,293 bytes and the stated limit is 5,120); `CHANGELOG.md`; `scripts/test-manifest.json` (every
  new test file); `scripts/tool-list.json` (checks that the `ui` rows exist if the registry has landed,
  and adds any that are missing); this change's `qa.md`; the ticked `tasks.md`.
- **Does:** records the change, runs `node scripts/qa.cjs` and `openspec validate align-workflow-lifecycle
  --strict`, smokes the CLI in a temporary folder (film, edit, web, `ui` through `next` and `decide`), and
  writes what was not verified.

### S11 Host test integrity (built ahead, worktree `c1-1-test-integrity`)

- **Why:** in KATANAview trials (run-02/03) every T2 run cut `panel-registry.test.ts` from 10 tests to 4-6
  and one T1 run removed 15 assertions; hidden checks still passed, and `decide --stage deliver` took any
  text. Smoke on the run-03 `t2-a` diff: 11 titles -> 7 (7 removed, 3 added), assertion lines 28 -> 18.
- **Baseline:** the working tree at the first `next --deliverable ui`, stored as `state.hostTests` (path,
  SHA-256, titles, assertion-line and line counts). Not git `HEAD`: a dirty host tree would make the
  user's own uncommitted test edits count as this job's. No snapshot (older state): report only.
- **What blocks:** only a snapshot test file that is gone (exit 2, finding `host-test-file-deleted`).
  Title and assertion changes are not decidable without the meaning of the code (a rename and a removal
  look alike), so weakening ones hold the job at `test-review` for a person instead of refusing it.
- **Only weakening waits:** a changed file waits for a verdict only if a snapshot title is gone or its
  title or assertion-line count fell. Run-05 showed why: an agent extended the registry test (10 -> 11
  tests, assertions up), the first cut asked for confirmation of any change, and the job stalled waiting
  on the user. Additive edits are listed in `done.evidence.testChanges` with `weakening: false`, and only
  weakening changes enter the digest a verdict is bound to. Limit: an edit that keeps every title and
  count but loosens an assertion (`toBe(42)` -> `toBeGreaterThan(0)`) is listed, not asked; the host's
  review is where that is caught.
- **Why an enum value of `decide`, not a parallel gate:** the confirmation is a person's decision, and
  `decide` is the v1 contract for those (`--stage`, `--verdict`, `--answer`, all existing flags). It adds
  one value, `test-review`, to `decide --stage`, stores verdicts under existing `state.decisions`
  (`testReviews`), and adds no gate id, `state.gates` key, receipt, schema id, record file, command or
  option. The refused `deliver` uses the existing envelope and exit code 2. No existing decision slot
  fits: `drafts` is the draft `review`, which is Visual Acceptance, and mixing test confirmation into
  it would let one `accept` stand for both. `test-review` is in the list only while snapshot test files
  are weakened, so `ui` stage lists without that are unchanged.
- **Live, not cached:** a first cut compared only inside `decide deliver` and let `work` finish on
  `delivered`; an agent could deliver first and delete or weaken tests afterwards. The comparison now
  runs at every `next` and `decide`: a missing snapshot file keeps `work` open, and a verdict carries
  the digest of the changes it judged, so any later edit asks again.
- **Starting over:** `--replace` over a snapshot is refused while test files are gone or weakened
  without an `accept` for exactly those changes; otherwise replacing (or replacing through `film` and
  back) would make already-weakened tests the new baseline. With tests unchanged or confirmed it
  starts over and snapshots again.
- **Evidence:** `done.evidence` holds `testChanges` (what changed, before -> after) next to
  `testReviews`, so a downstream reviewer sees the changes and not only the verdict.
- **What this is not:** `test-review` is disclosure and consent, not a gate and not an integrity
  guarantee. The snapshot, the verdict and the state file are all writable by an agent: deleting
  `hostTests` drops the checks to a report, and an agent can type the verdict. It raises the cost of
  quiet test cuts and makes them visible. Real enforcement is the host's CI or PR review against the
  merge base, and the external evaluator in trials.
- **Depends on Q10:** S11 assumes the default answer to Q10 (accept that `decide` cannot tell a person
  from an agent). That is the user's open decision; if the answer is no, `test-review` needs a channel
  the agent cannot write, which this design does not have.
- **Interplay with S2/S3:** S2 must keep `test-review` after the `ui` deliver step; S3's turn check must
  accept `decide --stage test-review` when `next` asks it.

## 9. Other changes in flight

- **`fix-tool-guidance-errors`** (uncommitted, 16 of 18 tasks). It edits `workflow-core.cjs`,
  `workflows/shared.cjs` (its top comment), `tests/workflow-next.test.cjs` and `skill/SKILL.md`. It must be
  committed before S0 starts (S0 edits `shared.cjs`). S2 changes what its `ui` scenario pins; see S2.
- **`add-capability-registry`** (specified, 7 of 54 tasks). Its rule that the standard, replicate list holds
  every stage (3.3) is kept by every slice here. Its per-stage check makes every stage `next` names appear
  in `scripts/tool-list.json`: S2 adds the stages `ui:reference`, `ui:concepts`, `ui:probe`, `ui:review`,
  `ui:deliver` and the guide `references/workflow-ui.md`. Whichever change lands second updates the other's
  rows. Its prototype also checks that freeform lists the same stage ids as brief; S4 keeps that true.
- **`add-web-capability-skills`** (specified). It owns the `skill/SKILL.md` front matter and the web bullet.
  Its freeform rule is about content and adds no stage (section 6). S10 edits only the tier row, the decision
  line and one mention of the `ui` guide, and measures the file size last.
- **`add-web-composition-checks`** (S1, another worker; its proposal, design, tasks and spec deltas exist,
  its code does not). It lands after S0, and it may then drop its own `exists()` guard. See S1. Its
  Appendix A maps the six steps as documentation of today's code; section 3.2 here is the target.
- **`redesign-user-workflow`** (9 of 15 tasks) and **`split-film-edit-workflows`**. Their requirements
  "ceremony tiers", "two human decisions" and "project state" are kept: this change makes them true for
  `ui` and for film and edit at `full`. Their requirement "fresh gate results" is replaced (fresh by
  content, not by time). None of these is in `openspec/specs/` yet, so this change adds requirements of
  its own and does not use MODIFIED. At archive time two old sentences are amended: the `ui` stage pin of
  `fix-tool-guidance-errors`, and "fresh gate results".

## 10. Not in scope

- Merging `next` and `decide`, `route`, `toolchain` and `execution`, and `change`, `status`, `plan` and
  `run`; a new entry command; renaming any stage id or `decide` value (including `concept` against
  `concepts`).
- A new gate, finding code, receipt or schema file. In particular: wiring `component-first`,
  `verify components` or `verify motion` into `next` for `ui`; making `film check` read text boxes;
  who writes `control.gates`.
- Checking by code that an OpenSpec change exists (Q3).
- The web page checks (S1), and any evaluation of `next` for edit, web or `ui`.
- Reorganising `pipeline-reference.md` or the other 158 reference files.

## 11. Open questions with defaults

1. **Labels in code?** Should the six steps be a `step` field on each stage, or live only in the
   guides? Default: in code, read only by the `next` output, the test and the art-director rule (S9).
2. **`full` for film and edit?** Match web and `ui` (default, S8), or state that `full` equals `standard`
   for them (4.2).
3. **Check the ceremony by code?** That needs a change id in the state and a new `decide` value.
   Default: no; the `openspec` field and prose only, until an evaluation shows `full` jobs skipping it.
4. **Are `inputs` and `subject` an extension of workflow-state v1?** Default: yes (5.3, and the options in
   5.7). If not, keep the clock rule after S0: S5 shrinks to the draft rule (D6) and the not-recorded
   notice (D13), and S6 compares a verdict's time with the draft's file time.
5. **What does freeform do?** Default: finish `reference` with no study and keep the stage in the list.
   Alternative: remove the value from the CLI, `skill/SKILL.md` and the help.
6. **Should `ui` get concepts and review?** Default: yes (two decisions at standard, as designed).
7. **Is `verify interaction` the right `ui` check** for work with no page (tokens, a component library)?
   After S1 that command also measures the page's first screen at three sizes, so `ui` gets that check
   too. Default: yes, with a small preview page. `verify components` stays unwired for now.
8. **Should quick have a `deliver` step?** Default: no.
9. **Should `full` add a third decision** (approve the change)? Default: no (Q3 says two).
10. **Accept that `decide` cannot tell a person from an agent?** Default: yes; `skill/SKILL.md` says to ask
    the user and the rule only blocks early and stale answers.
11. **Drop the 50 ms clock allowance?** Default: yes, with S5, since no clock is compared any more.
12. **Where does `qa.md` live at `full`?** Default: it stays in the project root (film scaffold writes it
    there) and the change links to it.
13. **Share web's page stages with `ui`?** Default: no. `ui` has its own `probe` and `review`, about 25
    lines each, so that S1 and S2 do not both edit `web.cjs` and the `ui` texts can say "screen" without
    touching web's. Both read the probe through `probeBinding`, so they cannot disagree about which page
    counts. A later change may merge them.

## 12. Risks

- **A project in flight is asked again** after S5 and S6 (5.4). Cost: one rerun per gate and one more review.
- **S5 touches every stage module and `cli-core.cjs`.** `cli-core.cjs` is shared with the registry change
  (T6 there rewrites the command table) and with S1 (it changes the `verify interaction` handler). Mitigation: S5 runs after
  both, and takes only the call sites.
- **S0 makes a missing listed file block a stage.** A project whose probe names a page that is gone stays
  at `probe` until the file is back. That is the point of the rule.
- **Fingerprints may be read as a new receipt.** Section 5.3 argues they are not; Q4 is the fallback.
- **A verdict's subject may change when a page's pictures change.** For web and `ui` the subject includes
  the nine picture and result files that `verify interaction` writes. If a page draws something different
  on each run (a moving hero, a live clock), a re-run of the check on an unchanged draft writes different
  pictures, so the draft looks changed: an accepted draft is reviewed again, and a rejected unchanged draft
  is asked about again. That is what happens today for that case, so it is not a new fault. The fallback is
  to leave the files the check writes itself out of the subject, so that only the files the maker wrote
  count. It is not chosen now, because it needs a way to mark which inputs the check wrote. Not tried on a
  real page.
- **`ui` standard and full become seven stages** (quick becomes two, or three in replicate). That is heavier
  than today and lighter than a full pipeline. It meets the two-decision design and conflicts with an
  in-flight pin, which S2 replaces.
- **A guard test can turn into a wording pin.** The tests in S8 and S9 read fields and ids, never the words of
  an action or a guide.
- **The `openspec: "required"` field is not enforced.** A `full` job can still skip the change.

## 13. Not verified

- Nothing here is implemented. No slice has run, and `node scripts/qa.cjs` was not run: it belongs to the
  integrator and the tree has other agents' edits.
- The R scripts ran on the working tree with `fix-tool-guidance-errors` uncommitted. Line numbers will move.
- `film check`, `film-edit check` and `verify interaction` were read, not run: they need `ffmpeg` or Chrome.
  The lists of files in 5.2 come from reading `checkFilmProject` and `checkProject`, not from tracing reads.
- R11 measured hashing in memory only.
- Whether anyone outside this repository reads `.design-pipeline/state.json`, or has scripts that call
  `decide` out of turn.
- That an OpenSpec change is useful for a film or an edit (4.2); the freeform meaning is a proposal.
- `add-web-composition-checks`: I read its proposal, its design (sections 0 and 7, Appendix A), the fixed
  interfaces of its plan (which name `probeBinding` and `boundPage`) and its author's messages. Its code
  does not exist, so the contract in S1 is not checked against code, and it changed twice while this
  design was written.
- The refined fingerprint rule for files a command writes itself (5.3) is a design step; the changed
  `verify interaction` command was not run.
- Three verifier passes were made on 2026-09-30 (their reports are in the session, not in this repository).
  One re-ran R1 to R11 and re-read the citations. One compared the six documents with each other, twice.
  The last one re-read them after S0, the own `ui` probe and review, the decide rules, the latest-verdict
  rule and the fingerprint rule were added, and it re-ran R12. Its 13 findings were fixed afterwards, and
  those fixes were not re-read by a verifier. Mermaid 10 was not tried (the picture parsed under Mermaid 11).
  The last edit, which names `probeBinding` for the `ui` probe and adds the case of a page file that does
  not exist, was checked only by searching the documents for the old wording and by `openspec validate
  --strict`.
- Plain language was checked by reading against `skill/references/plain-language.md`, not by a tool.

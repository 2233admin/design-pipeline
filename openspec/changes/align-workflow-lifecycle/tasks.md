# Tasks

Order: S0, then S1 (another change's), then S2, then S3 and S4 side by side, then S5, S6, S7, S8, S9 one
after another, then closure (S10). Most slices touch `workflow-core.cjs` or the four stage modules, so a
chain is the honest order. S3 and S4 are the only pair that run in parallel: they share no file. S7 and
S8 share no file either, but they stay in order to keep the integrator's runs simple. S2 goes after S1
only because both edit `tests/workflow-next.test.cjs`, and because `ui`'s `probe` calls `probeBinding`,
which S1 adds. Each worker edits only the files it owns, and no file has two owners among tasks that run
in parallel. New test files are added by their slice.

Words used here. A **wave** is a group of slices built together. The **integrator** is whoever merges
the slices and runs `node scripts/qa.cjs`. The **manifest** is `scripts/test-manifest.json`, the list of
test files that QA runs. A **fixture** is a small made-up project that a test builds. At the end of each
wave the integrator adds the lines of the wave's new test files to the manifest, so two parallel slices
never rewrite it together. There are eight new test files: `workflow-freshness`, `workflow-decide`,
`workflow-modes`, `workflow-gates`, `workflow-review`, `workflow-evidence`, `workflow-tiers` and
`workflow-lifecycle`.

The executable plan, with steps and acceptance, is
`docs/superpowers/plans/2026-09-30-workflow-lifecycle.md`. Facts, proof scripts (R1 to R12), defects
(D1 to D15), differences (I1 to I9) and open questions (Q1 to Q13) are in `design.md`. Slice numbers
here are the ones in `design.md` section 8. Existing tests are named by their title, not by line
number, because lines move as slices land.

## Verification protocol

The only sanctioned check is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode, and it fails unless
`git status` is the same at the end as at the start. Workers therefore do not run it. The integrator
runs it once at the end of each wave, on a quiet tree, after adding the wave's manifest lines. Failures
go back to the slice owner, and the integrator reruns.

What it proves for every slice: the manifest equals `tests/*.test.cjs`, every `required` file of
`skill/references/package-resources.json` exists, `node --check` passes, the listed tests pass, and the
package builds twice and installs. It does not prove any guide's wording. Film render cases need
`ffmpeg` and skip without it. `node --check` in `scripts/qa.cjs` covers `skill/scripts/*.cjs`,
`skill/adapters` and `scripts/*.cjs`, but not `skill/scripts/workflows/*.cjs`. A new module there
(`ui.cjs`) is checked only by the tests that load it.

A worker may check its own change with a throwaway script outside the repository, in a temporary
folder. That is smoke evidence, not the check. Tests read ids, fields, states and behaviour, never the
exact words of an action, a summary line or a guide.

## Done in this slice

- [x] Read the stage code, ran the real functions in throwaway scripts (R1 to R12), and wrote the
  proposal and the design.
- [x] Spec delta `specs/workflow-lifecycle/spec.md` and the spec document
  `docs/superpowers/specs/2026-09-30-workflow-lifecycle.md` written.
- [x] This `tasks.md`.
- [x] The plan `docs/superpowers/plans/2026-09-30-workflow-lifecycle.md` written.
- [x] `openspec validate align-workflow-lifecycle --strict` passes.

## Wave 0

Prerequisite (not a task here): `fix-tool-guidance-errors` is committed. It edits the top comment of
`skill/scripts/workflows/shared.cjs`, `workflow-core.cjs`, `tests/workflow-next.test.cjs` and
`skill/SKILL.md`. S0 runs after it.

- [ ] `fix-tool-guidance-errors` is committed.

### S0 A missing input is never fresh (size S)

Owns `skill/scripts/workflows/shared.cjs` (`gatePassed` only); new `tests/workflow-freshness.test.cjs`.

Rule: `gatePassed(state, root, gate, inputs)` returns false when the record is not `passed`, or when any
entry of the list of inputs is empty (`null`, `undefined` or an empty path) or names a file that does not
exist on disk. A file that exists with no bytes is not missing. Otherwise the clock rule stays as today.
No CLI change, no state change, no stage-module change. It fixes D5, and it runs before S1, so S1's own
check that its listed files exist becomes redundant (S1 may drop it).

- [ ] Write `tests/workflow-freshness.test.cjs` first, using R12 of `design.md` as the fixture. A direct
  unit test of `gatePassed`: a missing or null listed input gives false; all inputs present and fresh
  gives true. Then, for each gate that uses `gatePassed` (`storyboard` on film `plan`, `film` on film
  `check`, `edit` on edit `check`, `interaction` on web `probe`): record the gate passed with every
  input present and the stage is finished; then delete each listed input in turn and `next` is not
  `done` (film returns to `plan` or `build`, edit to `cut` or `render`, web stays at `probe` or returns
  to `build`). The test records every gate through one small local helper (`pass(dir, gate)`), so S5 changes one line.
- [ ] Confirm the cases fail on today's tree with a throwaway script outside the repository. Expected: web
  `interaction.json` deleted after a pass stays `done`. Film and edit are protected today only by the
  order of their earlier stages.
- [ ] Change `gatePassed` only.
- [ ] Smoke in a temporary folder: web quick, record `interaction` passed, delete `interaction.json`,
  `next` is not `done`.
- Proves: a missing file blocks each of the four gates, and a `null` entry blocks the helper.
- Does not prove: anything about content changes, a file put back with an old file time, or the 50 ms
  allowance (S5).
- Waits for: `fix-tool-guidance-errors` committed.

## Dependency: S1

S1 is not a task of this change. It is `add-web-composition-checks`, owned by another worker, and this
change does not edit or restate it. It lands after S0. What the slices below rely on:

- S1 adds no gate id. The existing gate `interaction` (command `designer-pipeline verify interaction
  --probe interaction.json`, record `state.gates.interaction = { status, at }`) also checks the page's
  first screen at three sizes and records ONE verdict: passed only if the probes and all three sizes
  pass.
- Web `probe` runs at every tier. It reads `interaction.json` and lists `interaction.json`, the page file
  that the probe's `url` names (a file inside the project folder) and the nine evidence files,
  `evidence/composition/<size>/screenshot.png`, `elements.json` and `result.json` for each of the three
  sizes. Its finish rule: all of them exist and `gatePassed(state, root, "interaction", <that list>)`. An
  http(s) `url`, a `url` leading outside the folder, a page file that does not exist, or a missing or
  invalid probe file keeps `probe` open, and its action says what to change.
- S1 adds `skill/scripts/composition-page-core.cjs` with `probeBinding(projectDir)`. It reads
  `interaction.json` and answers `{ kind: "file", file, inputs }` (`inputs` is `interaction.json`, the page
  file and the nine evidence files), `elsewhere`, `absent` or `invalid`. It reads no workflow state and
  holds no stage. Web's `probe` uses it, and so does the `ui` probe of S2.
- The command writes the nine files before it calls `recordGate`, in one command. So there is no new
  `recordGate` call site.
- S1 edits none of `recordGate`, `decide`, `workflows/shared.cjs`, `workflow-core.cjs` and
  `KNOWN_OPTIONS`. The `next` command string for `probe` is unchanged. S1 may add or change cases in
  `tests/workflow-next.test.cjs`.
- S0 lands first, so S1's own check that its listed files exist becomes redundant (S1 may drop it).
- S0's web fixture in `tests/workflow-freshness.test.cjs` lists the files that web's `probe` names when S0
  is written (`interaction.json`, `index.html`). After S1 the stage reads `interaction.json`, so whoever
  lands S1 changes that one fixture helper to write a real probe document, the page it names and the nine
  evidence files.

S5 fingerprints the list that S1 defines for web's `probe` at the existing `interaction` call site.

- [ ] S1 has landed (`add-web-composition-checks`).

## Wave 1

### S2 The `ui` flow (size L)

Owns new `skill/scripts/workflows/ui.cjs`; `skill/scripts/workflow-core.cjs` (only `UI_INTAKE`,
`codeStages`, `SUB_WORKFLOWS`, `stagesFor`); new `skill/references/workflow-ui.md`;
`skill/references/package-resources.json` (two `required` entries: `scripts/workflows/ui.cjs` and
`references/workflow-ui.md`); `tests/workflow-next.test.cjs` (see below); rows of `scripts/tool-list.json`
if `add-capability-registry` has landed. It does not edit `web.cjs`.

Edits to `tests/workflow-next.test.cjs`, by test title:

- Delete "ui uses OpenSpec only at the full tier". It is a wording pin that breaks once `ui` has
  `reference` after `intake`.
- Extend the guide loop of "film, edit and web actions name a guide section that exists for every
  stage" to `ui`, and replace its check that `ui` has no guide.
- Replace "ui stages keep their ids and order: quick is work; standard and full are intake then work".
  It also holds the case that finishes `work` on a bare `deliver`.
- Leave "ui intake asks about what is built, with no duration or film wording, and keeps the shared
  record" unchanged.

- [ ] Write the tests first: `ui` stage ids and order for every tier and mode, each a subset of the master
  list; every `ui` stage names a guide heading that exists; `ui` quick cannot finish without a passed
  `interaction` record; a `ui` project with no `index.html` finishes `probe` when `interaction.json`, its
  page file and the nine evidence files are present, and deleting any one of them reopens `probe`; `ui`
  replicate starts at `reference` and cannot waive it; no `deliver` at quick; `ui` standard has the intake
  reply and two
  decisions (the pick; the verdict). Any `deliver` call in the new `ui` walk passes an `https://` URL or a
  real file, so S3 never has a fourth call to fix.
- [ ] Confirm the new cases fail on today's tree with a throwaway script outside the repository.
- [ ] Write `ui.cjs`: quick `work`, `probe` (replicate: `reference` first); standard and full
  `intake, reference, concepts, work, probe, review, deliver`. `work` is finished when
  `interaction.json` exists. `ui` has its own `probe`: it runs the same command, `verify interaction
  --probe interaction.json`, and records the existing gate `interaction`, so `ui` gets the three-size
  check with no code of its own. Its finish rule lists `interaction.json`, the page file that the
  probe's relative `url` names (a file inside the project folder), and the same nine evidence file names
  that web lists (the same command writes them). As for web, an http(s) `url`, a `url` leading outside the
  folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open. It lists
  no fixed `index.html`, because a `ui` project need not have one. `ui.cjs` calls `probeBinding(root)` from
  `skill/scripts/composition-page-core.cjs` (S1) and takes the list from its `inputs`, so it repeats
  neither the rule nor the nine names; that file holds no stage, and `ui.cjs` imports no stage object from
  `web.cjs`. `ui` has its own `review`: same finish
  rule and `record` string as the shared review, text says "screen". `concepts` has its own `ui` prompt
  (three cards about screens) and the shared finish rule and `decide` string. Move `UI_INTAKE` here
  unchanged. `ui` `work` at `full` keeps its present OpenSpec sentence; the structured field comes in S8.
- [ ] Wire `stagesFor` and `SUB_WORKFLOWS` in `workflow-core.cjs`. Write `workflow-ui.md` with one `##`
  heading per `ui` stage id. Add the two `required` entries.
- [ ] Smoke in a temporary folder: `next` for `ui` at each tier, and `decide --stage intake` moves to
  `reference`.
- Proves: the `ui` ids and order for every tier and mode, the guide headings, the quick rule, the
  replicate rule, that a `ui` project without `index.html` can finish `probe`, and that film, edit and
  web outputs are unchanged.
- Does not prove: that an interaction probe is the right check for work with no page (Q7); a run in a
  real browser (Chrome is needed).
- Waits for: S1 (both edit `tests/workflow-next.test.cjs`). Settles a conflict at archive time:
  `fix-tool-guidance-errors` pins the `ui` stage ids; this slice replaces that pin (see Pending).

## Wave 2 (S3 and S4 in parallel)

### S3 `decide` answers only what `next` asks (size M)

Owns `skill/scripts/workflow-core.cjs` (`decide` only); new `tests/workflow-decide.test.cjs`;
`tests/workflow-next.test.cjs` (two call sites, below).

Edits to `tests/workflow-next.test.cjs`, by test title:

- "standard film walks intake, reference, concepts, plan, build, check, review, deliver with two
  decisions": create `final.mp4` before its `deliver` call, because a `deliver` answer must now be a URL
  or a file that exists.
- "CLI next and decide drive the workflow and gates report back": its `deliver` call at film quick is out
  of turn (quick has no `deliver`). Expect the CLI's `OUT_OF_TURN` there.

Three calls in the whole suite are out of turn or unfinished-file `deliver` calls: those two, and the
`ui` case that finishes `work` with `deliver`, which S2 replaces.

- [ ] Write `tests/workflow-decide.test.cjs` first: R2 (an early `decide` for `review` or `deliver` is
  refused with code `OUT_OF_TURN`, state unchanged, message names the current stage and says to run
  `next`); `concept` matches stage ids `concepts` and `style`; a concept pick for `concepts` is refused
  while `concepts.md` is missing; `deliver` without `--answer`, with a missing file, and with a path
  outside the project root gives `INPUT_MISSING`; a URL and an existing file inside the project pass; the
  replicate refusal keeps its message. Reject after review: `decide --stage review --verdict reject` is
  accepted while `review` is the open stage, while `deliver` is the open stage (a test case of its own),
  and at `done` at standard and full. At those points every other out-of-turn call is refused with
  `OUT_OF_TURN`; an accept at `deliver` is refused because it is already accepted, and at `done` the
  message says the job is done. At quick there is no review, so every call at `done` is refused. Put
  every gate record in the test behind one small helper, so S5 changes one line.
- [ ] Confirm the cases fail on today's tree.
- [ ] Change `decide` only. Make the two edits above in `tests/workflow-next.test.cjs`.
- [ ] Smoke through the CLI in a temporary folder: an early `decide --stage review` is refused and
  `state.json` is unchanged.
- Proves: each refusal, by code and by the stage it names; R2 stops at the first early answer; the
  reject-after-review rule; every other `decide` call in `tests/workflow-next.test.cjs` still passes.
- Does not prove: who is calling.
- Waits for: S2, which shares `workflow-core.cjs` and replaces the `ui` `deliver` call. S3 could go
  before S2 only if its owner also fixes that `ui` case.

### S4 Modes mean one thing (size M)

Owns `skill/scripts/workflows/shared.cjs` (`reference()` finish rule); `skill/scripts/workflows/web.cjs`
(replicate at quick adds `reference`); `skill/references/workflow-web.md`, `workflow-film.md` and
`workflow-edit.md` (one sentence each); new `tests/workflow-modes.test.cjs`.

- [ ] Write `tests/workflow-modes.test.cjs` first. For each of the 36 cells (deliverable by tier by mode):
  freeform stage ids equal brief stage ids; freeform finishes `reference` with nothing on disk; in
  replicate the test first walks the cell to the `reference` stage (answering the stages before it), then
  sends the waiver `--answer none`, and checks that it is refused with its existing message and that no
  `then` line is offered. The waiver is never sent from an earlier stage, because S3 refuses that as out
  of turn and S3 may run beside S4. Every cell's ids are an ordered subset of the master list.
- [ ] Confirm the cases fail on today's tree (R8: web quick replicate has no `reference`).
- [ ] Change the `reference()` finish rule and web quick. Add the one sentence to each of the three
  guides.
- [ ] Smoke: `initState` with `replicate` for web quick, then the first stage is `reference`.
- Proves: the points above, all 36 cells.
- Does not prove: any content rule for freeform (that belongs to `add-web-capability-skills`).
- Waits for: S2 (its 36 cells include `ui`) and S1 (shares `web.cjs`).

## Wave 3

### S5 Gate records go by content (size L)

Owns `skill/scripts/workflows/shared.cjs` (`gatePassed`; remove `CLOCK_SKEW_MS` and `mtime`);
`skill/scripts/workflow-core.cjs` (`snapshot`, `recordGate`, the record shape);
`skill/scripts/workflows/film.cjs`, `edit.cjs`, `web.cjs` and `ui.cjs` (each stage that runs a gate names it
and gives its input list, one list per gate; film's draft is the newest render; `ui`'s `probe` gets its own
`gates` entry); `skill/scripts/film-project-core.cjs` (export `newestRender`);
`skill/scripts/cli-core.cjs` (the existing `recordGate` call sites); new
`tests/workflow-gates.test.cjs`; `tests/workflow-next.test.cjs` (below); the one gate-record helper line
in `tests/workflow-decide.test.cjs`; the one gate-recording helper line in
`tests/workflow-freshness.test.cjs` (helper line only).

Snapshot rule: the fingerprints of files a check reads are taken before it reads them. The fingerprints
of files the command writes itself (the nine evidence files of the `interaction` command, which writes
them and records in one command) are taken right after they are written. Both are taken before the
record is stored. Each `recordGate` call site passes the map it built. At the existing `interaction` call
site, `interaction.json` and the page file that its `url` names are fingerprinted before the check and
the nine evidence files right after the command writes them. There is no new call site.

Edits to `tests/workflow-next.test.cjs`, by test title:

- Rewrite "a gate result goes stale when its inputs change" and "a passed interaction gate goes stale
  when index.html changes" to change bytes instead of file times.
- Delete "a file written a few milliseconds after its gate still counts; a later edit does not".
- Every `recordGate` call in the file (17 today; S1 and S2 add some) gets its snapshot through one helper.

- [ ] Write `tests/workflow-gates.test.cjs` first: R4 (changed bytes with an old file time reopen the
  stage; a moved file time with the same bytes does not); R6 (`next` and `film check` pick the same
  render); R9 (no state file: the CLI says `recorded: false` with a reason); a gate that no stage of the
  deliverable declares is not recorded; a hand-written record without `inputs` never finishes a stage;
  the set of paths must equal the record's set; a web `interaction` record over the paths of web's list (a
  probe document, the page it names and the nine evidence files, as stand-in files) finishes `probe`, and the same record missing one path does not. The
  missing-file case (R5) belongs to S0 and stays in `tests/workflow-freshness.test.cjs`.
- [ ] Confirm the cases fail on today's tree.
- [ ] Add `snapshot` and the new `recordGate`. Rewrite `gatePassed` to compare hashes, hashing each file at
  most once per `next` call; keep S0's rule that a missing file blocks. Give each verify stage its gate
  entries (design section 5.2). Film's `film` list: `storyboard.json`, `score-grid.json` (when it
  exists), `index.html`, `compositions/*.html`, the local script files those pages load with
  `<script src>` (found by the same scan the check uses: `scanCompositionSource` and
  `compositionSources` in `film-project-core.cjs` and `film-timeline-core.cjs`),
  `.design-pipeline/hyperframes-catalog.json` (when it exists; it supplies block names), and the newest
  render. Export `newestRender` and use it in `film.cjs`.
- [ ] Update every existing `recordGate` call site in `cli-core.cjs` as the snapshot rule says, the
  `interaction` one included. Web `probe` gets one `gates` entry, gate `interaction`, that lists
  the list that S1 defines for web's `probe`.
- [ ] Edit the tests as listed above, and the helper lines in `tests/workflow-decide.test.cjs` and
  `tests/workflow-freshness.test.cjs`.
- [ ] Read-through: name the gaps that remain. `timeline.json`: the check writes it, and it reads an old
  one when there is no `index.html` or when the capture fails; then the step is stale and cannot pass.
  `hyperframes.json`: it only chooses how the page is captured.
- [ ] Smoke: `film scaffold`, record a gate, change a byte, `next` reopens `check`; `verify film-storyboard`
  on a file in a sub folder reports `recorded: false`.
- Proves: R4, R6 and R9 as above, the undeclared-gate rule, the no-`inputs` rule and the path-set rule.
- Does not prove: files a page loads other than local scripts found by the scan; pages served over
  `http`; the film render path needs `ffmpeg`.
- Waits for: S3 and S4 (shared files), and S1 (it defines web's `probe` list).

## Wave 4 (S6, then S7)

### S6 A verdict is about the draft it judged (size M)

Owns `skill/scripts/workflow-core.cjs` (`decide` review branch: store `subject`; clear `delivered`);
`skill/scripts/workflows/shared.cjs` (`REVIEW` finish rule and action); `skill/scripts/workflows/web.cjs`
and `ui.cjs` (their reviews use the shared finish rule); new `tests/workflow-review.test.cjs`;
`tests/workflow-next.test.cjs` (the reject and accept walk in "standard film walks intake, reference,
concepts, plan, build, check, review, deliver with two decisions" and "a rejected web draft reopens
probe", only where they conflict).

Rule: the latest verdict whose `subject` equals the draft's current snapshot decides. `REVIEW` is
finished when that latest verdict is an accept. If it is a reject, the action is `run` (never `ask`): it
says to rebuild and carries the `record` string of the review decision, so that an accept of the
unchanged draft can still be recorded by the person. A person can overturn their own earlier reject of
the same draft by recording an accept. So the walk in the standard film test (reject, fresh pass on the
same draft, accept, deliver) still passes.

- [ ] Write `tests/workflow-review.test.cjs` first: R3 (write the new bytes to `out.mp4` now, not with a
  future file time, because a future file time makes a fresh pass look stale under today's clock rule; a
  changed draft needs a new review and the old `accept` is ignored); after a reject and a fresh pass on
  the unchanged draft, `next` returns stage `review`, type `run` (the test asserts the type is `run` and
  not `ask`, and nothing about wording or a command); a later accept of the same draft finishes review; a
  new verdict clears `delivered`; a verdict without `subject` never counts; rejection still adds a
  project rule and clears the verify records.
- [ ] Confirm the cases fail on today's tree.
- [ ] Store `subject` (the merged `inputs` of every gate of the verify stage) and clear `delivered` in
  `decide`. Rewrite the `REVIEW` finish rule and action. Point the web and `ui` reviews at the shared
  finish rule.
- [ ] Smoke: walk film to review, accept, change `out.mp4`, record a fresh pass, `next` asks again. Then
  reject, record a fresh `film` pass on the unchanged draft, and `next` returns stage `review`, type
  `run`.
- Proves: R3 and the rules above.
- Does not prove: that a person, not an agent, gave the verdict.
- Waits for: S5.

### S7 `done` says what was checked and what was decided (size S)

Owns `skill/scripts/workflow-core.cjs` (the `done` branch of `nextAction`); new
`tests/workflow-evidence.test.cjs`.

- [ ] Write `tests/workflow-evidence.test.cjs` first: for every deliverable and tier, `done` has
  `delivered`, `gates`, `drafts` (same shape as today) and `acceptance`, which is `accepted` or `not asked`
  (when the tier has no review). Nothing merges `gates` with `drafts` or `acceptance`. Tests read the
  `acceptance` field only.
- [ ] Confirm the cases fail on today's tree.
- [ ] Add `acceptance` to the `done` branch. The one-line summary says that nobody reviewed a quick job;
  that line is guidance and is not tested.
- [ ] Smoke: `next` at `done` for film quick and film standard.
- Proves: the field for every tier and deliverable; `gates` and `drafts` keep their shape.
- Does not prove: anything about the wording of the summary line.
- Waits for: S6.

## Wave 5 (S8, then S9)

### S8 The full tier means one thing; guide fixes (size M)

Owns `skill/scripts/workflows/film.cjs` (`plan` action), `edit.cjs` (`cut` action), `web.cjs` and `ui.cjs`
(the same field); `skill/references/workflow-film.md`, `workflow-edit.md`, `workflow-web.md`,
`workflow-ui.md`; `skill/references/pipeline-reference.md` (line 26 only); new
`tests/workflow-tiers.test.cjs`; `tests/workflow-next.test.cjs` (below).

In `tests/workflow-next.test.cjs`, delete only the two `/OpenSpec change/` assertions inside "web quick
walks build then probe; standard adds intake, reference, concepts, review, deliver; full opens OpenSpec
at build". The `ui` case that also matched those words was already deleted by S2. The field cases
replace them.

- [ ] Write `tests/workflow-tiers.test.cjs` first: at `full`, the first make action of each deliverable
  (film `plan`, edit `cut`, web `build`, ui `work`) carries `openspec: "required"`; no other action and no
  other tier carries it; stage lists at `full` equal `standard`; quick keeps make and verify (edit also
  `analyze`; replicate adds `reference`) and asks nobody; standard has two human decisions plus the intake
  reply.
- [ ] Confirm the cases fail on today's tree.
- [ ] Add the field and one plain sentence to the four first make actions at `full`. Delete the two
  assertions listed above.
- [ ] Guides: what goes in the change and where `qa.md` lives (default: the project root, and the change
  links to it, Q12); why edit's reference is replicate-only; `pipeline-reference.md` line 26 says "at the
  full tier"; the web guide no longer names a `qa.md` that no step creates (D15).
- [ ] Smoke: `next` at `full` for the four deliverables shows the field on the first make action.
- Proves: the field at `full` for all four deliverables and its absence at quick and standard; `full`
  lists equal `standard` lists.
- Does not prove: that an OpenSpec change exists (Q3).
- Waits for: S7.

### S9 Step labels and the required-steps test (size M)

Owns `skill/scripts/workflows/shared.cjs` (`STEPS`, the table of required steps and the reasons for
absences); `film.cjs`, `edit.cjs`, `web.cjs`, `ui.cjs` (`step` on each stage);
`skill/scripts/workflow-core.cjs` (`step` in the `next` output; the art-director rule reads `step`); new
`tests/workflow-lifecycle.test.cjs`.

- [ ] Write `tests/workflow-lifecycle.test.cjs` first: every stage of every deliverable, tier and mode has
  a valid step; steps never go backwards along the master list; each deliverable's required steps are
  present at each tier or listed as absent with a reason (`design.md` section 3.2); edit's `style` ask
  carries the director note when `director` is set (D12).
- [ ] Confirm the cases fail on today's tree.
- [ ] Add `STEPS`, the required-steps table and `step` on each stage. `next` returns `step`. The
  art-director rule adds its note at every `ask` whose step is `direction` or `review`.
- [ ] Smoke: `next` for edit at standard with `director` set shows the note at `style`.
- Proves: the four points above.
- Does not prove: that a label is good; a label never picks the next stage.
- Waits for: S8. It touches every stage module, and the mapping is only final once S2 lands.

## Wave 6: Closure (S10, integrator)

Owns `skill/SKILL.md` (the tier row, the decision line and one mention of `workflow-ui.md`; measure the
file, limit 5120 bytes); `CHANGELOG.md`; `scripts/test-manifest.json` (every new test file);
`scripts/tool-list.json` (check that the `ui` rows exist if the registry has landed; add any that are
missing); this change's `qa.md`; the ticked `tasks.md`.

- [ ] `CHANGELOG.md` under Unreleased: the change and what it does to a project in flight (each gate and
  its review repeat once).
- [ ] Add the manifest lines for `workflow-freshness`, `workflow-decide`, `workflow-modes`,
  `workflow-gates`, `workflow-review`, `workflow-evidence`, `workflow-tiers` and `workflow-lifecycle` if
  the wave runs did not already.
- [ ] Edit `skill/SKILL.md` as above, then `wc -c skill/SKILL.md`.
- [ ] Run `node scripts/qa.cjs` directly, and `openspec validate align-workflow-lifecycle --strict`.
- [ ] Smoke the CLI in a temporary folder: film, edit, web and `ui` through `next` and `decide` (the exact
  checks are in the plan, Acceptance).
- [ ] Write `qa.md`: what ran, what was observed, and what was not verified (`design.md` section 13).
  Tick these boxes.
- Proves: the whole chain, on one quiet tree, once.
- Does not prove: Visual Acceptance (nothing here is a page or a film), or any guide's wording.

## S11 Host test integrity (built ahead of the waves, worktree `c1-1-test-integrity`)

- [x] `existing-project-core.cjs`: `snapshotHostTests`, `compareHostTests`; `workflow-core.cjs`: snapshot at
  `initState` for `ui` with `package.json` (`--replace` refused over unconfirmed changes), comparison again at every `next`
  and `decide`, deliver refuses a deleted snapshot test file and `work` reopens on one, `test-review`
  stage and `decide` value bound to the digest of the current changes; `cli-core.cjs`: exit 2 on a
  refused `decide`, help line.
- [x] Tests in `tests/workflow-next.test.cjs`: deletion refused through the CLI with titles; the user's
  earlier uncommitted edit (git fixture) not counted; a new test file needs no verdict; changed tests
  wait at `test-review`, reject goes back to `work`, accept finishes; old state only reports;
  deliver-then-delete is not done; accept-then-edit asks again; `--replace` refused over unconfirmed
  changes and allowed when unchanged or confirmed; `done.evidence.testChanges`.
- [x] `node scripts/qa.cjs`; `openspec validate align-workflow-lifecycle --strict`; smoke with the run-03
  `t2-a` diff on a copy of KATANAview `d08c06a`.
- [ ] When S2 and S3 land: keep `test-review` after the `ui` deliver step and in S3's turn check.

## Pending (not done by any task above)

These block nothing. Each needs the user's answer; the default in brackets is what the slices do now.

- [ ] Q1 Steps as a `step` field in code [yes, S9].
- [ ] Q2 `full` for film and edit matches web and `ui` [yes, S8].
- [ ] Q3 Check the ceremony by code [no; the field and prose only].
- [ ] Q4 `inputs` and `subject` are an extension of workflow-state v1 [yes]. If not: keep the clock rule;
  S5 shrinks to the draft rule (D6) and the not-recorded notice (D13), because S0 already fixed the
  missing-file rule (D5); S6 compares a verdict's time with the draft's file time.
- [ ] Q5 Freeform finishes `reference` with no study [yes; the alternative removes the value].
- [ ] Q6 `ui` gets concepts and review [yes].
- [ ] Q7 `verify interaction`, which after S1 also measures the page's first screen at three sizes, is the
  `ui` check, with a small preview page for work with no page [yes].
- [ ] Q8 Quick has a `deliver` step [no].
- [ ] Q9 `full` adds a third decision [no].
- [ ] Q10 Accept that `decide` cannot tell a person from an agent [yes]. S11's `test-review` depends on
  this answer: it is disclosure and consent, typed through an agent-writable channel.
- [ ] Q11 Drop the 50 ms clock allowance [yes, with S5].
- [ ] Q12 `qa.md` at `full` stays in the project root, and the change links to it [yes].
- [ ] Q13 Web and `ui` keep separate page stages; `ui` has its own `probe` and `review`, so S1 and S2 do
  not share `web.cjs` [yes].
- [ ] At archive time amend: (1) the `tool-guidance` requirement "The ui intake asks about what is built"
  (its `ui` stage ids sentence and its scenario "The ui stages do not move") and (2) the
  `split-film-edit-workflows` requirement "fresh gate results". The requirements "ceremony tiers", "two
  human decisions" and "project state" of `redesign-user-workflow` are kept and become true for every
  deliverable.
- [ ] Registry tool-list rows for the `ui` stages (`ui:reference`, `ui:concepts`, `ui:probe`, `ui:review`,
  `ui:deliver`) and the guide `references/workflow-ui.md`. Whichever of this change and
  `add-capability-registry` lands second adds them.

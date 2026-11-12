# Workflow Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four deliverables (`film`, `edit`, `web`, `ui`) follow one lifecycle of six steps and one meaning of "finished". A missing input never counts as fresh. `ui` gets a real flow. `decide` answers only the question `next` is asking. A gate record is tied to the bytes of the files it read. A person's verdict is tied to the draft they saw. `full` means one thing for all four. `replicate` and `freeform` mean one thing at every tier. No stage id and no `decide` value is renamed.

**Architecture:** Every change extends the existing v1 code in `skill/scripts/workflow-core.cjs` and `skill/scripts/workflows/*.cjs`. A stage object becomes `{ id, step, finished(state, root), action(state, root), gates? }`. `gates` lists one `{ id, inputs(state, root) }` per gate the verify stage runs. `workflow-core.cjs` gains `snapshot` and a stricter `recordGate`; the finish rule of a verify stage compares SHA-256 hashes, not file times. A verdict stores the snapshot it judged. `ui` gets its own stage module with its own `probe` and `review`; it shares no stage object with web. There is no new gate, receipt, schema, target resolver, policy digest or router. The state schema id `design-pipeline.workflow-state.v1` stays.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/align-workflow-lifecycle/` (`proposal.md`, `design.md`, `tasks.md`, `specs/workflow-lifecycle/spec.md`); summary `docs/superpowers/specs/2026-09-30-workflow-lifecycle.md` (draft, awaiting approval).

## Global Constraints

- Words used here. A **wave** is a group of slices built together. The **integrator** is whoever merges the slices and runs `node scripts/qa.cjs`. The **manifest** is `scripts/test-manifest.json`, the list of test files that QA runs. A **fixture** is a small made-up project that a test builds.
- Only the defects D1 to D15 in `design.md` section 7. Do not start anything in section 10: merging `next`/`decide`, `route`/`toolchain`/`execution` or `change`/`status`/`plan`/`run`; a new entry command; renaming stage ids or `decide` values; a new gate, finding code, receipt or schema, including wiring `component-first`, `verify components` or `verify motion` into `ui`, making `film check` read text boxes, and deciding who writes `control.gates`; checking by code that an OpenSpec change exists; the web page checks (S1) and evaluations of `next` for edit, web and `ui`; reorganising `pipeline-reference.md` and the other reference files.
- No new gate, finding code, receipt, schema file, target resolver, policy digest or router. The only new error code is `OUT_OF_TURN`. No stage id and no `decide --stage` value is renamed. The record shapes below extend workflow-state v1; they are not the component-first v1 Gate receipt.
- `add-web-composition-checks` is slice 1 (S1), another worker's. Do not edit or restate its files or its spec. S1 lands after S0; S2 goes after S1; S5 fingerprints the list that S1 defines for web's `probe` at the existing `interaction` call site.
- `fix-tool-guidance-errors` must be committed before S0 starts.
- Plain words: short sentences, ordinary verbs, explain a technical term in a few plain words (`skill/references/plain-language.md`). Do not widen a claim; keep every limit; mark guesses `[INFERENCE]`.
- The only sanctioned check is `node scripts/qa.cjs`, run directly with no pipe or redirect into the repository; never bare `node --test`. Only the integrator runs it, once per wave on a quiet tree, after adding the wave's new test lines to the manifest. A worker checks its own change with a throwaway script in a temporary folder outside the repository. The `node --check` step in `scripts/qa.cjs` covers `skill/scripts/*.cjs`, `skill/adapters` and `scripts/*.cjs`, but not `skill/scripts/workflows/*.cjs`. A new module there (`ui.cjs`) is checked only by the tests that load it.
- Each task edits only the files it owns. No file appears under two tasks that run in parallel (S3 and S4 are the only such pair, and they share no file). Shared files are sequenced by the chain S0, then S1 (external), then S2, then S3 and S4, then S5, S6, S7, S8, S9, S10. S2 goes after S1 because both edit `tests/workflow-next.test.cjs` and because `ui`'s `probe` calls `probeBinding`, which S1 adds. S7 and S8 share no file either, but they stay in order to keep the integrator's runs simple. Preserve unrelated working-tree changes; do not commit.
- No wording tests. Tests read ids, fields, states, codes and behaviour, never the exact words of an action, a summary line or a guide. Guide fixes are proved by reading them against the code.
- Name existing tests by their title, not by line number; lines move as slices land.
- Eight new test files: `workflow-freshness`, `workflow-decide`, `workflow-modes`, `workflow-gates`, `workflow-review`, `workflow-evidence`, `workflow-tiers`, `workflow-lifecycle` (each `.test.cjs`). The integrator adds their manifest lines at the end of each wave.
- Spec deltas use `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` and must pass `openspec validate align-workflow-lifecycle --strict`.
- Report Conformance (gates) and Visual Acceptance (a person's verdicts) separately. Gates never claim acceptance.

## Fixed interfaces (shared by all tasks)

- **Steps.** `STEPS = ["intake","direction","make","verify","review","deliver"]`, exported from `skill/scripts/workflows/shared.cjs`. Each stage has a `step`. `next` output gains `step`. The label never picks the next stage.
- **Stage object.** `{ id, step, finished(state, root), action(state, root), gates?: [{ id, inputs(state, root) -> string[] }] }`. Film `plan` lists `storyboard`; film `check` lists `film`; edit `check` lists `edit`; web `probe` lists `interaction` with the list that S1 defines (`probe` reads `interaction.json`); `ui` `probe` lists `interaction` with the same list, from `probeBinding`.
- **Web `probe` (from S1, another change).** There is no second gate id and no second input list. The existing gate `interaction` (command `designer-pipeline verify interaction --probe interaction.json`, record `state.gates.interaction = { status, at }`) also checks the page's first screen at 375x812, 768x1024 and 1440x900 and records ONE verdict: passed only if the probes and all three sizes pass. Web `probe` runs at every tier. It reads `interaction.json` and lists `interaction.json`, the page file that the probe's `url` names (a file inside the project folder) and nine files `evidence/composition/<size>/{screenshot.png,elements.json,result.json}` (three sizes). Its finish rule: all of them exist and `gatePassed(state, root, "interaction", <that list>)`. An http(s) `url`, a `url` leading outside the project folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open, and its action says what to change (the command still runs for an http(s) page). S1 adds `skill/scripts/composition-page-core.cjs` with `probeBinding(projectDir)`: it reads `interaction.json` and answers `{ kind: "file", file, inputs }` (`inputs` is `interaction.json`, the page file and the nine evidence files), `elsewhere`, `absent` or `invalid`. It reads no workflow state and holds no stage. Web's `probe` uses it, and so does S2's `ui` probe. The command writes the nine files before it calls `recordGate`, in one command, so there is no new `recordGate` call site. S1 edits none of `recordGate`, `decide`, `workflows/shared.cjs`, `workflow-core.cjs` or `KNOWN_OPTIONS`; the `next` command string for `probe` is unchanged.
- **Freshness (S0).** `gatePassed(state, root, gate, inputs)` returns false when the record is not `passed`, or when any entry of the list of inputs is empty (`null`, `undefined` or an empty path) or names a file that does not exist on disk. A file that exists with no bytes is not missing. Otherwise the clock rule stays until S5.
- **Gate record.** `state.gates.<gate> = { status, at, inputs: { "<project-relative path, forward slashes>": "<sha256 hex>" } }`. `at` is for people; it is not compared with file times. The fingerprints of files a check READS are taken before it reads them. The fingerprints of files the command WRITES itself (for example the nine evidence files of the `interaction` command, which writes them and records in one command) are taken right after they are written. Both are taken before the record is stored. Each `recordGate` call site passes the map it built. A record without `inputs` never counts. A stage is finished only if every declared input exists, the hashes equal the record, and the set of paths equals the record's set. Each file is hashed at most once per `next` call.
- **Verdict record.** `state.decisions.drafts[i] = { verdict, reason, at, subject: { "<path>": "<sha256>" } }`. `subject` is the merged `inputs` of every gate of the verify stage at the time of the verdict. The LATEST verdict whose `subject` equals the draft's current snapshot decides: review is finished when that latest verdict is an accept. When it is a reject the action is `run` (never an `ask`): it says to rebuild and carries the `record` string of the review decision, so that an accept of the unchanged draft can still be recorded by the person. A person can overturn their own earlier reject of the same draft by recording an accept. Any new verdict clears `state.decisions.delivered`. A verdict without `subject` never counts.
- **`workflow-core.cjs`.** `snapshot(root, gate, paths)` returns the map above for the stage of the project's deliverable that declares that gate (or only for the listed `paths` when they are given), or `null` when there is no state file or no stage declares the gate. A call site that reads some files and writes others calls it twice (the files it reads before the check, the files it writes right after the write) and joins the two maps. `recordGate(root, gate, status, inputs)` stores the record and returns `{ recorded: true }`, or `{ recorded: false, reason }` when `inputs` is `null`; the CLI copies `recorded: false` and the reason into the command result.
- **`decide` rules.** `decide --stage X` is refused unless the first unfinished stage is X (`concept` matches stage ids `concepts` and `style`; `intake`, `reference`, `review`, `deliver` match themselves). Refusal code `OUT_OF_TURN`; the message names the current stage and says to run `next`; state is unchanged. A concept pick for `concepts` is refused while `concepts.md` is missing. `deliver` needs `--answer`: a URL (`scheme://...`) or a path to a file that exists inside the project root; otherwise the existing code `INPUT_MISSING`. `decide --stage review --verdict reject` is accepted while `review` is the open stage, while `deliver` is the open stage, and when the job is done (standard and full: a person may change their mind after delivery). Every other out-of-turn call is refused with `OUT_OF_TURN` (an accept at `deliver` is refused, because it is already accepted; at done the message says the job is done). At quick every call at done is refused. The replicate refusal keeps its message.
- **Order of checks in `decide`.** The turn check comes first: a call that is out of turn gets `OUT_OF_TURN` even when its answer is also bad. The checks of the answer (`INPUT_MISSING`, the concept pick, the replicate refusal) come after it.
- **Modes.** Replicate: the `reference` stage cannot be waived at any tier of any deliverable. Freeform: `reference` is finished with no file and no decision and stays in the list (stage ids equal brief's). Master list per deliverable = standard tier, replicate mode list. Every tier and mode list is an ordered subset of it; a tier or mode never adds or reorders.
- **`ui` stage lists.** Quick: `work`, `probe` (replicate: `reference` first). Standard and full: `intake, reference, concepts, work, probe, review, deliver`. `work` is finished when `interaction.json` exists. `ui.cjs` defines its own `probe`: it runs the same command as web (`verify interaction --probe interaction.json`) and records the existing gate `interaction`, so `ui` gets the three-size check with no code of its own. Its finish rule takes its list from `probeBinding(root)` (S1, in `skill/scripts/composition-page-core.cjs`): `interaction.json`, the page file named by the probe's relative `url` and the nine evidence files that web lists. So `ui.cjs` repeats neither the rule nor the nine names, and it imports no stage object from `web.cjs`. When the `url` is http or https, leads outside the project folder or names a page that does not exist, or when the probe file is missing or invalid, `probe` stays open. It never lists `index.html` unless the probe names it. `ui.cjs` also defines its own `review` (same finish rule and `record` string as the shared review; text says "screen"). `concepts` has its own `ui` prompt; its finish rule and `decide` string are the shared ones. New guide `skill/references/workflow-ui.md` with one `## <stage id>` heading per `ui` stage id. No CLI change.
- **Ceremony.** Quick keeps make and verify (edit also keeps `analyze`; replicate adds `reference`) and asks nobody. Standard is the master list with two human decisions (the pick; the verdict) plus the intake reply. Full has the same stages and decisions as standard; its first make action (film `plan`, edit `cut`, web `build`, ui `work`) carries `openspec: "required"`, and no other tier or action carries it. Not machine-checked that a change folder exists.
- **`done` evidence.** Keeps `delivered`, `gates`, `drafts`; adds `acceptance`: `accepted` or `not asked` (when the tier has no review).
- **Art-director note.** Added to every `ask` whose step is `direction` or `review`, edit's `style` included.
- **Probe that cannot be bound (from S1).** As for web after S1: an http(s) `url`, a `url` leading outside the project folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open, and its action says what to change. Otherwise the list is `interaction.json`, the page file that `url` names and the nine evidence files (`probeBinding(root).inputs`). `ui`'s `probe` follows the same rule, and so do S5's `interaction` lists.
- **Proof scripts.** R1 to R12 are the throwaway repro scripts of `design.md` section 1. Use their scenarios as fixtures where a task says so.
- **Gate helper in tests.** Each test file that records gates does it through one small local helper (before S5: `recordGate(dir, gate, "passed")`; after S5: `snapshot`, then `recordGate` with the map). S5 changes the helper, not each call. This includes `tests/workflow-freshness.test.cjs` (S0): it must record every gate through one helper.

---

### Task S0: A missing input is never fresh

**Owner:** worker for S0. **Wave:** 0. **Waits for:** `fix-tool-guidance-errors` committed (it edits the top comment of `shared.cjs`; S0 edits only `gatePassed`). Runs BEFORE S1, so S1's own check that its listed files exist becomes redundant (S1 may drop it). Size S.

**Files:**

- Modify: `skill/scripts/workflows/shared.cjs` (`gatePassed` only)
- Create: `tests/workflow-freshness.test.cjs`

**Interfaces:**

- `gatePassed(state, root, gate, inputs)` per Fixed interfaces (Freshness). No CLI change, no state change, no stage-module change. It fixes D5. It changes nothing about content changes, a file put back with an old file time, or the 50 ms allowance (S5).
- Film `plan` and film `check`, and edit `check`, are protected today only by the ORDER of the earlier stages. Web `interaction.json` deleted after a pass stays `done` today; that is the reachable hole.
- Gates and their listed inputs today: `storyboard` (`storyboard.json`), `film` (`storyboard.json`, the draft render), `edit` (`edit.json`, `renders/edit.mp4`), `interaction` (`interaction.json`, `index.html`). After S1 web's list is `interaction.json`, the page file the probe names and nine evidence files, and the stage needs a real probe document; whoever lands S1 changes the one web fixture helper in the S0 test.

- [ ] **Step 1: Write `tests/workflow-freshness.test.cjs` (failing first)**

Use R12 of `design.md` as the fixture. (a) A direct unit test of `gatePassed`: a record `passed` with a missing listed input gives false; a `null` listed input gives false; a `failed` record gives false; all inputs present and fresh gives true. (b) For each of `storyboard` (film `plan`), `film` (film `check`), `edit` (edit `check`) and `interaction` (web `probe`): record the gate passed with every input present (call `recordGate(dir, gate, "passed")` directly) and `next` shows the stage finished; then, for each listed input in turn on a fresh project, delete it and `next` is not `done` (film returns to `plan` or `build`, edit to `cut` or `render`, web stays at `probe` or returns to `build`). Read stage ids and types only.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: web with `interaction.json` deleted after a pass stays `done`; the unit test with a missing input returns true. Film and edit cases may already pass because of stage order; keep them as regression cases.

- [ ] **Step 3: Change `gatePassed`**

Return false when the record is not `passed`, or when any listed input is null or missing on disk; otherwise keep the clock rule as it is. Touch nothing else in `shared.cjs`.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository: web quick, `touch` `index.html` and `interaction.json`, `recordGate(dir, "interaction", "passed")`, `next` is `done`; delete `interaction.json`, `next` is `probe`.

- [ ] **Step 5: Hand off**

Report the changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-freshness.test.cjs`.

**Acceptance:** a missing file blocks each of the four gates, and a `null` entry blocks the helper; a file that exists with no bytes does not. Not proven: content changes, a file put back with an old file time, or the 50 ms allowance (S5).

---

## S1 (not a task here)

S1 is `add-web-composition-checks`, owned by another worker. It lands after S0. What later tasks rely on: S1 adds no gate id; the existing `interaction` gate also carries the three-size first-screen check; web `probe` runs at every tier, reads `interaction.json`, and lists `interaction.json`, the page file that the probe's `url` names (a file inside the project folder) and the nine evidence files; an http(s) `url`, a `url` leading outside the folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open; S1 adds `skill/scripts/composition-page-core.cjs`, whose `probeBinding(projectDir)` reads the probe and returns the kind (`file`, `elsewhere`, `absent`, `invalid`) and, for a file, the list; the command writes the nine evidence files before `recordGate`, in one command; it edits none of `recordGate`, `decide`, `workflows/shared.cjs`, `workflow-core.cjs` and `KNOWN_OPTIONS`; it may add or change cases in `tests/workflow-next.test.cjs`; its Task 3 changes the one web helper of `tests/workflow-freshness.test.cjs`. Do not start S2 before it has landed.

---

### Task S2: The `ui` flow

**Owner:** worker for S2. **Wave:** 1. **Waits for:** S1 landed (both edit `tests/workflow-next.test.cjs`), and S0. Size L.

**Files:**

- Create: `skill/scripts/workflows/ui.cjs`
- Create: `skill/references/workflow-ui.md`
- Modify: `skill/scripts/workflow-core.cjs` (only `UI_INTAKE`, `codeStages`, `SUB_WORKFLOWS`, `stagesFor`)
- Modify: `skill/references/package-resources.json` (two `required` entries: `scripts/workflows/ui.cjs` and `references/workflow-ui.md`)
- Modify: `tests/workflow-next.test.cjs` (cases below)
- Modify: `scripts/tool-list.json` rows, only if `add-capability-registry` has landed

S2 does not edit `web.cjs`.

**Interfaces:**

- `ui.cjs` exports the `ui` stage builder used by `stagesFor`. It imports from `shared.cjs` only what exists there (`reference`, the shared `CONCEPTS` and `REVIEW` finish rules, and `gatePassed`) and defines its own `probe`, `work`, `deliver`, `concepts` prompt and `review` text. Lists per Fixed interfaces. `UI_INTAKE` moves into `ui.cjs` unchanged (same four questions).
- `ui` `probe`: runs the same command as web, `verify interaction --probe interaction.json`, and records the existing gate `interaction`, so `ui` gets the three-size check with no code of its own. Its finish rule (`gatePassed` with a list) names `interaction.json`, the page file that the probe's relative `url` names (a file inside the project folder) and the same nine evidence file names that web lists. As for web, an http(s) `url`, a `url` leading outside the folder, a page file that does not exist, or a missing or invalid probe file keeps `probe` open. It lists no fixed `index.html`, because a `ui` project need not have one. `ui.cjs` calls `probeBinding(root)` from `skill/scripts/composition-page-core.cjs` (S1 adds it and lands first) and takes the list from its `inputs`, so it repeats neither the rule nor the nine names; that file holds no stage, and `ui.cjs` imports no stage object from `web.cjs`. Read that file as landed first: if the name or shape of `probeBinding` differs from S1's plan, use the landed one and say so in the hand-off.
- `ui` `review`: same finish rule and `record` string as the shared review; its text says "screen".
- `work` action text says the agent writes `interaction.json` in this stage (the same author as web's `probe`). `[INFERENCE]` The design fixes this; not run against a real page. `work` at `full` keeps its present OpenSpec sentence; the structured field comes in S8.
- `concepts` for `ui`: three cards about screens (first task, structure, states, look, tools, any missing licence). Finish rule and `decide` string are the shared ones.
- `SUB_WORKFLOWS` gains `ui` with `workflow-ui.md`. Every `ui` stage's guide points to a `##` heading that exists.
- The three-size check comes to `ui` only through the command it shares with web; `ui.cjs` has no code for it (Q7).
- Edits to `tests/workflow-next.test.cjs`, by test title: delete "ui uses OpenSpec only at the full tier" (a wording pin that breaks once `ui` has `reference` after `intake`); extend the guide loop of "film, edit and web actions name a guide section that exists for every stage" to `ui` and replace its check that `ui` has no guide; replace "ui stages keep their ids and order: quick is work; standard and full are intake then work" (it also finishes `work` on a bare `deliver`); leave "ui intake asks about what is built, with no duration or film wording, and keeps the shared record" unchanged.

- [ ] **Step 1: Write the failing tests in `tests/workflow-next.test.cjs`**

Using its `tmp`, `touch`, `initState`, `decide`, `nextAction`, `recordGate` helpers: (a) `ui` stage ids and order for every tier and mode equal the Fixed interfaces list and are an ordered subset of the master list; (b) every `ui` action's guide names a `##` heading present in `workflow-ui.md` (the extended guide loop); (c) `ui` quick with `interaction.json` and no `interaction` record is not `done`; (d) a `ui` project with no `index.html` finishes `probe` when a passed `interaction` record exists and `interaction.json`, the page file its probe names and the nine evidence files are present; deleting any one of them reopens `probe`; a probe whose `url` is `https://...`, leads outside the folder or names a page that does not exist keeps `probe` open; (e) `ui` quick replicate starts at `reference`, and `decide --stage reference --answer none` is refused; (f) `ui` quick has no `deliver` stage; (g) `ui` standard walks `intake, reference, concepts, work, probe, review, deliver` with two decisions (the pick; the verdict) and the intake reply. Any `deliver` call in the new `ui` walk passes an `https://` URL or a real file, so S3 never has a fourth call to fix. Keep the existing cases that compare film, edit and web whole outputs.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Run them with a throwaway script outside the repository that requires the same helpers. Expected: `ui` quick returns `work` only and finishes on `deliver`; the guide loop finds no `ui` guide.

- [ ] **Step 3: `ui.cjs`, `workflow-core.cjs`, guide, resources**

Write `ui.cjs`, wire `stagesFor` and `SUB_WORKFLOWS`, write `workflow-ui.md` (one `##` heading per `ui` stage id: `intake`, `reference`, `concepts`, `work`, `probe`, `review`, `deliver`), add the two `required` entries. If the registry has landed, add the five `ui` rows (`ui:reference`, `ui:concepts`, `ui:probe`, `ui:review`, `ui:deliver`) and the guide to `scripts/tool-list.json`.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository: `node skill/scripts/designer-pipeline.cjs next --root <dir> --project-root <dir> --deliverable ui --tier standard`. Expected: stage `intake` with the four questions. `decide --stage intake --answer x`, then `next`: stage `reference`. Repeat with `--tier quick`: stage `work`; write `interaction.json`: stage `probe`. Repeat with `--mode replicate --tier quick`: stage `reference`. Run the same `next` for film, edit and web and compare with the output before the change: identical.

- [ ] **Step 5: Read-through against the code**

Read `ui.cjs` against `design.md` sections 3.2 and 3.3: ids, order, subset rule, no new gate, receipt or CLI change, no import from `web.cjs`.

- [ ] **Step 6: Hand off**

Report the changed files and case names. Do not run `node scripts/qa.cjs`. Manifest lines needed: none (no new test file). Note that `ui.cjs` is not covered by `node --check` in QA, only by the tests that load it.

**Acceptance:** the `ui` ids and order are right for every tier and mode; guide headings exist; quick needs a passed `interaction` record; a `ui` project without `index.html` can finish `probe`; replicate cannot be waived; film, edit and web output unchanged. Not proven: that an interaction probe suits work with no page (Q7); a real browser run.

---

### Task S3: `decide` answers only what `next` asks

**Owner:** worker for S3. **Wave:** 2 (parallel with S4). **Waits for:** S2 (shares `workflow-core.cjs`, and replaces the `ui` `deliver` call). S3 could go before S2 only if its owner also fixes that `ui` case. Size M.

**Files:**

- Modify: `skill/scripts/workflow-core.cjs` (`decide` only)
- Create: `tests/workflow-decide.test.cjs`
- Modify: `tests/workflow-next.test.cjs` (two call sites, below)

**Interfaces:**

- Refusals and the reject-after-review rule exactly as in Fixed interfaces. Nothing else about `decide` changes.
- Three calls in the suite are affected: the `deliver` call in "standard film walks intake, reference, concepts, plan, build, check, review, deliver with two decisions" (create `final.mp4` before it, because a `deliver` answer must now be a URL or an existing file); the `deliver` call in "CLI next and decide drive the workflow and gates report back" at film quick (out of turn, so expect the CLI's `OUT_OF_TURN`); and the `ui` case that finishes `work` with `deliver`, which S2 replaces. This task owns the first two.
- The new test file uses the helpers of `tests/workflow-next.test.cjs` (`tmp`, `touch`, `initState`, `decide`, `nextAction`, `readState`). Every gate record in it goes through one local helper (Fixed interfaces), so S5 changes one line.

- [ ] **Step 1: Write `tests/workflow-decide.test.cjs` (failing first)**

Cases: R2 fixture (film standard): `decide` for `review` accept, then for `deliver`, before earlier stages are done, both refused with `OUT_OF_TURN`, `readState` equal before and after, message names the current stage. `concept` is accepted at `concepts` (film, web) and at `style` (edit) when that is the current stage. Concept pick refused while `concepts.md` is missing, accepted after `touch`. `deliver` with no `--answer`, with a path that does not exist, and with a path outside the root: `INPUT_MISSING`. `deliver` with `https://example.com/x` and with an existing file inside the root: accepted. Replicate refusal of `--answer none` at `reference` keeps its message (compare the code and that the stage is named; read the text from a call before the change). Reject after review: `decide --stage review --verdict reject` is accepted while `review` is the open stage, while `deliver` is the open stage (a case of its own), and at `done` at standard and full. At `deliver`, an accept is refused with `OUT_OF_TURN`. At `done`, an accept and a `deliver` are refused with `OUT_OF_TURN` and the message says the job is done. At quick, every call at `done` is refused.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: early answers are accepted (R2 reaches `done`), `deliver` accepts a missing file, and answers after `done` are accepted.

- [ ] **Step 3: Change `decide`**

Implement the rules of Fixed interfaces. Then make the two edits in `tests/workflow-next.test.cjs`, using the smallest change that keeps each case's intent.

- [ ] **Step 4: Smoke through the CLI**

In a temporary folder outside the repository: `next --deliverable film --tier standard`, then `decide --stage review --verdict accept` (add `--root <dir>`). Expected: JSON error with code `OUT_OF_TURN`, non-zero exit, `.design-pipeline/state.json` bytes unchanged. Then `decide --stage intake --answer default`: accepted.

- [ ] **Step 5: Read-through against the code**

Search every `decide(` and `run("decide"...` call in `tests/` and `skill/`. Expected: the only out-of-turn or missing-file calls are the three named above.

- [ ] **Step 6: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line for the integrator: `workflow-decide.test.cjs`.

**Acceptance:** each refusal by code and stage name; R2 stops at the first early answer; the reject-after-review rule holds; other `decide` calls in the workflow tests still pass. Not proven: who is calling.

---

### Task S4: Modes mean one thing

**Owner:** worker for S4. **Wave:** 2 (parallel with S3). **Waits for:** S2 (its 36 cells include `ui`) and S1 (shares `web.cjs`). Size M.

**Files:**

- Modify: `skill/scripts/workflows/shared.cjs` (`reference()` finish rule)
- Modify: `skill/scripts/workflows/web.cjs` (replicate at quick adds `reference`)
- Modify: `skill/references/workflow-web.md`, `workflow-film.md`, `workflow-edit.md` (one sentence each)
- Create: `tests/workflow-modes.test.cjs`

**Interfaces:**

- Under `freeform`, `reference` is finished with no file and no decision, and stays in the list. Stage ids under `freeform` equal `brief`'s.
- Under `replicate`, web quick lists `reference` first; with S2, replicate leaves `reference` unwaivable at every tier of every deliverable. The waiver refusal message is unchanged and no `then` line is offered.
- The master-list rule: every tier and mode list is an ordered subset of the standard-replicate list.
- Do not touch `shared.cjs` beyond the `reference()` finish rule (S5 and S6 edit it later).
- S3 refuses an answer for a later stage as out of turn, and S3 and S4 may run side by side. So the test must walk each cell to the `reference` stage, answering the stages before it, BEFORE it sends the waiver. Never send the waiver from an earlier stage.

- [ ] **Step 1: Write `tests/workflow-modes.test.cjs` (failing first)**

Loop over 4 deliverables by 3 tiers by 3 modes (36 cells), using `initState` and reading the stage ids from the `next` walk (R1 fixture). Assert: freeform ids equal brief ids in every cell; freeform finishes `reference` with nothing on disk (walk to it: it is completed and `reference.md` is absent); in every replicate cell, walk to the `reference` stage, then send the waiver `--answer none`: it is refused with the existing message and the refusal offers no `then` line; every cell's ids are an ordered subset of the deliverable's master list (`design.md` section 3.3).

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: web quick replicate (R8) has no `reference`; freeform `reference` is not finished.

- [ ] **Step 3: Implement and write the three sentences**

Change the `reference()` finish rule and web quick. Add one plain sentence to each guide saying that replicate cannot skip the reference and that freeform leaves the reference with no study.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository: `initState` for web quick with `replicate`, then `next`. Expected: stage `reference`. Then with `freeform` at standard: `next` lists the same stage ids as brief, and `reference` is completed with no file.

- [ ] **Step 5: Read-through against the code**

Compare the guide sentences with the code; no claim wider than what the code does (freeform has no content rule; that is `add-web-capability-skills`).

- [ ] **Step 6: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line for the integrator: `workflow-modes.test.cjs`.

**Acceptance:** freeform ids equal brief ids; freeform finishes `reference` with nothing on disk; replicate unwaivable in all cells; master-list rule holds for all 36 cells. Not proven: any content rule for freeform.

---

### Task S5: Gate records go by content

**Owner:** worker for S5. **Wave:** 3. **Waits for:** S3, S4, and S1 (it defines web's `probe` list). Size L.

**Files:**

- Modify: `skill/scripts/workflows/shared.cjs` (`gatePassed`; remove `CLOCK_SKEW_MS` and `mtime`)
- Modify: `skill/scripts/workflow-core.cjs` (`snapshot`, `recordGate`, the record shape)
- Modify: `skill/scripts/workflows/film.cjs`, `edit.cjs`, `web.cjs`, `ui.cjs` (each stage that runs a gate names it and its input list; web `probe` gets one `gates` entry, gate `interaction`, listing the list that S1 defines; `ui`'s `probe` gets its own `gates` entry, gate `interaction`, with the same list, from `probeBinding`)
- Modify: `skill/scripts/film-project-core.cjs` (export `newestRender`)
- Modify: `skill/scripts/cli-core.cjs` (the existing `recordGate` call sites, the `interaction` one included; there is no new call site)
- Create: `tests/workflow-gates.test.cjs`
- Modify: `tests/workflow-next.test.cjs` (cases below)
- Modify: `tests/workflow-decide.test.cjs` (only its one gate-record helper)
- Modify: `tests/workflow-freshness.test.cjs` (only its one gate-recording helper line)

**Interfaces:**

- `snapshot(root, gate, paths)` and `recordGate(root, gate, status, inputs)` as in Fixed interfaces. `recordGate` with `inputs === null` returns `{ recorded: false, reason }`; the CLI copies both into the command result.
- Snapshot rule (Fixed interfaces, gate record): fingerprints of files a check reads are taken before it reads them; fingerprints of files the command writes itself are taken right after they are written; both before the record is stored. Each call site passes the map it built (`snapshot(root, gate, paths)` called twice where a site both reads and writes, and the two maps joined). Call sites: film-storyboard, interaction, film, edit. At the existing `interaction` call site, `interaction.json` and the page file that the probe names are fingerprinted before the check, and the nine evidence files under `evidence/composition/` right after the command writes them.
- Input lists (`design.md` section 5.2): `storyboard`: `storyboard.json`. `film`: `storyboard.json`, `score-grid.json` (when it exists), `index.html`, `compositions/*.html`, the local script files those pages load with `<script src>` (found by the same scan the check uses: `scanCompositionSource` and `compositionSources` in `film-project-core.cjs` and `film-timeline-core.cjs`), `.design-pipeline/hyperframes-catalog.json` (when it exists; it supplies block names), and `newestRender(root)`. `edit`: `edit.json`, `edit/analysis.json`, the render. `interaction` (web): the list S1 defines (`interaction.json`, the page file the probe's `url` names, the nine evidence files). `interaction` (`ui`): the same three groups, listed by `ui.cjs`; no fixed `index.html`. Paths are project-relative with forward slashes.
- Named gaps (say so in the read-through step): `timeline.json` (the check writes it; it reads an old one when there is no `index.html`, or when the capture fails, and then the step is stale and cannot pass) and `hyperframes.json` (it only chooses how the page is captured); also files a page loads other than local scripts found by the scan, and pages served over `http`.
- `newestRender(root)` in `film-project-core.cjs` is the function `film check` already uses (newest non-empty `.mp4`); `film.cjs` uses it for its draft.
- `gatePassed` in `shared.cjs`: status passed, record has `inputs`, every declared input exists (S0's rule stays), each hash equals the record, and the set of paths equals the record's set. Hash each file at most once per `next` call (a per-call cache).
- `CLOCK_SKEW_MS` and `mtime` are deleted, not deprecated (Q11 default).
- Edits to `tests/workflow-next.test.cjs`, by test title: rewrite "a gate result goes stale when its inputs change" and "a passed interaction gate goes stale when index.html changes" to change bytes instead of file times; delete "a file written a few milliseconds after its gate still counts; a later edit does not"; every `recordGate` call in the file (17 today; S1 and S2 add some) gets its snapshot through one helper.
- Do not add a gate id, receipt or schema. The state schema id stays.

- [ ] **Step 1: Write `tests/workflow-gates.test.cjs` (failing first)**

Cases: R4 (film quick, both gates passed; different bytes in `storyboard.json` with its file time set an hour back: `next` reopens the stage; move only the file time of `out.mp4`, bytes unchanged: still `done`); R6 (film quick with `out.mp4` and a newer `renders/newer.mp4`: the draft `next` uses equals `newestRender`, the file `film check` picks); a hand-written record without `inputs` does not finish any stage; a record whose path set differs (extra or missing path) does not finish; a web `interaction` record over the paths of web's list (a real probe document, the page it names and the nine evidence files, as stand-in files) finishes `probe`, and the same record missing one path does not; a change to `index.html` or to a local script a page loads reopens `film` `check`; `snapshot` returns `null` for an undeclared gate and with no state file; `recordGate` with `inputs: null` returns `{ recorded: false, reason }`. R9 through the CLI in a temporary folder: `next` (film, quick), `film scaffold --output .`, copy `storyboard.json` to `sub/`, `verify film-storyboard --storyboard sub/storyboard.json`: result carries `recorded: false` and a reason; the same call with the file in the project root records a record with `inputs`. R5 (a deleted input reopens) belongs to S0 and stays in `tests/workflow-freshness.test.cjs`. Mark render cases `{ skip: !hasFfmpeg && "ffmpeg not installed" }` if they need a real render; use tiny stand-in files where the stage only hashes them.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: R4 first case stays `done`; R9 says `passed` with `gates` empty and no `recorded` field.

- [ ] **Step 3: Core**

Implement `snapshot`, the new `recordGate`, the record shape and `gatePassed`. Export `newestRender`. Give each verify stage its `gates` entries (one entry per gate it runs, each with its own input list). Remove `CLOCK_SKEW_MS` and `mtime`.

- [ ] **Step 4: CLI call sites**

At every existing `recordGate` call site in `cli-core.cjs` (including `interaction`), build the map by the snapshot rule, run the check, then `recordGate(..., inputs)`. When there is no state file, the command result says `recorded: false` with the reason. Touch only the call sites.

- [ ] **Step 5: Update the tests**

In `tests/workflow-next.test.cjs`, make the three edits listed in Interfaces. Change the one gate-recording helper line in each of `tests/workflow-decide.test.cjs` and `tests/workflow-freshness.test.cjs`, so they take the snapshot before recording.

- [ ] **Step 6: Smoke**

In a temporary folder outside the repository: `next` (film, quick); `film scaffold --output .`; `verify film-storyboard --storyboard storyboard.json`; read `.design-pipeline/state.json`: `gates.storyboard.inputs` names `storyboard.json` with a 64-character hash. Change one byte, `next`: stage `plan` again. Touch the file without changing bytes and rerun the verify then `next`: not reopened. Then the R9 sub-folder call: `recorded: false`.

- [ ] **Step 7: Read-through against the code**

Compare each stage's input list with `checkFilmProject` (`film-project-core.cjs`) and `checkProject` (`edit-project-core.cjs`). Expected: every file the check reads is listed, or the gap is one of the named gaps above.

- [ ] **Step 8: Hand off**

Report changed lines, the `cli-core.cjs` call sites touched and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-gates.test.cjs`.

**Acceptance:** R4, R6, R9 behave as above; an undeclared gate is not recorded; a record without `inputs` finishes nothing; a different path set finishes nothing. R5 stays proved by S0. Not proven: files a page loads other than local scripts; pages served over `http`; the film render path needs `ffmpeg`.

---

### Task S6: A verdict is about the draft it judged

**Owner:** worker for S6. **Wave:** 4 (first). **Waits for:** S5. Size M.

**Files:**

- Modify: `skill/scripts/workflow-core.cjs` (`decide` review branch: store `subject`; clear `delivered`)
- Modify: `skill/scripts/workflows/shared.cjs` (`REVIEW` finish rule and action)
- Modify: `skill/scripts/workflows/web.cjs`, `ui.cjs` (their reviews use the shared finish rule)
- Create: `tests/workflow-review.test.cjs`
- Modify: `tests/workflow-next.test.cjs` (the reject and accept walks in "standard film walks intake, reference, concepts, plan, build, check, review, deliver with two decisions" and "a rejected web draft reopens probe", only where they conflict)

**Interfaces:**

- On a verdict, `decide` stores `subject` = the merged `inputs` of every gate of the verify stage, taken from the records at that time. Any new verdict clears `state.decisions.delivered`. Rejection still adds a project rule and clears the verify records.
- `REVIEW` finished: the latest verdict whose `subject` equals the draft's current snapshot is an accept. If that latest verdict is a reject, the action has type `run` (never `ask`); it says to rebuild and carries the `record` string of the review decision, so an accept of the unchanged draft can still be recorded. A verdict without `subject` never counts. A person can overturn their own earlier reject of the same draft by recording an accept, so the walk in the standard film test (reject, fresh pass on the same draft, accept, deliver) still passes.

- [ ] **Step 1: Write `tests/workflow-review.test.cjs` (failing first)**

Cases: R3 (film standard: walk to review, accept, record `deliver` with an existing file; then write different bytes to `out.mp4` NOW, not with a future file time, because a future file time makes a fresh pass look stale under today's clock rule; record a fresh passed `film` record: `next` is not `done` and asks for a new review; the old `accept` is ignored). After a reject and a fresh `film` pass on the unchanged draft, `next` returns stage `review` with type `run` and not `ask`; assert the type only, not a command and not any wording. A later accept of the same draft finishes review. A changed draft after a reject asks again. A new verdict (accept or reject) clears `decisions.delivered`. A hand-written verdict without `subject` never counts. The walks at the top of `tests/workflow-next.test.cjs` still give the same results.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: after the draft changes, `next` still says `done` (R3); after a reject and a fresh pass, `next` asks again instead of returning `run`.

- [ ] **Step 3: Implement**

Add `subject` and the `delivered` clear in `decide`. Rewrite the `REVIEW` finish rule and action in `shared.cjs`. Point the web and `ui` reviews at the shared finish rule.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository, film standard through the real functions: accept a draft, change `out.mp4`, record a fresh pass, `next`: stage `review`, type `ask`. Then reject, record a fresh `film` pass on the unchanged draft, `next`: stage `review`, type `run`.

- [ ] **Step 5: Read-through against the code**

Confirm `subject` is stored as the merged gate inputs and no clock is read.

- [ ] **Step 6: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-review.test.cjs`.

**Acceptance:** R3 gives a new review; an unchanged rejected draft gets `run` and never a second `ask` (until the person accepts it); a new verdict clears `delivered`; a verdict with no `subject` never counts. Not proven: that a person, not an agent, gave the verdict.

---

### Task S7: `done` says what was checked and what was decided

**Owner:** worker for S7. **Wave:** 4 (after S6). **Waits for:** S6. Size S.

**Files:**

- Modify: `skill/scripts/workflow-core.cjs` (the `done` branch of `nextAction`)
- Create: `tests/workflow-evidence.test.cjs`

**Interfaces:**

- `done` evidence keeps `delivered`, `gates` and `drafts` in their present shape and adds `acceptance`: `accepted`, or `not asked` when the tier has no review. The one-line summary says that nobody reviewed a quick job; that line is guidance and is not tested. Tests read the `acceptance` field only. Conformance and Visual Acceptance are never merged into one field.

- [ ] **Step 1: Write `tests/workflow-evidence.test.cjs` (failing first)**

For each deliverable and tier, drive a project to `done` with the real functions and small stand-in files: quick gives `acceptance === "not asked"` and `drafts` empty; standard and full give `acceptance === "accepted"`, `drafts` has one entry, and `delivered` is set. `gates` and `drafts` keep the shape they have today. Read fields only.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: no `acceptance` field.

- [ ] **Step 3: Implement**

Add the field and the summary sentence to the `done` branch.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository: `next` at `done` for film quick and film standard. Expected: the first shows `acceptance: "not asked"`, the second `"accepted"`.

- [ ] **Step 5: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-evidence.test.cjs`.

**Acceptance:** the field is right for every tier and deliverable; `gates` and `drafts` are unchanged in shape.

---

### Task S8: The full tier means one thing; guide fixes

**Owner:** worker for S8. **Wave:** 5 (first). **Waits for:** S7. Size M.

**Files:**

- Modify: `skill/scripts/workflows/film.cjs` (`plan` action), `edit.cjs` (`cut` action), `web.cjs` (`build` action), `ui.cjs` (`work` action)
- Modify: `skill/references/workflow-film.md`, `workflow-edit.md`, `workflow-web.md`, `workflow-ui.md`
- Modify: `skill/references/pipeline-reference.md` (line 26 only)
- Create: `tests/workflow-tiers.test.cjs`
- Modify: `tests/workflow-next.test.cjs` (delete two assertions, below)

**Interfaces:**

- At `full`, the first make action of each deliverable carries the structured field `openspec: "required"` and one plain sentence. No other tier and no other action carries the field. Stage lists at `full` equal `standard`. Nothing checks by code that a change folder exists (Q3).
- In `tests/workflow-next.test.cjs`, delete only the two `/OpenSpec change/` assertions inside "web quick walks build then probe; standard adds intake, reference, concepts, review, deliver; full opens OpenSpec at build". The `ui` case that matched the same words was already deleted by S2. The field cases replace them.
- Guides say what goes in the change (the brief, the chosen concept, the tasks and the QA record for film and edit) and where the review record `qa.md` lives (default: the project root, where `film scaffold` writes it, and the change links to it; Q12). `workflow-edit.md` says why edit's reference is replicate-only, marked `[INFERENCE]` because the reason is not written in the repository. `workflow-web.md` stops naming a `qa.md` that no step creates (D15). `pipeline-reference.md` line 26 says "at the full tier".

- [ ] **Step 1: Write `tests/workflow-tiers.test.cjs` (failing first)**

For each of the four deliverables at each tier: the first make action (film `plan`, edit `cut`, web `build`, ui `work`) has `openspec === "required"` at `full` only; no other action at any tier has the field; the stage id list at `full` equals that at `standard`; quick keeps make and verify (edit also `analyze`; replicate adds `reference`) and its walk has no `ask`; standard's walk has the intake reply and two decisions (the pick; the verdict). Read fields and ids only. R1 is the fixture.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: no action has the field.

- [ ] **Step 3: Implement**

Add the field and sentence at `full` in the four first make actions. Delete the two assertions named above.

- [ ] **Step 4: Guides and reference**

Write the guide sentences and the one-phrase fix in `pipeline-reference.md` line 26. Keep exactly one `##` heading per stage id in each guide.

- [ ] **Step 5: Smoke**

In a temporary folder outside the repository, `next --tier full` for each of the four deliverables, walked to the first make stage. Expected: `openspec: "required"` on that action; the same walk at `standard` shows no such field.

- [ ] **Step 6: Read-through against the code**

Compare the guide sentences with the code and `design.md` section 4. Expected: no claim that `next` checks the change folder.

- [ ] **Step 7: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-tiers.test.cjs`.

**Acceptance:** the field appears at `full` for all four deliverables and nowhere else; `full` lists equal `standard`; the two wording assertions are gone. Not proven: that an OpenSpec change exists.

---

### Task S9: Step labels and the required-steps test

**Owner:** worker for S9. **Wave:** 5 (after S8). **Waits for:** S8. Size M.

**Files:**

- Modify: `skill/scripts/workflows/shared.cjs` (`STEPS`, the table of required steps and the reasons for absences)
- Modify: `skill/scripts/workflows/film.cjs`, `edit.cjs`, `web.cjs`, `ui.cjs` (`step` on each stage)
- Modify: `skill/scripts/workflow-core.cjs` (`step` in the `next` output; the art-director rule reads `step`)
- Create: `tests/workflow-lifecycle.test.cjs`

**Interfaces:**

- `STEPS` and `step` per Fixed interfaces. Mapping is `design.md` section 3.2: film `intake` is intake, `reference` and `concepts` are direction, `plan` and `build` are make, `check` is verify, then `review`, `deliver`; edit `analyze`, `reference`, `style` are direction, `cut` and `render` are make; web and `ui` `probe` is verify.
- The table of required steps per deliverable and tier lists each required step or an absence with its reason (quick skips intake, the pick, review, deliver; edit has no reference outside replicate; only film has an early gate).
- `step` is read by three things only: the `next` output, the required-steps test, and the art-director rule. It never picks the next stage. The art-director note is added to every `ask` whose step is `direction` or `review`.

- [ ] **Step 1: Write `tests/workflow-lifecycle.test.cjs` (failing first)**

Loop over deliverable, tier and mode (R1 fixture): every stage has a `step` in `STEPS`; steps never go backwards along the master list; every required step is present or listed as absent with a reason (read the table from `shared.cjs`); with `director` set, the `style` ask of edit carries the director note, and so do the `concepts` and `review` asks (R10); `next` output has `step` equal to the stage's step. Read ids and fields only.

- [ ] **Step 2: Confirm the cases fail on today's tree**

Throwaway script outside the repository. Expected: no `step`; edit `style` has no `director` note.

- [ ] **Step 3: Implement**

Add `STEPS`, the table, the labels, the `next` field and the art-director rule change.

- [ ] **Step 4: Smoke**

In a temporary folder outside the repository: edit standard with `director` set, `next` at `style`. Expected: `step: "direction"` and a `director` note. Film standard `next` at `check`: `step: "verify"`.

- [ ] **Step 5: Read-through against the code**

Search for readers of `step` in `skill/`. Expected: exactly the three above.

- [ ] **Step 6: Hand off**

Report changed lines and case names. Do not run `node scripts/qa.cjs`. Manifest line: `workflow-lifecycle.test.cjs`.

**Acceptance:** every stage has a valid step; steps never go backwards; required steps are present or absent with a reason; edit's `style` ask carries the director note. Not proven: that a label is good.

---

### Task S10: Closure

**Owner:** integrator. **Wave:** 6. **Waits for:** S9. Size S.

**Files:**

- Modify: `skill/SKILL.md` (the tier row, the decision line and one mention of `workflow-ui.md`; measure with `wc -c`, limit 5120 bytes; it is 4,293 bytes at the time of writing)
- Modify: `CHANGELOG.md`
- Modify: `scripts/test-manifest.json` (every new test file: `workflow-freshness`, `workflow-decide`, `workflow-modes`, `workflow-gates`, `workflow-review`, `workflow-evidence`, `workflow-tiers`, `workflow-lifecycle`, each `.test.cjs`, if not already added at the end of its wave)
- Modify: `scripts/tool-list.json` (check that the `ui` rows exist if the registry has landed; add any that are missing)
- Create: `openspec/changes/align-workflow-lifecycle/qa.md`
- Modify: `openspec/changes/align-workflow-lifecycle/tasks.md` (tick boxes only)

**Interfaces:**

- `skill/SKILL.md`: the tier row says what each tier keeps and that `full` adds an OpenSpec change opened before the first make stage; the decision line says the two decisions apply to `film`, `edit`, `web` and `ui` at standard and full. One mention of `workflow-ui.md`. `add-web-capability-skills` owns the front matter and the web bullet; do not edit them. Whoever lands last measures the file.
- `CHANGELOG.md` under Unreleased: the change id; what changed (six steps, `ui` flow, missing input never fresh, `decide` order, content-based records, verdicts tied to drafts, `acceptance` in `done`, `full` for film and edit, replicate and freeform); that a project in flight repeats each gate and its review once (no legacy path).
- `qa.md` follows `openspec/changes/add-web-treatment-and-section-briefs/qa.md`: Conformance (verified), Open questions and answers, Not verified (`design.md` section 13).

- [ ] **Step 1: Record the change**

Edit the changelog and `SKILL.md`; `wc -c skill/SKILL.md`. Expected: below 5120. Add the manifest lines for any new test file not yet listed. Run `openspec validate align-workflow-lifecycle --strict`. Expected: valid.

- [ ] **Step 2: Run QA on a quiet tree**

Run `node scripts/qa.cjs` directly. Expected: exit 0, and it runs the eight new test files. On failure, hand the failing file back to its owner, wait, rerun.

- [ ] **Step 3: Smoke the CLI**

In temporary folders outside the repository (`--root <dir> --project-root <dir>`): (a) `ui` standard: `next` and `decide` walk `intake, reference, concepts, work, probe, review, deliver` in order; (b) `ui` quick: `work` then `probe`; `done` only after a passed `interaction` record; (c) an early `decide --stage review` at any deliverable is refused with `OUT_OF_TURN` and `state.json` is unchanged; (d) change the draft after acceptance: `next` reopens `check` and `review`; (e) `done` for film quick shows `acceptance: "not asked"` and for standard `"accepted"`; (f) film, edit and web at `standard` and `full`: only the first make action at `full` carries `openspec: "required"`. Record the output.

- [ ] **Step 4: Write `qa.md` and tick the tasks**

Record exit codes and smoke output actually observed. State what was not verified: files a page loads, pages over `http`, a real browser, `ffmpeg` render cases if it was missing, who calls `decide`, whether anyone outside the repository reads `state.json`, whether an OpenSpec change helps a film or an edit, and that the guide wording was read, not tested. Expected: `openspec validate align-workflow-lifecycle --strict` still valid after the last edit.

- [ ] **Step 5: Hand off**

Report the qa exit code, the smoke output and the open questions (Q1 to Q13) with their defaults.

**Acceptance:** see the whole-plan Acceptance below.

---

## Acceptance

- `openspec validate align-workflow-lifecycle --strict` reports valid.
- `node scripts/qa.cjs`, run directly, exits 0 and runs the eight new files: `workflow-freshness`, `workflow-decide`, `workflow-modes`, `workflow-gates`, `workflow-review`, `workflow-evidence`, `workflow-tiers`, `workflow-lifecycle`.
- The smoke of Task S10 shows film, edit, web and `ui` through `next` and `decide`, with these exact checks:
  - `ui` standard walks `intake, reference, concepts, work, probe, review, deliver`.
  - `ui` quick stops at a passed `interaction` record (no `deliver` stage).
  - An early `decide` is refused (`OUT_OF_TURN`) and the state is unchanged.
  - A changed draft reopens `check` and `review`.
  - `done` shows `acceptance` (`not asked` at quick, `accepted` at standard).
- `git status` shows changes only in the files owned by Tasks S0 and S2 to S10, S1's own files (another change), this plan, the spec document and the OpenSpec change folder (plus the manifest lines the integrator adds).

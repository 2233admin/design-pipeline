# Design

This change makes the existing `interaction` check of the web `probe` stage also look at the page's
first screen at three sizes. The command stays `verify interaction`, the record stays one key
(`interaction` in `state.gates`), the result keeps its schema id, and `probe` still reads one record. It
adds no stage, gate, record key, schema id or CLI option. Section 0 settles first how this fits the
repository rule in `AGENTS.md`, because the first draft of this change broke that rule.

Terms: the **probe file** is `interaction.json` in the project root; the **result** is
`evidence/interaction.json`; a **gate record** is the `{ status, at }` entry of a gate in
`.design-pipeline/state.json`; the **capture script** (the code calls it a kernel) is the small file a
command starts to drive the browser; the **first-screen check** is the composition gate run on the first
screen at three sizes; the **probes** are the moves listed in the probe file.

Facts below were read from the repository or run on this machine on 2026-09-30. They name the file and
function, because line numbers move while other changes are being edited. Commands and output are in
Appendix B. Runs used `puppeteer-core` 25.11.0 (a copy outside the repository, passed with
`--puppeteer-module`) and the `chrome-headless-shell` 152.0.7977.30 that HyperFrames keeps in its cache.
The whole change was tried on a throwaway copy of `skill/scripts` outside the repository (the
prototype, Appendix B); nothing in the repository was changed.

## 0. One gate: how this fits the repository rule (settled first)

### 0.1 The rule, and the first draft

`AGENTS.md`: "Extend existing v1 gates, contracts and receipt schemas; never add a parallel gate, receipt
schema, target resolver or policy digest." The first draft of this change recorded a second key,
`composition`, next to `interaction` in `state.gates`, with its own input list. That is a parallel gate.
It is withdrawn.

The question that led here was whether the existing `interaction` gate could carry the three-size
composition results and their file hashes, so that changing `index.html`, a screenshot or the elements
file makes `probe` stale through the gate's own rule. The answer has three parts:

- **Hashes cannot be used.** No hash rule exists in the gate path (facts F1 to F3). Adding one means
  changing `recordGate` and `gatePassed`, which film, edit and web all use.
- **Extra fields in `evidence/interaction.json` alone cannot work.** `next` never reads that file (F4).
- **Extending the gate's command and its input list works.** The same command measures both halves, the
  same record key holds the one verdict, and the input list of that one record grows to name the new
  files. Sections 0.3 to 0.8 say exactly how, and Appendix B shows it running.

### 0.2 What the code does (facts)

- **F1. There is no hash rule.** `recordGate` (`workflow-core.cjs`) stores `state.gates[gate] =
  { status, at: Date.now() }`. `gatePassed` (`workflows/shared.cjs`) says a gate counts when its status is
  `passed` and `at + 50 ms` is not before the newest file time (`mtime`) of the files the stage lists. A
  search finds no `sha256` or `createHash` in `workflow-core.cjs` or in any file under `workflows/`.
- **F2. A missing file counts as fresh.** `mtime` returns 0 for a file that does not exist. Run: a record
  for `interaction` with a listed evidence path that was never written came back `true`.
- **F3. The rule is about time, not content.** Run: `index.html` rewritten with new content but its file
  time set back an hour came back `true`; a file time one minute ahead came back `false`.
- **F4. Only three places touch the `interaction` gate, and nothing reads its result.** The handler of
  `verify interaction` (`cli-core.cjs`) writes `evidence/interaction.json` and calls `recordGate`;
  `decide` (`workflow-core.cjs`) removes the record when a review is rejected; the `probe` stage
  (`workflows/web.cjs`) reads the record. No code reads `evidence/interaction.json`; one test checks the
  `schema` field of the result the evaluator builds (`tests/interaction-evaluate.test.cjs`), not the file.
- **F5. The record is an open map**, so a second key would work technically. It would still be a second
  gate (0.1).
- **F6. There is a precedent for one record over several steps.** `film check` runs the storyboard, score,
  timeline, render, audio and composition (picture) checks and the carry check, and records one key,
  `film` (`film-project-core.cjs`, `cli-core.cjs`); `film-edit check` does the same for `edit`, including a
  composition step (`edit-project-core.cjs`). A composition check inside another gate's command is how this
  repository already does it.

### 0.3 The answer: extend the `interaction` gate

| Piece | Before | After |
| --- | --- | --- |
| Handler of `verify interaction` (`cli-core.cjs`, `verifyCommand`, action `interaction`) | validates the probe file, runs the interaction capture, evaluates it, writes `<outDir>/interaction.json`, records `interaction` | the same first steps; then runs the composition capture script once per size on the page the probes just drove, checks each picture, joins both halves into one result, and only then writes the result and records `interaction` once with the joined status |
| Gate record | `state.gates.interaction = { status, at }` | the same key and shape; `passed` now means the probes **and** all three sizes passed |
| Result document | schema `design-pipeline.interaction-result.v1`: `schema`, `id`, `url`, `status`, `probes`, `findings` | the same schema id and fields; `status` is the gate verdict; adds `checks` (which half), `composition` and `next`; `next` also says so when `designer-pipeline next` cannot count the page (it is not a file inside the project, 0.10) |
| Evidence | `evidence/interaction.json` | adds `evidence/composition/<size>/screenshot.png`, `elements.json`, `result.json` for three sizes: nine files |
| `probe` stage (`workflows/web.cjs`) | finished when `gatePassed(state, root, "interaction", ["interaction.json", "index.html"])`, whatever page the probe opens | finished when the probe file names a page file inside the project folder, every file of the list exists and `gatePassed(state, root, "interaction", list)` holds; the list is `interaction.json`, that page file and the nine evidence files, worked out from the probe file by one function of the new core (0.10); the same gate key |
| Composition gate (`composition-core.cjs`) | profiles `ui`, `poster`, `frame` | adds the profile `page` (section 3) |
| Composition capture script (`capture-composition.cjs`) | one picture right after the page loads | accepts `--settle-ms` (section 4); a script option only, not a CLI option |
| New file | none | `skill/scripts/composition-page-core.cjs` (about 110 lines): the sizes, the evidence paths, the three-size check with an injected capture, the merge of the two halves, and which page file the probe names (one function used by the command's notice and by `next`). It records nothing and reads no workflow state. |
| Not edited | | `recordGate`, `decide`, `workflow-core.cjs`, `workflows/shared.cjs`, `interaction-core.cjs`, `interaction-capture-core.cjs`, `capture-interaction.cjs`, `verify composition`, `composition capture`, `KNOWN_OPTIONS`, `BOOLEAN_OPTIONS` |

The prototype changed four shipped files by +57 and -11 lines in all, and added the 108-line core
(Appendix B, row 27). The final diff is larger: the `probe` `why` and the other texts, the guides and
the tests are not in the prototype.

### 0.4 One record, one list, and what the record means

- **The record.** `state.gates.interaction.status` is `passed` only when every probe passed and every
  size passed its check. It is `failed` when either half failed. The shape is the old one, `{ status, at }`.
- **The list.** `probe` builds one list from the probe file: `interaction.json`, the page file that its
  `url` names, and the nine evidence files (0.10). One function of the core works it out; `web.cjs` passes
  the list to `gatePassed` for the one gate `interaction`.
- **Why one list is enough.** Two lists would be needed only if evidence were written after the record.
  Here one command writes all the evidence **before** it records, so the record is never older than its
  files (run: Appendix B, row 21: the command's own output finishes `probe`).
- **The existence guard.** `probe.finished` also requires every file of the list to exist, because
  the time rule alone treats a missing file as fresh (F2). `film.cjs` already pairs an existence check with
  `gatePassed` for its storyboard.
- **The same rule at every tier.** One command writes one record, so quick, standard and full read it the
  same way. The quick tier has no exemption (risk and alternative: Q3).
- **Upgrade.** A record written before this change says `passed` for the probes only, and no evidence
  exists. The existence guard reopens `probe`, and `next` names the one command it always named:
  `designer-pipeline verify interaction --probe interaction.json`. Nothing else needs to be told to the
  user (run: Appendix B, row 21).

### 0.5 Why this is not a new gate

1. **Same command.** `verify interaction`, with the same flags and the same exit codes (0 passed, 2 gate
   failed, 1 contract or usage error or a measurement that never happened).
2. **Same record.** The key `interaction`, the shape `{ status, at }`, written by the same `recordGate`
   call. `state.gates` gains no key (a test checks it).
3. **Same result contract.** The schema id `design-pipeline.interaction-result.v1` and every old field
   stay. The new fields are additive, and no code reads the result (F4).
4. **Same stage mechanism.** One gate key passed to `gatePassed` with one list of files, in the stage that
   already owned it.
5. **Same pattern as `film check`** (F6): one gate command owning several steps, with one record.
6. **Nothing the rule forbids is added**: no new gate id, receipt, schema id, target resolver, policy
   digest, CLI verb or CLI flag. `composition-page-core.cjs` is an implementation file for the handler and
   the web stage, as `film-project-core.cjs` is for `film check`.

### 0.6 The three-way failure split and the help line

`tests/interaction-cli.test.cjs` pins the split. Each pinned behaviour stays true:

| Pinned behaviour | Still true because |
| --- | --- |
| A malformed probe file is a contract error: exit 1, message starts `interaction probe:`, no evidence folder | the probe file is validated before any capture, as now |
| `--probe-file` is refused as `UNKNOWN_OPTION`; a missing probe file says `--probe does not exist` | no option is added or removed |
| A capture that cannot run is exit 1 (never 2), code `KERNEL_FAILED`, the message names puppeteer, no `evidence/interaction.json` and no `.design-pipeline` exist | the interaction capture runs first and fails there, before anything is written |
| `--output` outside `--root` is refused before any capture | `outDir` is resolved before any capture starts, as now |
| The help line contains `verify interaction --probe <interaction.json> [--output <evidence-dir>] [--chrome <exe>] [--puppeteer-module <path>]` | the line keeps that text and gets a short note appended (same pattern as the `film check` and `next` lines) |

The split, extended:

1. **A usage or contract error** (exit 1, before any browser): unchanged.
2. **A measurement that never happened** (exit 1, nothing recorded, no result written): now also a first-
   screen capture that fails at any size. The message names the half and the size, for example
   `verify interaction: first-screen capture at 768x1024 failed: <reason>`, and keeps the error code of the
   failed capture script. Pictures of sizes that finished may stay on disk; they are newer than any old
   record, so an old pass stops counting (section 0.8).
3. **A measurement that happened and failed** (exit 2): the result and all nine evidence files are
   written and the record is `failed`. The result says which half failed (0.7).

On the prototype copy the five tests of `tests/interaction-cli.test.cjs` and the 21 of
`tests/interaction-evaluate.test.cjs` pass unchanged, as do the seven of `tests/composition-gate.test.cjs`
(Appendix B, row 19).

### 0.7 How a failure says which half failed

The result adds `checks`, `composition` and `next`:

```json
{
  "schema": "design-pipeline.interaction-result.v1",
  "id": "gate-proto", "url": "index.html",
  "status": "failed",
  "probes": [ ... ], "findings": [ ... ],
  "checks": { "interaction": "passed", "composition": "failed" },
  "composition": {
    "profile": "page", "status": "failed",
    "viewports": [ { "name": "768x1024", "width": 768, "height": 1024, "status": "failed", "errors": 2, "warnings": 0,
                     "files": { "screenshot": "evidence/composition/768x1024/screenshot.png", "elements": "...", "result": "..." } }, ... ],
    "findings": [ { "viewport": "768x1024", "code": "blank-frame", "severity": "error", "message": "...", "fix": "..." } ],
    "creativeAcceptance": "not-assessed"
  },
  "next": "The first-screen check failed at 768x1024: apply the fix of each error in `composition.findings`. Then run `designer-pipeline verify interaction --probe interaction.json` again."
}
```

- `status` is the gate verdict. `checks.interaction` is what the probes alone said (what `status` meant
  before); `checks.composition` is the first-screen check. `findings` stays the list of probe findings.
- `next` names the failed half and, for the first-screen check, every failed size; when both fail it has
  both sentences; when both pass it says so. When the page is not a file inside the project folder (an
  http(s) address, or a link that leads outside the folder), it ends with one more plain sentence: the
  page is not a file inside the project, so `designer-pipeline next` cannot count it as finished whatever
  the verdict says, and what to change (0.10). Tests check `checks`, `status`, that `next` contains the
  failed sizes, and that the added sentence is there or not there; not the rest of the wording.
- The CLI prints the same document in its usual envelope (`schema` becomes `design-pipeline.cli-result.v1`
  on the screen only, as it does today); the file on disk keeps the interaction schema id.
- Every finding still carries its own `fix`.

### 0.8 How each change makes `probe` stale

| What happens | What `probe` does | Why |
| --- | --- | --- |
| the page file that `url` names is edited (`index.html` when `url` is `index.html`) | reopens; `next` names `verify interaction` | it is in the list and newer than the record |
| `index.html` is edited while `url` names another page | nothing | it is not in the list (0.10) |
| `interaction.json` is edited | reopens | it is in the list |
| one of the nine evidence files is replaced or captured again by hand | reopens | same |
| one of the listed files is deleted | reopens | the existence guard (the time rule alone calls it fresh) |
| `url` is an http(s) address | never finished; `next` says that the workflow judges only a page file inside the project, and to point `url` at it; the command's own result says the same | an address cannot be bound to a record (0.10) |
| `url` leads outside the folder, or the probe file is missing or not valid | not finished; `next` says what to change (for a link leading out, the command's result says so too) | 0.10 |
| the command ran and a half failed | stays open | the record is `failed` |
| the command never ran | open | no record |
| a record from before this change (probes only), no evidence | open; the same one command | the existence guard |
| the command could not measure (exit 1) after an earlier pass | stays open if it wrote any picture | a picture of the failed run is newer than the old record (run: Appendix B, row 24); if it wrote none, nothing changed and the old verdict still stands for unchanged files |
| a review is rejected | reopens; the re-run checks both halves again | `decide` already removes the `interaction` record and is not edited |

**The scenario that must hold.** `next` must not advance after a probe pass when the first-screen evidence
is missing or older than the page the probes drove (`index.html` by default). It returns stage `probe` with
the `verify interaction` command, never `review` (spec scenarios "First-screen evidence is missing" and
"The page is edited after the check").

**What the rule cannot see.**

- An edit made within 50 ms after the record (the existing `CLOCK_SKEW_MS`), or finer than the file
  system's time step, goes unseen (Appendix B, row 21: an edit 20 ms after the command returned was not
  seen, one 140 ms after was). This is the same as for every gate.
- A file replaced by an older copy that keeps its old file time (for example `cp -p`). Hash binding would
  catch it; see Q1.
- A file the page loads (a stylesheet or script file) being edited while the page file is not. The probes
  have the same gap today. See Q10.
- An edit to the page file made while the command is running. The record is taken at the end, so an edit
  during the 7 to 14 seconds of a run has an older file time than the record. The probes have the same
  gap.
- For an http(s) page the first-screen capture looks for `puppeteer-core` from the folder given by
  `--root`, while the probes also look in the probe file's folder. When the two differ and
  `--puppeteer-module` is not given, the probes can pass and the first-screen capture can then fail with
  exit 1 (a measurement that never happened). Pass `--puppeteer-module` in that case. For a `file:` page
  both look from the page's folder.

### 0.9 Hand-off for hashes

The draft change `align-workflow-lifecycle` (read in part on 2026-09-30: sections 3.2 and 5.2, S1, S2 and
S5) plans to fingerprint the input lists of the verify stages in a later step and to drop the existence
guard then. With this design it has one gate and one list for web, worked out from the probe file by one
function of `composition-page-core.cjs` that `web.cjs` calls (section 0.10); its own section 5.2 already
names "the page file (the probe's relative `url`)".
The evidence files are written before the record, which is what that change needs
to fingerprint them "right after the write". Its S5 also plans `recordGate` to report `recorded`; this
change leaves that to it (Q16).

Its slice S0 (planned, landing before this change) makes `gatePassed` return false when a listed input
file is missing or a list entry is empty (null, undefined or an empty path; a file with no bytes is not
treated as missing), and adds `tests/workflow-freshness.test.cjs`, whose web helper builds a web project
with `interaction.json` and `index.html`. After this change that helper also needs the nine evidence
files and a real probe document (`url` = `index.html`) instead of `{}`, because `next` now reads the probe
file; Task 3 does that when the file exists. Once S0 has landed, the existence check in `probe.finished`
is redundant. It stays so that this change is correct whichever of the two lands first (Q14); the owner of
S0 may remove it then.

### 0.10 Which page the record is bound to

**The problem.** The probe's `url` is either an http(s) address (a running dev server) or a path, relative
to the probe file, to any file (`validateUrl` in `interaction-core.cjs`; `resolvePageUrl` in
`interaction-capture-core.cjs`). The stage names `index.html` whatever the `url` is. Run on the
repository's own code (Appendix B, row 28):

| The probe's `url` | What `next` does today |
| --- | --- |
| `pages/demo/index.html`, record passed | finished; the **captured page** edited afterwards: **still finished** (old screenshots stay current); the unrelated root `index.html` edited: reopens |
| an http address, record passed | finished; nothing on disk is bound to the record |
| no probe file, record passed | finished |

So the weakness exists today for the interaction gate alone. This change **fixes it for the `next`
workflow**, it does not only document it: the new evidence shares the list, and would inherit the same
wrong binding if the list stayed fixed on `index.html`.

**The rule, stated once.** The workflow judges the page file the probe names, inside the project. A page
at a web address, or anywhere else outside the project, can only be judged by running the check yourself.
The limit that follows: changes to remote content are invisible to `next`. It cannot see them and does
not try to. The web workflow therefore supports project-contained files only; it does not claim remote
support.

**Options.** (a) Bind the file the probe names, and do not finish for anything that is not such a file.
(b) Record the captured target (the resolved file, or the origin with a snapshot of what was served) in
the one record or result.

**Chosen: (a).**

- One function of `composition-page-core.cjs` does the work for both callers. `boundPage(projectDir, url)`
  says what `url` names, the way the capture reads it: an http(s) address stays an address; anything else
  is resolved against the folder of the probe file, which is the project folder. `probeBinding(projectDir)`
  reads `interaction.json` with the validator the command uses (`validateProbeFile`), calls `boundPage`, and
  for a file also returns the list.
- What `url` names is one of: a **file**, meaning a regular file inside the project folder (compared by
  real path, so a folder link that leads out does not count as inside); **elsewhere**, meaning an http(s)
  address, or something that is not a regular file inside the folder (a link leading out, a folder);
  **absent** (no such file); or **invalid** (the probe file is unreadable or not valid; that includes a
  `url` that climbs out of the folder or is an absolute path, which the validator refuses).
- `probe` finishes only for a file. The list is `interaction.json`, that file and the nine evidence
  files, and all must exist. `index.html` is in the list only when `url` names it.
- For elsewhere and invalid, the `next` action says the rule above and what to change (texts in section
  5). For an absent file it runs the same command, which prints its own clear error ("page not found").
- The command stays usable on its own for an address or any page: it runs, takes the pictures (through
  `--url` for an address) and gives its verdict, with the same exit codes, schema id and fields. When the
  page is elsewhere, the last sentence of its `next` field says plainly that `designer-pipeline next`
  cannot count the page as finished, whatever the verdict says, and to point `url` at the local page file
  (Appendix B, row 34). The command and `next` use the same function, so they cannot disagree about which
  pages count.
- This is not a second target resolver in the sense of `AGENTS.md`: that word names
  `component-first/adapters/target-resolver.cjs`, the target a component-first receipt is tied to, and
  this change adds no receipt, digest or identity. `boundPage` does repeat the two rules of the capture's
  own `resolvePageUrl` (an address starting with `http://` or `https://` is an address; any other value is
  a path counted from the probe file's folder), which is not exported. One command test pins that the file
  the capture opened is the file `boundPage` names (Q17).

**What it costs.**

- A probe of an http(s) address never finishes in `next`. A project that can only be checked through a dev
  server stops at `probe` until `url` points at a page file in the folder; meanwhile the command and `next`
  both say so. Today `next` lets it through with nothing bound (Q11).
- `probe` reads and validates the probe file on every `next` (a small file).
- Editing `index.html` no longer reopens `probe` when `url` names another page.
- The four existing tests that record the gate need a real probe document (`url: "index.html"`) instead of
  `{}`. With `{}` exactly those four fail; with the document and the nine files all 25 pass (Appendix B,
  row 30). The planned test helper of the lifecycle change's S0 needs the same.
- The `build` stage is not changed and still finishes when `index.html` exists in the project folder. A
  project whose only page is in a subfolder therefore stays at `build` until a root `index.html` exists,
  today and after this change (Appendix B, row 31). Whether `build` should follow the probe's `url` too is
  a separate, older rule that this change leaves alone.

**Why not (b).** `recordGate` stores `{ status, at }` and is shared by film, edit and web; extending it is a
shared change this change does not make. Putting the target in the result would make `next` read and trust
a file that nothing reads today (F4): a second source of truth. A snapshot of what was served means hashing
every response the page loads and fetching them again on every `next`, which needs the server to be
running at that time. So (b) would still not judge an http page, and costs more.

**Still unseen.** Files the page loads (stylesheets, scripts, images), for file pages and any other (Q10);
a file replaced by an older copy that keeps its file time; an edit within 50 ms of the record; every
change to remote content. A `url` that names a folder is treated as elsewhere by `next`; the command
itself stops on the folder listing ("no element matches", exit 1, nothing recorded), so `probe` stays
open (Appendix B, row 32).

## 1. Where the check lives

- `probe` stays the one verify stage of `web`. Stage ids, order, counts (`remaining`, the `n/m` in
  `line`) and guide anchors do not change, so no `next` consumer changes.
- **Finished**: the probe file is a valid probe file whose `url` names a page file inside the project
  folder (0.10), every file of the list exists, and the `interaction` gate passed and is current over the
  list: `interaction.json`, that page file and the nine evidence files. Every tier.
- **Next action**: if `interaction.json` is missing, the existing text that asks for it. If its `url` is an
  http(s) address or anything else that is not a file inside the project folder, or the file is not valid,
  a text that says the rule of 0.10 and what to change (section 5). Otherwise
  `designer-pipeline verify interaction --probe interaction.json`, the command string `next` already used
  (so the two quick-tier tests and the tool list's `web:probe` stage for that command stay true). Its `why`
  now says that the first screen is checked at each of the three sizes, what fails (a blank or washed-out
  picture, unreadable text anywhere on the page), what only warns, and that any edit to the page file
  means running it again.
- `decide --stage review --verdict reject` still removes the `interaction` record, so `probe` still
  reopens after a rejection. `recordGate` and `decide` are not edited.

## 2. The handler in order

`verify interaction --probe <file> [--output <dir>] [--chrome <exe>] [--puppeteer-module <path>]`. No
option is added.

| Step | What happens |
| --- | --- |
| 1 Validate | the probe file is read and validated; `outDir` is resolved (`--output`, or `evidence` next to the probe file). Unchanged. |
| 2 Probes | the interaction capture script runs and its recording is evaluated. Unchanged. A missing tool stops here with exit 1 and nothing written. |
| 3 First screen | for each size in order (375x812, 768x1024, 1440x900) the composition capture script runs once, on the page the probes just drove: `--composition <path>` for a `file:` page, `--url` for an http(s) page; with `--width`, `--height`, `--settle-ms 4000`, and the same `--chrome` and `--puppeteer-module` the probes got. Pictures go to `evidence/composition/<size>/` next to the probe file. All three are captured before any is checked. |
| 4 Check | the existing composition gate runs on each picture and its elements with the `page` profile; `result.json` is written per size (the unchanged `design-pipeline.composition-check.v1` document). A picture that cannot be read, or an elements file that is not valid, is a contract error (exit 1) and nothing is written or recorded after it. |
| 5 Join | the two halves become one result (0.7). If the page is not a file inside the project folder (`boundPage`, 0.10), one plain sentence is added to `next`: `designer-pipeline next` cannot count this page as finished. |
| 6 Write | `<outDir>/interaction.json` is written. Only now; a measurement that never happened leaves no result. |
| 7 Record | `recordGate(<probe folder>, "interaction", result.status)`. |
| 8 Exit | 0 passed, 2 failed. A capture failure in step 3 is exit 1 and stops the steps after it. |

- **Why inside the same command.** One run then produces one record; two commands cannot make one record,
  so `next` could not know both were done. `film check` and `film-edit check` do the same.
- **Why the first screen is checked after the probes, and even when a probe failed.** The missing-tool
  stop stays first, so nothing is written when there is no browser. Running both halves every time shows
  every finding in one run, at a cost of seconds (Q8).
- **The page.** The pictures show the page at the probe's `url` (an http(s) address or a file next to
  the probe file), the same page the probes drove; `next` binds the same page when it is a file in the
  project folder, and says so in the result when it is not (0.10). The probe's `viewport` (default
  1280x800) is for the probes only.
- **The evidence folder.** It is always `evidence/composition/` next to the probe file, because `next`
  looks there. `--output` moves only the result document, as today (run: Appendix B, row 26; Q9).
- **Injected capture.** `checkPageComposition(projectDir, { capture })` takes the capture as a function
  (the handler builds it from `runKernel`), as `checkFilmProject` does, so tests run without a browser.
- **Cost.** About 7 to 14 seconds on the four pages tried (Appendix B, row 22): the probes plus about
  1.4 seconds per size, and up to 4 seconds more per size when the page keeps changing.

## 3. Sizes, the first screen, and the `page` profile

**Sizes.** 375x812 (a phone), 768x1024 (a tablet held upright), 1440x900 (a laptop). They are the three
that `web-direction.md` and the web review text already name. `qa-checklist.md` also lists 1920x1080; it
is left out (Q6).

**First screen for the picture, the whole page for the text checks.** Each picture is the first screen at
scroll position 0, as the capture script takes it today. There is no full-page picture: the picture
checks (`dead-band`, `off-balance`, `clutter`, `no-focal-point`) are tuned for one screen and stop
meaning anything on a picture ten screens tall, and full-page capture belongs to a later change (Q12).
The text checks read the boxes of every visible text item, so low-contrast text further down the page, or
in a closed menu that is moved off screen (not `display: none`, `visibility: hidden` or fully
transparent, which the capture leaves out), fails the check although the picture does not show it. That is
a real fault, not a false alarm (Q15).

**The `page` profile.** Same limits as `ui` for pictures and text contrast. It differs only in how text
position is judged:

| Case | `ui` today | `page` |
| --- | --- | --- |
| Text fully below the screen, or running past the bottom edge | error `text-off-canvas` | not reported |
| Text fully outside the screen on the left, right or top (a closed menu, a carousel card) | error | not reported |
| Text partly on screen and cut at the left, right or top edge | error | warning `text-off-canvas`; `--allow text-off-canvas` waives it (in the picture mode of `verify composition`) |
| Blank or washed-out picture (`blank-frame`, `low-contrast`) | error | error |
| Text contrast (`text-contrast`), read for every visible text item on the page | error | error |
| Every other warning | unchanged | unchanged |

What the evidence shows: a normal scrolling page, which today fails at every size, passes; pages with
menus, carousels and tickers no longer fail on text that is outside the screen by design. The rule is a
change to one condition in `composition-core.cjs` and one entry in `PROFILES`. The profile is also
available to `verify composition --image ... --profile page` with no other change (Appendix B, row 26).

Why a warning, not an error, for text cut at an edge: carousels that peek, tickers and type that bleeds
off the screen on purpose are common on motion-first pages, nothing can waive an error, and a blocking
error with false alarms stops `next` for good. A warning is a prompt for the reviewer. The other rule
(keep it an error when the text is partly on screen) is Q4.

Results of the `page` rule on the captured pages (throwaway copy of the gate):

| Page | `ui` | `page` |
| --- | --- | --- |
| Normal 3-section page, at 375x812, 768x1024 and 1440x900 | failed, 4 errors each | passed, no findings |
| Closed menu, carousel, padded paragraph, nowrap heading, at 375x812 | failed, 6 errors | passed, 1 warning (the peeking carousel card) |
| Page with a moving ticker, at 375x812 | failed, 1 error | passed, 1 warning (the ticker) |
| Gray text on light gray, at 375x812 | failed | failed: `low-contrast`, `text-contrast` twice |
| Nearly empty page, at 375x812 | failed | failed: `blank-frame`, `low-contrast` |
| Overlapping headings, a clipped headline and a nowrap heading wider than the screen, at 375x812 | passed | **passed** (warnings `off-balance`, `dead-band`, `flat-hierarchy` only) |

**What the check does not catch.** The last row is the limit to state plainly: text that overlaps, text
clipped by its box, and text running out of its box are not found, because the gate measures element
boxes and pixels, not where the letters are. Sideways scrolling is not measured either, and below the
first screen only text contrast, near-miss alignment and type sizes are read. The check catches a blank
or washed-out first screen and unreadable text; it does not prove a page is responsive.

**A small lone component fails `blank-frame`.** The rule is "under 0.5 percent of the picture differs from
the background". A centered square on an otherwise empty dark page needs about 40 px (375x812), 60 px
(768x1024) and 74 px (1440x900) per side to pass (Appendix B, row 25), and an 8 px card on an empty page
failed at all three sizes with a real browser (row 22). This matters most for the quick tier, where a page
can be one small component (Q3).

## 4. The settle step

A page that animates on load is captured half-way, because the capture script waits only for the network
to be quiet. A test page with a 1.6 s entrance animation and two timed reveals gave a false
`low-contrast` error: 2 of its 4 text items were visible and the picture was 0.53 percent ink. In a
throwaway copy of the script that takes a picture every 250 ms until two in a row are identical (at most
4000 ms), the same page stopped changing after 2250 ms and passed with all 4 items (4.49 percent ink). A
page that never stops moving (a ticker) waits the whole 4000 ms and is captured as it is; the capture took
5.7 s.

So the capture script gets one option, `--settle-ms <n>` (an integer from 1 to 10000): take a picture,
then take another every 250 ms until two in a row are identical, at most `ceil(n / 250)` more times, and
keep the last picture. The time spent taking a picture is extra, so a page that never stops moving can
take longer than `n` (5.7 s for a 4 s limit above). Without the option exactly one picture is taken and
nothing changes, so film use is unchanged. No CLI option lets a user set it: `composition capture` never
passes it, and only `verify interaction` passes it to the script, fixed at 4000. So `KNOWN_OPTIONS` does
not change. The script takes the picture as a buffer and writes the file itself. The elements are read
right after the last picture, as today.

The limit and the step are from three synthetic pages. They are a starting point, not a measurement of
real pages (Q7).

## 5. Evidence for the reviewer, and the `next` words

The reviewer gets the result document and nine files, per size under `evidence/composition/<size>/`:

| File | What it is | Who reads it |
| --- | --- | --- |
| `evidence/interaction.json` | the whole story: `checks`, the probe findings, the first-screen summary, `next` | the reviewer first |
| `screenshot.png` | the first screen, as measured | the reviewer (W1 and the first-screen part of W2, W4); named in the review `show` text |
| `elements.json` | the text and blocks the gate read | anyone checking a finding |
| `result.json` | the gate's answer for that size: errors, warnings, each with a fix | the reviewer, for the warnings behind W1 to W7 |

The gate status is a Component Conformance result. The pictures and warnings are what a reviewer reads
for Visual Acceptance, which agents never record. The first-screen pictures cannot show sections further
down; the reviewer still scrolls the live page (W2, W4 and W5 say so).

Texts that change (plain words; no film words):

| Text | Change |
| --- | --- |
| `probe` action when `interaction.json` exists and its `url` names a page file | the command string is unchanged; its `why` says that the first screen is checked at each size, what fails (blank or washed-out picture, unreadable text anywhere on the page), what only warns, that a page with almost nothing on it (for example one small component) fails as blank and should be shown at real size with its page around it, and that any edit to the page file means running it again |
| `probe` action when the page is elsewhere (0.10): an http(s) address, a link leading outside the folder, a folder | says that the probe points at `<url>`, which is not a file inside this project; states the rule once (the workflow judges the page file the probe names, inside the project; a page at a web address, or anywhere else outside the project, can only be judged by running the check yourself); and says to change `url` to the page file (for example `"index.html"`) and run the command again |
| `probe` action when the probe file is not valid (0.10) | says so, with the validator's reason (this includes a `url` that climbs out of the folder or is an absolute path), and to fix it and run the command again |
| `next` field of the `verify interaction` result when the page is elsewhere (0.10) | one added sentence at the end: the page is not a file inside the project, so `designer-pipeline next` cannot count it as finished, whatever the verdict says; to finish, point `url` at the local page file; a page that is not such a file can only be judged by running the check yourself. When both checks passed, the usual "Run `designer-pipeline next`" is replaced by this sentence |
| `build` action at standard and full | one added clause: the first screen has to work at 375x812, 768x1024 and 1440x900, and `probe` checks it; the quick text is unchanged |
| `review` `show` list | the second item names `evidence/composition/<size>/screenshot.png` and the warnings in `result.json` |
| `verify interaction` help line | the original text, then a note: drives the probes, then checks the page's first screen at the three sizes; both must pass; the pictures go to `evidence/composition/` next to the probe file |
| `workflow-web.md` `## probe` | one command, two checks, the nine files, what fails and warns, what is not seen, and the rule of 0.10 stated once |
| `composition-gate.md` | a "Web pages" section: the `page` profile, how the web probe uses it, the files, what is not seen |
| `web-direction.md` | the evidence sentence and the W1 evidence cell point at the files and say "first screen only" |
| `qa-checklist.md` | one line under Browser / Visual Checks pointing at the files |

## 6. Tests

No new test file: `scripts/test-manifest.json` does not change. Each test goes into the suite that
already covers its code. Nothing tests wording; tests use behaviour, the literal command, the paths, and
`checks`. One new fixture file is added under `tests/fixtures/` (not a test file).

Without a browser:

- `tests/composition-gate.test.cjs`:
  - the `page` rules on fixture elements and PNGs made with `encodePng`: text below or past the bottom
    edge; fully outside on each side; partly on screen and cut; waived with `allow` at the function
    level; contrast stays an error, also for text below the screen; blank stays an error. That `ui`,
    `poster` and `frame` are unchanged is shown by the existing tests in the file, which must still pass.
    The known-bad pages table is evidence, not a test: its last row would pin a blind spot.
  - `checkPageComposition` with an injected `capture` that writes fixture pictures: three good sizes pass
    and write nine files; one bad size fails while the others are still written; a capture that leaves no
    picture throws and leaves no `result.json`; the core does not create the evidence folder itself.
  - `mergeGateResult`: both pass; only the probes fail; only a size fails (and `next` names that size);
    both fail; every interaction field is kept and the inputs are not changed.
  - `boundPage` and `probeBinding` on temporary folders: a file at the root, in a subfolder, reached
    through `pages/../index.html` and through a folder link that stays inside the project give a file with
    its list; a folder link leading outside, a folder, the project folder itself, `http://...` and
    `HTTPS://...` give elsewhere; a missing file gives absent; a probe file that is missing, malformed or
    has a `url` that climbs out gives invalid with the validator's reason; the list is exactly the probe
    file, the page file and the nine evidence paths. Link cases use a directory junction or symlink and are
    skipped where neither can be made.
  - `mergeGateResult` with `page`: a file adds nothing to `next`; elsewhere adds the sentence, after the
    failure sentences when a half failed, and in place of "Run `designer-pipeline next`" when both passed;
    `status`, `checks` and every other field are identical with and without it.
  - the capture script refuses `--settle-ms abc` and `--settle-ms 99999` with exit 1 before any browser.
  - `verify composition --image <png> --elements <json> --profile page` (spawned, as the file's other CLI
    test does) on the elements of a tall page reports no `text-off-canvas` finding, where `--profile ui`
    on the same files does.
- `tests/interaction-cli.test.cjs` (the five existing tests stay as they are), with a small fake browser
  module passed with `--puppeteer-module` (and `--chrome` set to the node binary). The fake is one file,
  `tests/fixtures/fake-browser.cjs`; both capture scripts run their real code against it. It answers the
  page calls with canned data: the canonical recording of `tests/fixtures/interaction-samples.json` for
  the probes, and a fixture PNG and canned text boxes for the pictures. Its behaviour is set by a JSON
  file named in `FAKE_BROWSER_CONFIG` (the keys are in the plan). The approach was run on the prototype
  (Appendix B, rows 20 and 21). Cases:
  - the gate passes: exit 0, the nine files and the result, the record `interaction` is `passed` with
    exactly the keys `status` and `at`, `state.gates` has no other key, the result on disk has exactly the
    keys `schema`, `id`, `url`, `status`, `probes`, `findings`, `checks`, `composition` and `next`,
    `checks` both `passed`, three sizes in order, and `next` (quick tier) returns `done` on the files the
    command wrote (the ordering proof);
  - one size blank: exit 2, record `failed`, `checks.composition` `failed`, all nine files written, `next`
    names the size, and `next` (quick) stays at `probe`;
  - the probes fail and the pictures are good: exit 2, `checks.interaction` `failed`, the nine files
    still written;
  - both fail: both halves named;
  - a capture that never happens at one size: exit 1, code `KERNEL_FAILED`, the message names the size, no
    result written, no record; after an earlier pass the old record stays but `next` does not return
    `done`, because the failed run wrote pictures;
  - the settle loop: with a picture that changes twice and then stays still, the gate saves the still one
    (the saved `screenshot.png` is byte-equal to the last picture the fake returned for that size, which
    the fake's log shows by a short hash per picture, and differs from the first); `composition capture`,
    which passes no `--settle-ms`, takes exactly one picture;
  - `--output` moves only the result; the pictures stay in `evidence/composition/`;
  - the page the capture opened is the page `next` binds: a probe whose `url` is `pages/demo/index.html` (a
    page in a subfolder, with a root `index.html` too): the fake's log shows `goto` of that file, the
    result's `next` has no added sentence, `next` (quick) returns `done`, editing that page reopens
    `probe`, editing the root `index.html` does not;
  - an http(s) `url`: the command exits 0, takes the pictures through `--url` (the log shows `goto` of the
    address) and records `passed`; the result's `next` ends with the added sentence; `next` does not
    finish: stage `probe`, and its text states the rule. With a failing probe too: exit 2, both the failure
    sentence and the added sentence;
  - a folder link leading outside the project (skipped where none can be made): exit 0, the same added
    sentence, and `next` stage `probe`.
- `tests/workflow-next.test.cjs`: with `touch`, a helper that writes a real probe document (the canonical
  one of `tests/fixtures/interaction-samples.json` with `url` set) and `recordGate`, each row of the
  section 0.8 table, both spec scenarios of the steering question, the same files at every tier, the
  rejection with and without an edit, `done` lists the one gate, the stored record has only `status` and
  `at`, the state schema is unchanged, and the build and review texts. And, for the page the record is
  bound to (0.10): `url` names another local page that then changes (reopens; an unrelated `index.html`
  edit does not); `url` is an http address (never finished; the text states the rule and names `url`);
  `url` climbs out of the folder, and `url` is an absolute path (the validator refuses: the text says the
  probe file is not valid, with the reason); `url` goes through a folder link that leads outside (made
  with a directory junction or a symlink; skipped where neither can be made; the same rule text as for
  an address); `url` names a page in a subfolder (bound; the evidence stays next to the probe file; with
  no root `index.html` the stage stays at `build`, the old rule); the probe file is missing or not valid
  (not finished although a record is `passed` and all files exist). The four existing tests that record the
  `interaction` gate and expect `done` or `review` ("probe asks to write interaction.json when missing...",
  "a passed interaction gate goes stale when index.html changes", "a rejected web draft reopens probe", "web
  review speaks of the page and keeps the shared decision contract") also write the nine files first and
  write a real probe document instead of `{}`; they are updated, not deleted. Run on the prototype,
  exactly those four failed before the update (and fail again with `{}` as the probe file), and all 25
  passed after it (Appendix B, rows 19 and 30).

Needs a real browser (skipped where there is none, the way `tests/interaction-capture.test.cjs` skips): one
test in `tests/interaction-cli.test.cjs` that runs the real command on a tall page whose card follows the
pointer and on an entrance-animation page, and checks exit 0, the nine files and the record; and one in
`tests/composition-gate.test.cjs` that the settle option shows all the text of an entrance-animation page.
Under `node scripts/qa.cjs` the browser is hidden (the run sets `HOME`), so the gated tests run only with
`DESIGN_PIPELINE_PUPPETEER_MODULE` and `PUPPETEER_EXECUTABLE_PATH` both set.

The set of finding codes is not pinned by a permanent test, because that would block a later change that
legitimately adds one. The closing task compares it with a throwaway script and records the result in
`qa.md`.

Only `node scripts/qa.cjs`, run directly, counts as the harness; the closing task runs it once.

## 7. Risks, residuals, landing order and open questions

Risks:

- The warning rule and the settle limit are uncalibrated (sections 3, 4).
- A nearly empty page, or a small lone component, trips `blank-frame`, an error that cannot be waived, and
  stops `next` (section 3). Its `fix` text is worded for film frames ("seek, opacity, data-start"); the web
  guide explains it for pages. The finding text is not changed here (Q3).
- The command needs `puppeteer-core`, as before, and takes seconds longer. The capture message for a
  missing tool still suggests `npm i hyperframes`, as it does today.
- Element boxes miss block text running out of its box (section 3).
- The quick tier now needs the nine files as well (Q3).
- The web workflow supports project-contained files only (0.10). A project that can only be checked
  through a dev server stops at `probe` until `url` names a page file in the folder (Q11); the command's
  own result and `next` both say so in plain words. Changes to remote content are invisible to `next`.
  Editing `index.html` no longer reopens `probe` when `url` names another page.
- One function, `boundPage`, repeats the two rules of the capture's own `resolvePageUrl`. A command test
  pins that they agree (0.10, Q17).

Landing order (other changes are unfinished; this author read their files, not their results):

- `add-capability-registry` (not landed): `verify interaction` is already a public row with the stage
  `web:probe`, and the `next` command string is unchanged, so no row changes. Its help-line check has not
  been run against the appended note; other lines (`film check`, `next`) already end in a note.
- `fix-tool-guidance-errors` edits `composition-gate.md`, the `film check` help line and a comment in
  `web.cjs`. This change edits other parts of the same files, in place, and reverts nothing.
- `add-web-capability-skills` uses `verify composition` by hand as a safety check that counts
  `text-off-canvas` errors inside the window height. This change leaves its files alone; the `page`
  profile now exists for that check if it wants it.
- `align-workflow-lifecycle` (read in part on 2026-09-30: sections 3.2, 5.2, S1, S2 and S5) relies on the
  new check reporting through the existing `recordGate` and `state.gates`, on web keeping one verify
  stage, on the stage naming its input list, and on `recordGate` and `decide` staying as they are. All are
  true. Its text already describes one gate `interaction` and one list; re-read it before landing. Any
  wording that names a constant `PROBE_INPUTS`, or a fixed `index.html`, for web is out of date: this
  change has no such constant, and the list is worked out by `probeBinding` in `composition-page-core.cjs`
  from the probe file (0.10), as its own section 5.2 already says ("the page file (the probe's relative
  `url`)"). Its `ui` probe can import `probeBinding` instead of repeating the rule. Its planned slice S0
  needs two things from this change: a helper in its new test file gains the nine evidence files, and
  writes a real probe document (`url` = `index.html`) instead of `{}` (section 0.9, Task 3).
- The approved 2026-09-29 spec gave "multi-viewport, full-page and contact sheet on `composition capture`"
  to its change 4 (`extend-composition-capture-for-page-review`, not approved). This change does the three
  sizes inside `verify interaction`, without a flag, and adds only the script option `--settle-ms`, so
  change 4 would shrink to full-page and contact sheet. If it later adds a sizes option to
  `composition capture`, that change should reuse the constant `VIEWPORTS` of `composition-page-core.cjs`.
  The user decides whether change 4 shrinks (Q12).

Open questions (defaults first):

| # | Question | Default | Other option |
| --- | --- | --- | --- |
| Q1 | Staleness rule | the time rule every gate uses, plus an existence guard | hash binding, a shared change to `recordGate` and `gatePassed` (a later step, see section 0.9) |
| Q2 | Where the first-screen check lives | inside `verify interaction`: one gate, one record (section 0) | guidance only: drop it from `probe` and keep it as documentation; nothing is checked or recorded |
| Q3 | Tiers | the same rule at every tier (one command, one record) | quick exempt, which needs a new option or a command that reads the tier; small lone components then pass |
| Q4 | Text cut at an edge on `page` | warning | error when partly on screen (no waiver possible; fails pages with peeking carousels and tickers) |
| Q5 | Waivers | none for errors; `--allow` stays on `verify composition` only, because warnings never fail the gate | add `--allow` to `verify interaction` (reporting only) |
| Q6 | Sizes | the three | add 1920x1080 |
| Q7 | Settle | two equal pictures 250 ms apart, at most 4000 ms | a fixed wait, or another limit |
| Q8 | Check the first screen when a probe failed | yes: one run shows every finding | stop at the first failing half |
| Q9 | Evidence folder | fixed `evidence/composition/<size>/` next to the probe file; `--output` moves only the result | put the pictures under `--output` (`next` would not find them) |
| Q10 | Files that reopen the check | the probe file, the page file that `url` names (inside the project folder) and the nine evidence files (0.10) | also every `.html`, `.css` and `.js` file in the project folder (for a page split over files), or also `index.html` whatever `url` names |
| Q11 | A probe `url` that is an http(s) address (a dev server) | the web workflow supports project-contained files only: the command runs, records and says in its result that `designer-pipeline next` cannot count the page; `next` does not finish `probe` and states the rule (option (a), 0.10) | (b) record the captured target and a snapshot of what was served in the one record or result: needs a change to `recordGate` or a reader of the result, and cannot judge an http page; or keep today's behaviour (nothing bound) and only document it. No login handling either way |
| Q12 | Full-page pictures, contact sheet, sideways-scroll check; and whether change 4 of the approved spec shrinks | not in this change; change 4 keeps full-page and contact sheet (a sideways-scroll finding needs a new finding code and its own change) | add them here |
| Q13 | Lifecycle table (Appendix A) | documentation only, in this change and its spec | also ship it in a reference file |
| Q14 | Landing order against the registry and the lifecycle change | whichever is ready first; no tool list row should need to change; the existence check in `probe.finished` stays so that this change is correct without the lifecycle change's S0 | fix an order now |
| Q15 | Text contrast outside the first screen | checked: contrast is read for every visible text item, so low-contrast text below the fold, or in a menu moved off screen, fails (a real fault) | only text on screen (fewer alarms from hidden states, but unreadable text further down passes) |
| Q16 | Say whether the verdict was recorded when the folder has no project state | not in this change: it is how `verify interaction` already behaves, and the lifecycle change plans the field for every gate | add a `recorded` field here |
| Q17 | Where the rule for which file `url` names lives | one function, `boundPage`, in `composition-page-core.cjs`, used by the command's notice, by `next` (through `probeBinding`) and offered to the `ui` probe; it repeats the capture's two rules (an address starting with `http://` or `https://` is an address; any other value is a path counted from the probe file's folder), and a command test pins agreement with what the capture opened | export `resolvePageUrl` from `interaction-capture-core.cjs` (one line) and call it from `boundPage`, so that one rule exists; it edits a file of the interaction gate, which this change otherwise leaves alone |

## 8. Not verified, and what only a person can judge

Not verified:

- The final code: none is written. The prototype (a throwaway copy outside the repository) ran the
  handler, the core (with the page rule), the profile, the script option, the `probe` rule, the command's
  notice and the `next` texts for a page that cannot be bound. It did not run the longer `probe` `why`,
  the build and review texts, the help wording check of the tool list, or anything inside
  `node scripts/qa.cjs`.
- The test fixture `tests/fixtures/fake-browser.cjs` was prototyped outside the repository with paths
  passed in its config; its final form in the repository is untried.
- Real pages beyond four synthetic ones and one page served over http; other browsers, Chrome versions and
  systems (Windows only); a page that never loads; the 60-second limit that `runKernel` puts on each
  capture; `--url` pages behind a login.
- Quick-tier component pages on real projects: only the thresholds of a synthetic square and an 8 px card
  were measured.
- That `add-capability-registry` accepts the appended help note (it has not landed), and the final wording
  of the lifecycle change.
- The `page` rule and the settle limit on any real page.
- The page binding was run for file pages (a subfolder and the root), an http address through the fake
  browser, a directory junction that leads out, and invalid urls, with the command's notice and the
  `next` texts (Appendix B, rows 29 and 34). A page in a subfolder with a stylesheet next to it was also
  run through real Chrome (row 33). It was not run with a real dev server or a real symlink. The final
  wording in the repository is untried.

Only a person can judge: whether the warnings match what a designer would accept; whether three sizes are
the right three; whether 7 to 14 seconds per run is acceptable; whether the quick tier should be exempt;
whether a page with no error is a good page (Visual Acceptance is pending and is never recorded by an
agent).

## Appendix A. Lifecycle mapping (documentation only)

One common lifecycle read onto the real stage names. Nothing is renamed, no stage is added and no router
is added. Read from `workflows/film.cjs`, `edit.cjs`, `web.cjs` and `workflow-core.cjs` (`codeStages`).
Stages are listed as they run at `standard` and `full` unless a tier is named.

| Lifecycle step | film | edit | web | ui |
| --- | --- | --- | --- | --- |
| Intake | `intake` | `intake`, `analyze` (reads the footage and music) | `intake` | `intake` |
| Direction | `reference`, `concepts` | `reference` (replicate mode only), `style` | `reference`, `concepts`; the treatment is written as the first step of `build` | none |
| Make | `plan` (writes `storyboard.json`, checked by `verify film-storyboard`), `build` | `cut`, `render` | `build` | `work` |
| Verify | `check` | `check` | `probe` (the probes and, from this change, the first-screen check, one gate) | inside `work` |
| Review | `review` | `review` | `review` | none |
| Deliver | `deliver` | `deliver` | `deliver` | the end of `work` (`decide --stage deliver`) |

Quick tier: film `plan`, `build`, `check` (with `reference` first in replicate mode); edit `analyze`,
(`reference`), `cut`, `render`, `check`; web `build`, `probe`; ui `work`. The quick tier has no `intake`,
`review` or `deliver` stage for film, edit and web; edit's `analyze` still runs.

This table reads today's code. A draft change, `align-workflow-lifecycle`, sets a target that differs, in
particular for `ui` (it gains reference, concepts, probe, review and deliver stages); that target is in its
own design, sections 3.2 and S2 (read in part on 2026-09-30). Where the two differ, that one is the plan
and this one is the present. The `plan` cell follows that design: `plan` writes `storyboard.json`, the
same kind of work as web's `build` holding the treatment and the briefs.

## Appendix B. Evidence log

All in temporary folders outside the repository, on this machine, 2026-09-30. "Prototype" means a copy of
`skill/scripts`, `skill/adapters`, `skill/references` and four test files made for this work, with the
design applied (`wc-gate-proto`); the repository was not changed.

| # | Command or script | Output, shortened |
| --- | --- | --- |
| 1 | `initState` for a web project, `recordGate(dir, "interaction", "passed")`, print `state.gates` | `{"interaction":{"status":"passed","at":1790753941917}}` |
| 2 | `gatePassed` for `interaction` with inputs `interaction.json`, `index.html` | `true` |
| 3 | the same with a listed file that does not exist | `true` (missing counts as fresh) |
| 4 | `index.html` rewritten with new content, file time set back one hour | `true` (time rule, not content) |
| 5 | `index.html` file time set one minute ahead | `false` |
| 6 | `recordGate(dir, "composition", "passed")`, print keys | works: `[ 'interaction', 'composition' ]`; schema unchanged (a second key would work technically and would still be a second gate) |
| 7 | search `skill` for readers of the `interaction` gate | `cli-core.cjs` writes the result and records; `workflow-core.cjs` removes the record on a rejected review; `workflows/web.cjs` reads it; no code reads `evidence/interaction.json` |
| 8 | `composition capture --width W --height H` on a 3-section page, 3 sizes | 1408, 1354 and 1356 ms; 4.17 s for the loop |
| 9 | `verify composition --profile ui` on that capture, each size | `failed`, exit 2; `text-off-canvas` errors for `h2:8`, `p:9`, `h2:11`, `p:12` at every size |
| 10 | the same with `--allow text-off-canvas,dead-band` | exit 2; 4 errors remain; `allowed`: `dead-band` |
| 11 | capture and `--profile ui` on a page with a closed menu, a carousel, a padded paragraph, a nowrap heading | errors for the 2 menu links, 3 carousel cards, 1 padded paragraph; the nowrap heading (box 327 wide, text far wider) not flagged |
| 12 | capture and check a page with a 1.6 s entrance animation and timers at 1.2 s and 1.5 s | `low-contrast` error, ink 0.0053, items `h1:2`, `b:3` only; 1164 ms |
| 13 | throwaway capture script with a settle loop (250 ms step, 4000 ms limit) on that page | settled after 2250 ms, 3544 ms in all; `passed`, ink 0.0449, 4 items |
| 14 | the same script on a page with an endless ticker, 375x812 | settled after 4000 ms (the limit), 5666 ms in all; `text-off-canvas` error under `ui` |
| 15 | throwaway gate with the `page` profile on the pages of 9, 11, 13, 14 | table in section 3 |
| 16 | `verify composition --image x --profile billboard` | before: `allowed: ui, poster, frame`; prototype: `allowed: ui, poster, frame, page` (the existing test matches `allowed: ui, poster, frame` as part of the text) |
| 17 | three known-bad pages at 375x812 under `page` | gray on gray and nearly empty: failed; overlapping, clipped and overflowing text: passed with warnings |
| 18 | a fake browser module passed with `--puppeteer-module`, `--chrome` set to node, the throwaway settle script, screenshots that change twice then stay | the loop took 4 pictures and stopped after 750 ms; `screenshot.png` decoded as 375x812; `elements.json` written; exit 0 |
| 19 | prototype tree: the four test files on the unpatched copy, then on the patched copy | unpatched: 5/5 `interaction-cli`, 21/21 `interaction-evaluate`, 7/7 `composition-gate`, 25/25 `workflow-next`. Patched: 5/5, 21/21, 7/7 unchanged; `workflow-next` 21/25 with exactly the four tests that record the gate without evidence failing; after they also write the nine files, 25/25 |
| 20 | prototype CLI against the fake browser, seven scenarios | all good: exit 0, record `passed`, 10 files; one size blank: exit 2, `checks` composition failed, record `failed`; probes frozen: exit 2, `checks` interaction failed; both fail: both named; page refuses at 768x1024: exit 1, `KERNEL_FAILED`, message `verify interaction: first-screen capture at 768x1024 failed: net::ERR_CONNECTION_REFUSED ...`, record `{}`, 2 files (size 1) and no result; no state file: exit 0, nothing recorded; picture changing twice: exit 0 after 3.2 s |
| 21 | prototype `next` on evidence that the prototype command wrote (16 rows) | no run: `probe` with `verify interaction`; old probes-only record, no evidence: `probe` with `verify interaction`; the command ran: `review`; `index.html` edited, `interaction.json` edited, any of `screenshot.png`, `elements.json`, `result.json` replaced, one file deleted, a half failed: each `probe` with `verify interaction`; review rejected: `probe`, then after the command `review`; quick tier: `probe`, then `done`; `index.html` edited 20 ms after the command returned: still finished (inside the slack); 140 ms after: `probe` |
| 22 | prototype command in real headless Chrome on four pages | tall page, card follows the pointer: exit 0, 7.4 s, both halves passed (warnings `dead-band`, `off-balance`); same page with a dead card: exit 2, `checks.interaction` failed, 8.5 s; 8 px card on an empty page: exit 2, probes passed, `blank-frame` and `low-contrast` at all three sizes, 7.1 s; entrance animation plus live card: exit 0, 13.8 s |
| 23 | prototype command (first form, before the page binding of 0.10) with the probe `url` a local http server | exit 0, three sizes passed, pictures taken through `--url`; quick-tier `next`: `done`. With the binding of 0.10 `next` stays at `probe` and the result says so (rows 29 and 34) |
| 24 | a good run, then a run whose page refuses at 768x1024, in one folder | second run exit 1; the record is still the first `passed`; `next` returns `probe` with `verify interaction` (the failed run's size-1 pictures are newer) |
| 25 | a centered square on an empty dark picture, smallest side that avoids each error | no `low-contrast`: 18 px (375x812), 30 px (768x1024), 38 px (1440x900); no `blank-frame`: 40, 60 and 74 px |
| 26 | prototype `verify composition --image` with `--profile page` on the captured tall page; `--output my-evidence` on `verify interaction` | the tall page passes under `page` (was 4 errors under `ui`); `--output`: result in `my-evidence/interaction.json`, pictures still in `evidence/composition/`, quick-tier `next`: `done` |
| 27 | diff of the prototype against `skill/scripts` | `cli-core.cjs` +17/-2, `composition-core.cjs` +8/-3, `capture-composition.cjs` +14/-2, `workflows/web.cjs` +18/-4, new `composition-page-core.cjs` 108 lines; no other file differs (the longer `probe` `why`, the build and review texts, guides and tests are not in the prototype) |
| 28 | the repository's own unpatched `next` on quick web projects with a passed record (`run-today.cjs`) | `url` = `pages/demo/index.html`: `done`; the captured page edited afterwards: still `done`; the unrelated root `index.html` edited: `probe`; `url` = an http address: `done`; probe file missing: `done` |
| 29 | prototype, option (a) in its first form (the page rule inside `web.cjs`; shorter `next` texts), eight scenarios through the real `next` and the real command with the fake browser (`run-target.cjs`); row 34 re-runs the cases that changed with the final shape | A page in a subfolder: the capture opened `pages/demo/index.html`, `done`; that page edited: `probe`; the command again: `done`; root `index.html` edited: still `done`. B another root page `demo.html`: `done`, edited: `probe`. C http address: the command exit 0 and record `passed`, the capture opened the address, `next`: `probe`. D `../outside.html`: the command exit 1 (validator); `next` with a hand-written passed record and nine files: `probe`, "not a valid probe file". E a directory junction leading out: the command exit 0, `next`: `probe`. F an absolute path: the command exit 1, `next`: "not a valid probe file". G probe file missing with a passed record: `probe`, "Write interaction.json". H page file missing: the command exit 1 "page not found", `next`: the command |
| 30 | prototype, the 25 tests of `workflow-next.test.cjs` under option (a), first with the four fixtures still writing `{}` as the probe file, then with a real probe document | `{}`: 21 pass and the same four fail; real probe document: 25/25; the other three files unchanged: 5/5, 21/21, 7/7 |
| 31 | prototype, `run-build.cjs`: a quick web project whose only page is `pages/demo/index.html`, with a matching probe file | `next` at `build`; after the command passed, still `build`; once a root `index.html` is added, `done` (the root file is not in the list, so it does not reopen `probe`) |
| 32 | prototype with real Chrome (`run-folder.cjs`): the probe `url` is `pages`, a folder holding an `index.html` | the command exits 1, `KERNEL_FAILED` "no element matches #card on file:///…/pages", nothing recorded; `next`: `probe` with the command |
| 33 | prototype with real Chrome and the real command (`run-subfolder-real.cjs`): the probe `url` is `pages/demo/index.html`; the page loads `demo.css` from its own folder; a root `index.html` also exists | the command exit 0, all three sizes `passed`; the nine files are in `evidence/composition/` next to the probe file and none under `pages/`; `next`: `done`; root `index.html` edited: `done`; `pages/demo/index.html` edited: `probe`; the command again: `done`; `demo.css` edited: `done` (files a page loads are not watched, Q10) |
| 34 | prototype in its final shape (the page rule in `composition-page-core.cjs`, called by the handler and by `web.cjs`), real command and real `next` with the fake browser (`run-notice.cjs`) | page file in the project: exit 0, result `next` "Both checks passed. Run `designer-pipeline next`.", `next`: `done`. http address: exit 0, status `passed`, the result's `next` says that `designer-pipeline next` cannot count the page as finished, whatever the verdict says, and to point `url` at the local page file; `next`: `probe` with the rule text. http address and a frozen probe: exit 2, the failure sentence and then the same added sentence. Folder link leading out: exit 0, the same added sentence; `next`: `probe`. `../outside.html`: exit 1 (validator), `next`: "not a valid probe file". `boundPage` on its own: `index.html`, `pages/demo/index.html`, `pages/../index.html` and a link that stays inside give a file; a link leading out, a folder, `.`, `http://localhost:5173/` and `HTTPS://example.com/x` give elsewhere; `missing.html` and `index.html#hero` give absent. The four test files in the copy (`workflow-next` with its four fixtures updated as in row 30): 25/25, 5/5, 21/21, 7/7 |

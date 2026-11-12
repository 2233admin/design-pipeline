# Tasks

Order: wave 1 (T1, T2, T3, T4 in parallel), then closure (T5). Two dependencies inside wave 1: T1 writes
`composition-page-core.cjs` first, because T2 and T3 import it; and T2 cannot smoke its cases before T1
Steps 1 to 3 (core, `page` profile, `--settle-ms`) exist, while T3 needs only Step 1. Each worker edits
only the files it owns; no file appears under two owners. The executable plan, with steps and acceptance,
is `docs/superpowers/plans/2026-09-30-web-composition-checks.md`. Interfaces are fixed in the plan's
"Fixed interfaces" section and in `design.md`: the gate key `interaction` (no new key), the three sizes,
the list of input files (the probe file, the page file its `url` names, nine evidence files), the exports
of `composition-page-core.cjs`, the `page` profile rules, the handler steps and the new result fields
(`checks`, `composition`, `next`).

Status of this change: draft, awaiting approval. Nothing below the "Done in this slice" list is started.

## Verification protocol

The only sanctioned harness is `node scripts/qa.cjs`, run directly with no pipe or redirect into the
repository (`AGENTS.md`: never bare `node --test`). It has no scoped mode. It compares
`scripts/test-manifest.json` with `tests/*.test.cjs`, checks every file in `required`, runs
`node --check` on the scripts, packages `skill/` twice, and fails unless `git status` is identical at the
end. Workers therefore do not run it; T5 runs it once on a quiet tree after T1 to T4 land, hands failures
back to the owner, reruns, and ticks the boxes of this file.

A worker may check its own change with a throwaway script outside the repository. That is smoke
evidence, not the gate.

No new test file is added, so `scripts/test-manifest.json` does not change. One new fixture file,
`tests/fixtures/fake-browser.cjs`, is not a test file and needs no entry. One new load-bearing file,
`skill/scripts/composition-page-core.cjs`, goes in `required` of `skill/references/package-resources.json`
(owner T5). No CLI option is added, so `KNOWN_OPTIONS` and `BOOLEAN_OPTIONS` do not change.

The browser-gated tests skip where there is no browser. Under `node scripts/qa.cjs` the run sets `HOME`,
which hides the cached Chrome, so T5 also runs the gate once with `DESIGN_PIPELINE_PUPPETEER_MODULE` and
`PUPPETEER_EXECUTABLE_PATH` set, to see those tests run.

## Before starting (T5 reads, nobody edits)

- [ ] Note whether `fix-tool-guidance-errors`, `add-capability-registry` and `add-web-capability-skills`
  are committed. Their uncommitted edits to `cli-core.cjs`, `composition-gate.md`, `web.cjs`,
  `workflow-core.cjs` and `shared.cjs` stay as they are; every owner edits in place and reverts nothing.
- [ ] If `scripts/tool-list.json` exists, T5 runs its check after the change. No row should need to
  change: `verify interaction` is already a public row with the stage `web:probe`.

## Done in this slice

- [x] Read the web workflow, the composition gate and its capture script, the interaction gate and its
  capture script, how `next` records gates, how `film check` bundles steps under one record, and the
  tests that cover them.
- [x] Run the premises on this machine with throwaway scripts outside the repository, and run the whole
  design on a throwaway copy of `skill/scripts` (`design.md` Appendix B).
- [x] Settle how the design fits `AGENTS.md` (never add a parallel gate): one gate, `interaction`, one
  command, one record (`design.md` section 0).
- [x] Bind the page that was actually captured (`design.md` section 0.10, option (a)): `probe` builds its
  list from the probe file instead of a fixed `index.html`; tried on the throwaway copy, with the
  repository's own behaviour recorded for the same cases.
- [x] State once that the web workflow supports project-contained files only (settled in review): the
  command may still run on an address and then says in its result that `designer-pipeline next` cannot
  count the page; `next` states the rule; one function of the core decides for both (`design.md` section
  0.10, Appendix B row 34).
- [x] Write the proposal, design, tasks, two spec deltas and the implementation plan;
  `openspec validate add-web-composition-checks --strict` passes.

## Wave 1

### T1 Composition side: page core, profile, capture script option, tests (size L)

Owns `skill/scripts/composition-page-core.cjs` (new), `skill/scripts/composition-core.cjs`,
`skill/scripts/capture-composition.cjs` and `tests/composition-gate.test.cjs`.

- [ ] `composition-page-core.cjs` first (Tasks 2 and 3 import it): export `VIEWPORTS`, `EVIDENCE_DIR`,
  `SETTLE_MS`, `evidenceFiles()`, `checkPageComposition(projectDir, { capture })`,
  `mergeGateResult(interaction, composition, { page })`, `boundPage(projectDir, url)` and
  `probeBinding(projectDir)` as fixed in the plan (`boundPage` and `probeBinding` are the one place that
  says which file the probe's `url` names and which pages count; the core reads `validateProbeFile` from
  `interaction-core.cjs` and does not edit it). Do not create the evidence folder (the capture does);
  write `result.json` only after all three sizes were captured and their pictures checked to exist;
  return the summary of `design.md` section 0.7.
- [ ] `composition-core.cjs`: add the `page` profile after `frame` and the text-position rule of
  `design.md` section 3 (one entry in `PROFILES`, one changed condition in `checkElements`, the profile
  passed to it). Contrast and the other text checks still read every visible text item. No new finding
  code; `FIX` is unchanged.
- [ ] `capture-composition.cjs`: accept `--settle-ms <1..10000>`, refuse other values before resolving
  a browser, take the picture as a buffer and write the file itself, take another every 250 ms until two
  match, at most `ceil(n / 250)` more times, save the last one. Without the option the behaviour is
  unchanged.
- [ ] Tests in `tests/composition-gate.test.cjs`, without a browser: each rule of the `design.md`
  section 3 table (the other profiles are proved by the existing tests, which must still pass);
  `checkPageComposition` with an injected capture (three good sizes; one bad size; a capture that leaves
  no picture); `mergeGateResult` (both pass; only probes fail; only a size fails; both fail; fields kept;
  and, with `page` elsewhere, the added sentence after a failure and in place of "Run `designer-pipeline
  next`" after a pass, with `status`, `checks` and every other field unchanged); `boundPage` and
  `probeBinding` on temporary folders (file, subfolder, `pages/../index.html`, a link that stays inside;
  elsewhere for a link leading out, a folder, `.`, `http://` and `HTTPS://`; absent; invalid; the exact
  list); `verify composition --image ... --profile page` on a tall page's elements reports no
  `text-off-canvas`; the capture script refuses a bad `--settle-ms`; and one browser-gated test (the
  settle option shows all the text of an entrance-animation page).
- Proves: the profile rule and the core's behaviour at the function level. Does not prove the settle loop
  on a real page beyond the gated test; T2's fake-browser case runs the loop through the real script.

### T2 Handler: `verify interaction` also checks the first screen (size M)

Owns `skill/scripts/cli-core.cjs`, `tests/interaction-cli.test.cjs` and the new
`tests/fixtures/fake-browser.cjs`.

- [ ] First, before any edit, copy `skill/scripts/cli-core.cjs` to a temporary file outside the
  repository and give its path to T5 (the baseline for the option-registry comparison: other unfinished
  changes have uncommitted edits in that file, so `HEAD` is not the baseline).
- [ ] `cli-core.cjs`, handler of `verify interaction` only: after the probes are evaluated, run the
  three-size check on the page the probes drove (`capture.url`), using a capture built from `runKernel`
  with the same `--chrome` and `--puppeteer-module`; join the halves with `mergeGateResult`, passing
  `{ page: boundPage(path.dirname(probeFile), doc.url) }` so the result's `next` says plainly when `next`
  cannot count the page; write the result to `<outDir>/interaction.json`; record `interaction` once; exit
  0, 2 or (capture problems) 1, as in the plan's "Fixed interfaces". Exit codes do not depend on the page.
  Append the note to the help line. No other line of the file changes; no option is added.
- [ ] `tests/fixtures/fake-browser.cjs`: the fake puppeteer module, with the behaviour and config keys of
  the plan.
- [ ] Tests in `tests/interaction-cli.test.cjs`, without a browser (the five existing tests stay as they
  are): the gate passes (exact record keys, exact result keys, and `next` at the quick tier returns `done`
  on the files the command wrote); one size blank; probes fail with good pictures; both fail; a capture
  that never happens at one size; the settle loop (the saved picture is the last one the fake returned)
  and `composition capture` taking one picture; `--output` moves only the result; a probe whose `url` is a
  page in a subfolder (the capture opens that file, the result's `next` has no added sentence, and `next`
  binds that file); an http(s) `url` (the command records `passed` and takes the pictures from the
  address; the result's `next` ends with the sentence that `designer-pipeline next` cannot count the page,
  and `next` stays at `probe` with the rule text; with a failing probe too, exit 2 and both sentences); a
  folder link leading outside (the same sentence). And one browser-gated test that runs the real command
  on a tall page and on an entrance-animation page.
- Proves: the wiring, the exit codes, the record, the files and the ordering, with both real capture
  scripts against a fake browser. Does not prove behaviour in a real browser beyond the gated test.

### T3 Web stage: probe rule, build and review text, tests (size M)

Owns `skill/scripts/workflows/web.cjs`, `tests/workflow-next.test.cjs` and, only if it exists when T3
starts, the web-project helper of `tests/workflow-freshness.test.cjs` (a file of the draft change
`align-workflow-lifecycle`, slice S0).

- [ ] `web.cjs`: import `probeBinding` from `../composition-page-core.cjs` (nothing else new: no `fs`,
  `path` or `validateProbeFile`). With `page = probeBinding(root)`: `probe.finished` is true only for a
  file, with every file of `page.inputs` present and `gatePassed` over it for the gate `interaction`.
  Give the `probe` action its texts for each case (plan, "Fixed interfaces"): the existing text for a
  missing probe file, the rule text for a page that is elsewhere, the invalid-probe text, the same command
  otherwise (also for a missing page file). Add the sizes clause to the standard and full `build` text and
  name the evidence in the `review` `show` list. No other stage changes; `shared.cjs`, `workflow-core.cjs`
  and the film and edit stage files are not edited.
- [ ] Tests in `tests/workflow-next.test.cjs`: each row of the `design.md` section 0.8 table; both spec
  scenarios of the steering question ("First-screen evidence is missing", "The page is edited after the
  check"); the page-binding scenarios (another local page that changes; a page in a subfolder, and with no
  root `index.html` the stage stays at `build`; an http address, a folder, and a folder link that leads
  outside, all with the rule text; a `url` that climbs out or is absolute; a missing or invalid probe
  file; a missing page file); quick uses the same files; rejection with and without an edit; `done` lists
  the one gate and the stored record has only `status` and `at`; build and review texts. Update the four
  existing tests that record the `interaction` gate and expect `done` or `review`, so they write the nine
  evidence files first (with `touch`, before the record, as the real command does) and a real probe
  document (`url` = `index.html`) instead of `{}`.
- [ ] If `tests/workflow-freshness.test.cjs` exists: extend its one helper that builds a web project so it
  also creates the nine evidence files (`evidenceFiles()`) and writes a real probe document (`url` =
  `index.html`) instead of `{}`, and change nothing else in that file. If it does not exist yet, say so in
  the hand-off so that change's owner knows a web project now needs the nine evidence files and a valid
  probe file.

### T4 Guides (size M)

Owns `skill/references/composition-gate.md`, `skill/references/workflow-web.md`,
`skill/references/web-direction.md`, `skill/references/qa-checklist.md` and
`skill/references/web-motion.md`.

- [ ] `composition-gate.md`: a "Web pages" section (the `page` profile, how the web probe uses it, the
  files, what is not seen). Edit in place; the film paragraph that another change rewrites stays.
- [ ] `workflow-web.md` `## probe`: one command, two checks, the nine files, what fails and warns, what
  is not seen, when the stage reopens, and that `--output` moves only the result. State the rule once, in
  plain words: the workflow judges the page file the probe names, inside the project; a page at a web
  address, or anywhere else outside the project, can only be judged by running the check yourself, and
  changes to it are invisible to `next`; the command accepts such a page and says in its result that
  `next` cannot count it, and `next` says what to change. Say nothing that suggests the workflow supports
  remote pages. Keep one `##` per stage id and the `interaction.json` example.
- [ ] `web-direction.md`: the first-screen evidence sentence and the W1 evidence cell. `qa-checklist.md`:
  one line under Browser / Visual Checks. `web-motion.md`: one sentence, where it describes `verify
  interaction`, that the command also checks the first screen (see `workflow-web.md`).
- Proves: nothing by test; read-through against the spec, then the gate checks packaging.

## Closure (T5, integrator)

- [ ] Add `scripts/composition-page-core.cjs` to `required` in `skill/references/package-resources.json`.
- [ ] Add the `CHANGELOG.md` entry under Unreleased (Added: the first-screen check of `verify
  interaction`, the `page` profile, the plain sentence in the command's result when the page is not a file
  inside the project; Changed: the web `probe` stage and texts, `probe` not finishing for a page that is
  not a file inside the project, and what a record of the `interaction` gate now means).
- [ ] If `scripts/tool-list.json` exists: run its check and its map generator as its own `tasks.md` says;
  no row should change. If its help-line check rejects the appended note, report it instead of editing
  the registry's files.
- [ ] With a throwaway script outside the repository, compare the keys of `FIX` in `composition-core.cjs`
  with the 14 finding codes before this change, and the two option sets of `cli-core.cjs` with the copy
  T2 made before editing (and check that `--settle-ms` is in neither), and record in `qa.md` that both are
  equal (no permanent test pins either).
- [ ] Run `node scripts/qa.cjs` directly (no pipe), then once more with the two browser variables set;
  run `openspec validate add-web-composition-checks --strict`.
- [ ] Smoke with the real browser in a temporary project outside the repository: `next` at probe names
  `verify interaction`; the command writes the result and the nine files and records the gate; `next`
  then returns `review` (standard) or `done` (quick); editing the page file that `url` names reopens
  `probe`, and editing another file does not; a probe whose `url` is an http address served by a small
  local server runs and records, its result's `next` says that `next` cannot count the page, and `next`
  states the rule and does not finish; a nearly empty page exits 2 with `checks.composition` `failed`; a
  dead card exits 2 with `checks.interaction` `failed`; an old probes-only record with no evidence
  reopens `probe`.
- [ ] Write `qa.md`: Component Conformance results, and Visual Acceptance as pending with no reviewer.
- [ ] Tick these boxes.

## Pending (not done by any task above)

- [ ] Answer the open questions in `design.md` section 7 (defaults apply until then).
- [ ] Try the `page` rules, the quick-tier rule and the settle limit on the first real pages; recalibrate.
- [ ] A named reviewer records Visual Acceptance in `qa.md`; agents never do.
- [ ] Later changes that this one leaves alone: full-page and contact-sheet capture, a sideways-scroll
  finding, hash-bound gate records, files a page loads reopening the check, a `recorded` field for every
  gate.

# Web Composition Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** draft, awaiting approval (2026-09-30). Do not start before the user approves the spec and answers, or accepts the defaults of, its open questions.

**Goal:** Make the existing `interaction` gate of the web `probe` stage also check the page's first screen at three sizes (375x812, 768x1024, 1440x900), so that `next` cannot reach `review` unless the probes and the first-screen check both passed on the current page, with one command, one record (`state.gates.interaction`), and no new stage, gate, record key, schema id, finding code, CLI verb or CLI flag.

**Architecture:** The handler of `verify interaction` in `cli-core.cjs`, after evaluating the probes, runs the existing composition capture script once per size on the page the probes drove, checks each picture with a new `page` profile of the composition gate, joins the two halves into one result (`mergeGateResult`), writes that result and only then records `interaction` once. A new small core, `composition-page-core.cjs`, holds the sizes, the evidence paths, the three-size check (with an injected `capture`, as `checkFilmProject` does, so tests need no browser), the merge, and the one function that tells which page the probe names (`boundPage`, `probeBinding`). The web workflow judges the page file the probe names, inside the project: `workflows/web.cjs` uses that function to make `probe.finished` require a regular file inside the project folder, every file of the list (the probe file, that page, the nine evidence files) to exist and `gatePassed` to pass over the list for the gate `interaction`; for an http(s) address, a link leading outside the folder, a folder or an invalid probe file it does not finish and says what to change. The command stays usable on its own for such a page, and the same function makes its result's `next` say plainly that `designer-pipeline next` cannot count the page. The capture script gets one option, `--settle-ms`. Guides say what the check does and does not see.

**Tech Stack:** Node.js CommonJS, Markdown, OpenSpec, Node built-in test runner driven only by `node scripts/qa.cjs`.

**Spec:** `openspec/changes/add-web-composition-checks/` (`proposal.md`, `design.md`, `tasks.md`, `specs/web-workflow/spec.md`, `specs/composition/spec.md`); summary and open questions `docs/superpowers/specs/2026-09-30-web-composition-checks.md`. `design.md` section 0 is the rule for how this fits the repository and for what makes `probe` stale; read it first. `design.md` Appendix B records a prototype of this whole plan that ran on a throwaway copy outside the repository.

## Global Constraints

- No new stage, stage id, gate, gate id, key in `state.gates`, finding code, receipt shape, schema id, workflow-state field, CLI command, option or flag. `KNOWN_OPTIONS` and `BOOLEAN_OPTIONS` do not change. `--settle-ms` exists on the capture script only.
- Do not edit `skill/scripts/workflow-core.cjs` (`recordGate`, `decide`), `skill/scripts/workflows/shared.cjs`, `film.cjs`, `edit.cjs`, `film-core.cjs`, `film-project-core.cjs`, `interaction-core.cjs`, `interaction-capture-core.cjs` or `capture-interaction.cjs`. `composition-page-core.cjs` imports `validateProbeFile` from `interaction-core.cjs` and only reads it. In `cli-core.cjs` only the handler branch of `verify interaction` and its help line change; the handlers of `verify composition` and `composition capture` do not.
- `verify interaction` keeps its flags, its exit codes (0, 2, 1) and its failure split. The five existing tests of `tests/interaction-cli.test.cjs`, the 21 of `tests/interaction-evaluate.test.cjs` and the existing tests of `tests/composition-gate.test.cjs` are not edited and must pass.
- Web stage ids, their order per tier, `remaining`, the `n/m` in `line` and the `guide` anchors do not change.
- `verify composition --image` output does not change, and `ui`, `poster` and `frame` give the same findings as before; the existing tests in `tests/composition-gate.test.cjs` are the proof. Do not add a second test for the same thing.
- Component Conformance and Visual Acceptance stay separate. Composition results keep `creativeAcceptance: "not-assessed"`. Agents never record Visual Acceptance.
- Tests assert behaviour: stage, command literal, file existence, record contents, `checks`, finding codes, exit codes, that `next` names the failed sizes. No wording or source-text tests, no test that pins a known blind spot of the gate (the overlap row of `design.md` section 3) or the exact set of finding codes. The command literal and the evidence paths are contracts and may be asserted.
- Plain words in every new `next`, help, error and guide sentence (`skill/references/plain-language.md`): the useful part first, ordinary verbs, a size or scope never widened (for example, "three sizes" never becomes "every size", and "first screen" is not dropped where the picture is meant).
- The only sanctioned verification is `node scripts/qa.cjs`, run directly with no pipe or redirect into the repository; never bare `node --test`. Only Task 5 runs it, on a quiet tree. A worker may smoke its own change with a throwaway script outside the repository.
- Each task edits only the files it owns. No file appears under two tasks. Other unfinished changes have uncommitted edits in `cli-core.cjs`, `web.cjs` and `composition-gate.md` (and in `workflow-core.cjs` and `shared.cjs`, which this plan does not touch). Edit in place; never run `git checkout`, `git stash` or a formatter over those files; do not commit. Task 3 may also edit the web-project helper of `tests/workflow-freshness.test.cjs`, a file of another change, but only if it exists when Task 3 starts.
- Leave untracked files of other changes alone: `openspec/changes/add-capability-registry/`, `add-web-capability-skills/`, `fix-tool-guidance-errors/`, `align-workflow-lifecycle/`, and the other files under `docs/superpowers/`.
- Order of work: Task 1 writes `skill/scripts/composition-page-core.cjs` first (its Step 1), because Tasks 2 and 3 import it. Task 3 can smoke once that file exists. Task 2 can smoke its cases only after Task 1 Steps 1 to 3 (the core, the `page` profile and `--settle-ms`) exist, because the capture script refuses an option it does not know and the settle case needs the loop. Until then each task writes its code against the fixed interfaces below. Task 4 has no dependency.
- Out of scope: full-page or contact-sheet capture, a sideways-scroll finding, hash binding, waivers for errors, sizes other than the three, login handling, a `recorded` field, any change to `verify composition` or `composition capture`.
- Spec deltas use `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` and must pass `openspec validate add-web-composition-checks --strict`.

## Fixed interfaces (shared by Tasks 1 to 4)

- **Gate.** One key, `interaction`. Stored as `state.gates.interaction = { status, at }` by the existing `workflow.recordGate(probeFolder, "interaction", result.status)`, with `probeFolder = path.dirname(probeFile)`. `status` is `passed` or `failed`. No key `composition`.
- **Sizes**, in this order, named `<width>x<height>`: `375x812`, `768x1024`, `1440x900`.
- **Evidence**, relative to the probe folder, forward slashes: `evidence/composition/<size>/screenshot.png`, `evidence/composition/<size>/elements.json`, `evidence/composition/<size>/result.json` (nine files), and the result document `<outDir>/interaction.json` (`outDir` is `--output` or `evidence` next to the probe file). The nine files never move with `--output`.
- **`skill/scripts/composition-page-core.cjs`** exports, and requires only `node:fs`, `node:path`, `./png-core.cjs`, `./composition-core.cjs`, `./contract-utils.cjs` and `./interaction-core.cjs` (read only, for `validateProbeFile`) (never `workflow-core.cjs` or `cli-core.cjs`):
  - `VIEWPORTS`: `[{ name: "375x812", width: 375, height: 812 }, { name: "768x1024", width: 768, height: 1024 }, { name: "1440x900", width: 1440, height: 900 }]`.
  - `EVIDENCE_DIR`: `"evidence/composition"`. `SETTLE_MS`: `4000`.
  - `evidenceFiles()`: the nine relative paths, sizes in `VIEWPORTS` order, files in the order screenshot, elements, result.
  - `checkPageComposition(projectDir, { capture })`: synchronous. `projectDir` may be relative; resolve it with `path.resolve` first.
    1. For each viewport calls `capture(viewport, outputDir)` (absolute `outputDir` = `<projectDir>/evidence/composition/<name>`). The return value is ignored. The core does not create `outputDir`: the capture script creates it after the browser has loaded the page, and an injected test capture creates it itself. All three sizes are captured first.
    2. Then confirms that each `outputDir` holds `screenshot.png` and `elements.json`; otherwise throws `fail("composition", ...)` with code `KERNEL_FAILED`, naming the size and file. Nothing has been written to `result.json` at that point.
    3. Then, for each viewport, decodes the picture (`decodePng`), reads the elements (`readJson`), runs `checkComposition(image, { profile: "page", elements })` and writes the result, unchanged, to `result.json`.
    4. Returns `{ profile: "page", status, viewports: [{ name, width, height, status, errors, warnings, files: { screenshot, elements, result } }], findings: [{ viewport, code, severity, message, fix, target? }], creativeAcceptance: "not-assessed" }`. `status` is `failed` if any size failed. `errors` and `warnings` count findings by severity; `files` are the relative paths. It records nothing and reads no workflow state.
    5. A picture that cannot be read, or elements that are not valid, make `decodePng`, `readJson` or `checkComposition` throw. The error is not wrapped: the handler exits 1 with its code, the `result.json` files of earlier sizes may already exist, and nothing is recorded.
  - `mergeGateResult(interaction, composition, { page } = {})`: returns a new object `{ ...interaction, status, checks, composition, next }` and changes no input. `checks = { interaction: interaction.status, composition: composition.status }`; `status` is `failed` when either is `failed`, else `passed`. `next`: when a half failed, one sentence per failed half (`The interaction check failed: apply the fix of each entry in \`findings\`.` and `The first-screen check failed at <failed sizes, comma-separated>: apply the fix of each error in \`composition.findings\`.`) followed by ``Then run`designer-pipeline verify interaction --probe interaction.json` again.``; when both passed, ``Both checks passed. Run `designer-pipeline next`.`` When `page?.kind === "elsewhere"`, the constant sentence `NOT_COUNTED` is added: after the failure text (one space between) when a half failed, and in place of the "Run `designer-pipeline next`." sentence when both passed (so `Both checks passed. ` followed by `NOT_COUNTED`). `NOT_COUNTED` is, word for word, ``This page is not a file inside the project, so `designer-pipeline next` cannot count it as finished, whatever the verdict says. To finish, point "url" at the local page file. A page that is not such a file can only be judged by running this check yourself.`` `status`, `checks` and every other field are the same with and without `page`.
  - `boundPage(projectDir, url)`: returns `{ kind: "elsewhere", url }` when `url` matches `/^https?:\/\//i`. Otherwise it resolves `path.resolve(projectDir, url)`; returns `{ kind: "absent", url }` when `fs.realpathSync` of it throws; returns `{ kind: "elsewhere", url }` when the real path is not a regular file (`fs.statSync(real).isFile()` is false) or `path.relative(fs.realpathSync(projectDir), real)` starts with `..` or is absolute; otherwise returns `{ kind: "file", url, file }`, where `file` is `path.relative(path.resolve(projectDir), resolvedFile)` with forward slashes. It repeats the two rules of the capture's own `resolvePageUrl`, which is not exported (`design.md` Q17 names exporting it as the other option). It reads no workflow state.
  - `probeBinding(projectDir)`: reads `<projectDir>/interaction.json`, parses it and runs `validateProbeFile`; on any error returns `{ kind: "invalid", reason: error.message }`; otherwise returns `boundPage(projectDir, doc.url)`, and for a file adds `inputs: ["interaction.json", file, ...evidenceFiles()]`. It reads no workflow state.
- **`composition-core.cjs`.** `PROFILES.page = { maxComponents: 90, dead: true, edge: true, scrolls: true }`, placed after `frame`. `checkElements(elements, add, profile)` keeps the existing condition for profiles without `scrolls` (error). For a `scrolls` profile a text item is **on screen** when `box.x + box.w > 0 && box.x < viewport.width && box.y + box.h > 0 && box.y < viewport.height`; an on-screen item whose box has `x < -1`, `y < -1` or `x + w > viewport.width + 1` gets `text-off-canvas` with severity `warn`; nothing is reported for the bottom edge or for items that are not on screen. `text-contrast` and every other check still read every visible text item, on screen or not. `FIX`, `SCHEMA` and the return shape of `checkComposition` are unchanged.
- **Capture script option.** `--settle-ms <n>` on `capture-composition.cjs` only, an integer from 1 to 10000. The script takes each picture as a buffer (no `path` option to the browser) and writes `screenshot.png` itself; it takes a picture, then another every 250 ms until two in a row are identical (`Buffer.compare` on `Buffer.from(...)` copies, because a browser library may return a `Uint8Array`), at most `ceil(n / 250)` more times, and saves the last one (the time spent taking a picture is extra). Without the option exactly one picture is taken and nothing else changes. No CLI option carries it: `composition capture` never passes it, and only `verify interaction` passes it, fixed at `SETTLE_MS`. A bad value exits 1 with a message naming `--settle-ms`, before any browser is resolved (validate it in the script's argument parsing).
- **Handler of `verify interaction`** (`cli-core.cjs`, `verifyCommand`, action `interaction`), in this order: (1) unchanged: read and validate the probe file, resolve `outDir` (before any spawn); (2) unchanged: run `capture-interaction.cjs` with the same `--chrome` and `--puppeteer-module`, fail with `KERNEL_FAILED` when it returns no capture; (3) `probes = evaluateProbeFile(doc, capture)`; (4) `pageUrl = capture.url`, and for each size a capture function that runs `capture-composition.cjs` through `runKernel` with `--composition <fileURLToPath(pageUrl)>` when `pageUrl` starts with `file:` or `--url <pageUrl>` otherwise, plus `--output <dir>`, `--width`, `--height`, `--settle-ms <SETTLE_MS>` and the `--chrome` and `--puppeteer-module` values when given, and on failure rethrows `fail("verify interaction", "first-screen capture at <size> failed: <message without a leading 'cli: '>", { code: error.code || "KERNEL_FAILED" })`; (5) `result = mergeGateResult(probes, checkPageComposition(path.dirname(probeFile), { capture }), { page: boundPage(path.dirname(probeFile), doc.url) })`; (6) create `outDir` and write `<outDir>/interaction.json` (the merged result) only now; (7) `workflow.recordGate(path.dirname(probeFile), "interaction", result.status)`; (8) return `{ result, exitCode: result.status === "passed" ? 0 : 2 }`. No option is added, and exit codes do not depend on the page. The help line keeps its text and gets this note appended: `(drives the probes, then checks the page's first screen at 375x812, 768x1024 and 1440x900; both must pass; the pictures go to evidence/composition/ next to the probe file)`.
- **Web stage** (`workflows/web.cjs`): its only new import is `probeBinding` from `../composition-page-core.cjs` (no `fs`, `path` or `validateProbeFile`). With `page = probeBinding(root)`: `probe.finished` = `page.kind === "file"` and every file of `page.inputs` exists and `gatePassed(state, root, "interaction", page.inputs)`, at every tier. `probe.action` returns, in order: the existing write-`interaction.json` action when that file is missing; for `page.kind === "elsewhere"` a run action whose `command` is the elsewhere text of "Texts" below (and whose `why` is the existing one); for `page.kind === "invalid"` the invalid-probe text; otherwise (`file` and `absent`) `{ type: "run", command: "designer-pipeline verify interaction --probe interaction.json", why }` (the command string is unchanged; for `absent` the command reports the missing page itself).
- **Texts.** The `probe` action's `why` (for the command) says the first screen is checked at each of the three sizes, what fails (a blank or washed-out picture, unreadable text anywhere on the page), what only warns, that a page with almost nothing on it (for example one small component) fails as blank and should be shown at real size with its page around it, and that any edit to the page file means running it again. The two texts for a page that cannot be bound are, exactly as worded, with `<url>` and `<reason>` filled in. Elsewhere: `interaction.json points at <url>, which is not a file inside this project. The workflow judges the page file the probe names, inside the project; a page at a web address, or anywhere else outside the project, can only be judged by running the check yourself. To finish, change "url" to the page file (for example "index.html"), then run designer-pipeline verify interaction --probe interaction.json again.` Invalid: `interaction.json is not a valid probe file (<reason>). Fix it, then run designer-pipeline verify interaction --probe interaction.json again.` The third text is `NOT_COUNTED` (see `mergeGateResult`). The standard and full `build` command gains one clause naming 375x812, 768x1024 and 1440x900 and saying `probe` checks the first screen at each; the quick text is byte-identical to today's. The `review` `show` list names `evidence/composition/<size>/screenshot.png` and the warnings in `evidence/composition/<size>/result.json`. No video, contact-sheet, footage or beat words.
- **Fake browser** (`tests/fixtures/fake-browser.cjs`, owned by Task 2): a CommonJS module that stands in for `puppeteer-core` (`launch()` returns a browser with `newPage()` and `close()`). It finds `png-core.cjs` (`encodePng`) and the canonical recording `tests/fixtures/interaction-samples.json` from its own folder, and reads the JSON file named by the environment variable `FAKE_BROWSER_CONFIG`, with keys `log` (a path; one line is appended per `launch`, `goto`, `screenshot` and `close`; a `screenshot` line holds the size, a counter and a short hash of the returned bytes), `changingShots` (the first N pictures of a page differ, then stay identical; default 0), `blank` (size names whose pictures are empty), `frozen` (true: the recorded samples show a motionless target) and `failAt` (size names at which `goto` throws `net::ERR_CONNECTION_REFUSED`). The page accepts `setViewport`, `bringToFront`, `on`, `off`, `evaluateOnNewDocument`, `waitForFunction` and `mouse.move/down/up/wheel`; `goto(url)` logs `goto <w>x<h> <url>`; `screenshot()` returns a PNG `Buffer` of the current size (an orange block on a dark ground, empty for `blank` sizes, one pixel that varies while still "changing"); `evaluate(fn)` returns `{ viewport, items: [one readable text item] }` for a function named `extract`, `undefined` for one named `installRecorder`, `true` for one whose source contains `Boolean(document.querySelector(css))`, and `{ samples, lost: false, done: true }` for one whose source contains `recording.samples`, where `samples` are `capture.probes[0].samples` of the recording (motionless when `frozen`); any other call returns `undefined`.

---

### Task 1: Composition Side: Page Core, Profile, Capture Script Option, Tests

**Files:**

- Create: `skill/scripts/composition-page-core.cjs`
- Modify: `skill/scripts/composition-core.cjs`
- Modify: `skill/scripts/capture-composition.cjs`
- Modify: `tests/composition-gate.test.cjs`

**Interfaces:** as in "Fixed interfaces".

- [ ] **Step 1: Write `composition-page-core.cjs` first**

As specified in "Fixed interfaces", so that Tasks 2 and 3 can import it (it includes `boundPage` and `probeBinding`, which the handler and the web stage both use). Keep it under about 130 lines. It needs the `page` profile at run time, not at load time.

- [ ] **Step 2: Implement the `page` profile in `composition-core.cjs`**

Add the `PROFILES.page` entry after `frame`, pass `profile` from `checkComposition` to `checkElements`, and replace the single `text-off-canvas` condition with the two-branch rule of "Fixed interfaces". Change nothing else in the file.

- [ ] **Step 3: Add `--settle-ms` to the capture script**

Add it to the allowed options; validate it (integer, 1 to 10000) in the argument parsing, before resolving puppeteer or Chrome; replace the direct `page.screenshot({ path })` with the settle loop of "Fixed interfaces" and write the last picture to `screenshot.png`. Keep `--seek` before the settle step. Keep the element read after the picture. Without the option the output is the same file as before.

- [ ] **Step 4: Add tests to `tests/composition-gate.test.cjs`**

Use the file's helpers (`canvas`, `good`, `encodePng`, `decodePng`, `checkComposition`, `cli`). Cases, all without a browser unless marked:

- `page` rules on element fixtures (viewport 375x812, a `good()`-like picture): text fully below the bottom edge and text running past the bottom edge give no `text-off-canvas` under `page` and do under `ui` (error). Text fully left of, fully right of, and fully above the viewport give none under `page`. Text partly on screen running past the right edge gives a `warn` `text-off-canvas`, the status stays `passed`, and with `allow: ["text-off-canvas"]` it moves to `allowed`; text partly on screen past the left edge and past the top edge also warn. A low-contrast text item still gives an `error` `text-contrast`, including one that lies fully below the bottom edge; a blank picture still gives `blank-frame`.
- `checkPageComposition` with an injected `capture` that creates the folder and writes a fixture PNG and an elements object for each size: three good sizes return `passed`, every path of `evidenceFiles()` exists, each `result.json` parses with `schema` `design-pipeline.composition-check.v1` and `profile` `page`, the summary lists the three sizes in order, `creativeAcceptance` is `not-assessed`. One size (`768x1024`) gets a nearly empty picture: `failed`, all three `result.json` files exist, a finding carries `viewport: "768x1024"`, a `code` and a `fix`. A `capture` that leaves no `screenshot.png` for the second size makes it throw with the size in the message and leaves no `result.json` for any size.
- `mergeGateResult`: both halves passed gives `status` `passed`, `checks` both `passed` and keeps `schema`, `id`, `url`, `probes` and `findings` of the interaction half; only the probes failed gives `failed` with `checks.interaction` `failed`; only `768x1024` failed gives `failed` with `checks.composition` `failed` and `next` containing `768x1024`; both failed names the interaction check and every failed size; the input objects are not changed. With `{ page: { kind: "file" } }` (or no `page`) the result is identical to the one without it. With `{ page: { kind: "elsewhere" } }`: both passed gives a `next` that contains `cannot count it as finished` and does not contain `Run \`designer-pipeline next\``; a half failed gives a `next` that contains the failure sentence, then `Then run`, then `cannot count it as finished`; `status`, `checks` and every other field equal those of the call without `page`.
- `boundPage` and `probeBinding` on temporary folders (link cases use `fs.symlinkSync(target, link, "junction")` and are skipped where that throws): `index.html`, `pages/demo/index.html`, `pages/../index.html` and a path through a folder link whose target is another folder inside the project give `{ kind: "file" }` with `file` relative and using `/`; a path through a folder link whose target lies outside, a folder (`pages`), `.`, `http://localhost:5173/` and `HTTPS://example.com/x` give `elsewhere`; `missing.html` and `index.html#hero` give `absent`; `probeBinding` on a folder whose `interaction.json` is missing, is not JSON, has `{}`, has `url` set to `../outside.html` or to an absolute path gives `invalid` with a non-empty `reason`; for a file its `inputs` equal `["interaction.json", <page file>, ...evidenceFiles()]` and contain `index.html` only when `url` names it.
- Capture script (spawn `skill/scripts/capture-composition.cjs` directly with `--composition <an existing file> --output <temp dir>`): `--settle-ms abc` and `--settle-ms 99999` exit 1 with `--settle-ms` in the message, before any browser.
- CLI, picture mode (spawn, as the file's other CLI test does): `verify composition --image <png> --elements <json> --profile page` on the elements of a tall page (text below the screen) reports no `text-off-canvas` finding, where `--profile ui` on the same two files does.
- Browser-gated (skipped where there is none, using the pattern of `tests/interaction-capture.test.cjs`: `process.env.DESIGN_PIPELINE_PUPPETEER_MODULE`, `resolvePuppeteer` and `resolveChrome` from `../skill/scripts/film-capture-core.cjs`, skipping only on `TOOL_MISSING`): `composition capture --settle-ms` is not reachable from the CLI, so spawn the capture script directly on a page with a 1.6 s entrance animation and two timed reveals with `--settle-ms 4000`, and check that `elements.json` lists all of its text items.

Expected: every new case fails on the code as it is before Steps 1 to 3.

- [ ] **Step 5: Hand off**

Report the four paths and the case names of Step 4. Do not run `node scripts/qa.cjs`; Task 5 owns the run. Optionally check by hand with a throwaway script outside the repository that calls `checkPageComposition` with a fake `capture`.
Expected: the case names in the report match Step 4.

---

### Task 2: The Handler of `verify interaction`, the Fake Browser, Tests

**Files:**

- Modify: `skill/scripts/cli-core.cjs`
- Modify: `tests/interaction-cli.test.cjs`
- Create: `tests/fixtures/fake-browser.cjs`

**Interfaces:** as in "Fixed interfaces" (handler, help line, fake browser). It requires `SETTLE_MS`, `boundPage`, `checkPageComposition` and `mergeGateResult` from `./composition-page-core.cjs` (Task 1) and `fileURLToPath` from `node:url`. It uses the existing `runKernel`, `option`, `fail`, `workflow.recordGate`, `evaluateProbeFile`.

- [ ] **Step 1: The handler**

Change only the `interaction` branch of `verifyCommand` (steps 3 to 8 of the handler in "Fixed interfaces"; steps 1 and 2 stay as they are) and the help line. No other line of the file changes; no option is added.

Before the first edit, copy `skill/scripts/cli-core.cjs` to a temporary file outside the repository and give its path to Task 5: it is the baseline for the option-registry comparison (other unfinished changes have uncommitted edits in that file, so `HEAD` is not the baseline).

- [ ] **Step 2: The fake browser**

Write `tests/fixtures/fake-browser.cjs` as specified. Check by hand with a throwaway script that the current unpatched CLI, given this fake, runs the interaction half (`verify interaction --chrome <node path> --puppeteer-module tests/fixtures/fake-browser.cjs`) and prints a passing result for a project made from the fixture.

- [ ] **Step 3: Add tests to `tests/interaction-cli.test.cjs`**

Keep the five existing tests as they are. Use the file's `probeProject(dir)` helper, create workflow state with `next --deliverable web --tier quick`, write a config file for the fake, and run the real CLI with `--chrome <process.execPath> --puppeteer-module <fixtures/fake-browser.cjs>` and `FAKE_BROWSER_CONFIG` in the child's `env`. Cases:

- The gate passes: exit 0; `state.gates.interaction` has exactly the keys `status` and `at`, with `status` `passed`, and `state.gates` has no other key; the nine files and `evidence/interaction.json` exist; the result on disk has exactly the keys `schema`, `id`, `url`, `status`, `probes`, `findings`, `checks`, `composition` and `next`, with `schema` `design-pipeline.interaction-result.v1`, `checks` both `passed` and three sizes in order; then `next` for the quick project returns `done` (the files the command wrote finish `probe`: the ordering proof).
- One size blank (`blank: ["768x1024"]`): exit 2; record `failed`; `checks.composition` `failed`, `checks.interaction` `passed`; all nine files and the result written; `next` (the result field) contains `768x1024`; `next` for the project stays at stage `probe`.
- The probes fail with good pictures (`frozen: true`): exit 2; `checks.interaction` `failed`, `checks.composition` `passed`; the nine files written.
- Both fail: `checks` both `failed`; the result's `next` names the interaction check and the failed size.
- A capture that never happens (`failAt: ["768x1024"]`): exit 1; `error.code` is `KERNEL_FAILED`; the message contains `768x1024`; no `evidence/interaction.json`; `state.gates` is `{}`. Then, in one folder: a good run, a pause of at least 150 ms, a run with `failAt` set: the record is still the first `passed` one, and `next` does not return `done` (the failed run wrote pictures that are newer).
- The settle loop: with `changingShots: 2` the gate exits 0 and, for each size, the fake's log shows more than one `screenshot` line, and the saved `screenshot.png` is byte-equal to the last picture the fake returned for that size (the last hash in the log) and differs from the first; `composition capture --composition index.html --output out --width 375 --height 812` (which passes no `--settle-ms`) logs exactly one `screenshot` line.
- `--output my-evidence` moves only the result: it is in `my-evidence/interaction.json` and the pictures are in `evidence/composition/`; `next` for the quick project returns `done`.
- A probe whose `url` is a page in a subfolder (`pages/demo/index.html`, with a root `index.html` too): the fake's log shows `goto` of that file for the probes and for each size; the result's `next` is exactly ``Both checks passed. Run `designer-pipeline next`.`` (no sentence about the page not counting); `next` for the quick project returns `done`; setting that page's file time a minute ahead makes `next` return stage `probe`; doing the same to the root `index.html` alone does not. This case pins that the file the capture opened is the file the stage lists.
- A probe whose `url` is an http(s) address (for example `http://127.0.0.1:9/app`; the fake never connects): the command exits 0, the log shows `goto` of the address for the probes and for each size, the record is `passed`, the result's `next` ends with the `NOT_COUNTED` sentence (it contains `cannot count it as finished`) and does not contain ``Run `designer-pipeline next` ``, and `next` returns stage `probe` with a command that contains the address, `is not a file inside this project` and `can only be judged by running the check yourself`. The same address with `frozen: true`: exit 2, `checks.interaction` `failed`, and the result's `next` contains the interaction failure sentence, then `Then run`, then `cannot count it as finished`. A folder link leading outside the project (`fs.symlinkSync(outside, link, "junction")`; skipped where that throws): exit 0, the same added sentence, and `next` returns stage `probe`.
- Browser-gated (same skip pattern as `tests/interaction-capture.test.cjs`): a tall three-section page whose `#card` follows the pointer (as `liveHtml()` of `tests/interaction-capture.test.cjs`, with added sections) and a page with a 1.6 s entrance animation: the real command with `--puppeteer-module` from `DESIGN_PIPELINE_PUPPETEER_MODULE` exits 0 and writes the nine files and the record.

Expected: every new case fails on the code as it is before Step 1 (the command writes no pictures and no `checks`).

- [ ] **Step 4: Hand off**

Report the three paths and the case names. Do not run `node scripts/qa.cjs`. Optionally smoke the handler with a throwaway project outside the repository and the fake browser.
Expected: the five existing tests still pass; the case names match Step 3.

---

### Task 3: Web Stage: Probe Rule, Build and Review Text, Tests

**Files:**

- Modify: `skill/scripts/workflows/web.cjs`
- Modify: `tests/workflow-next.test.cjs`
- Modify, only if it exists when this task starts: `tests/workflow-freshness.test.cjs` (its one helper that builds a web project; nothing else in it)

**Interfaces:** as in "Fixed interfaces" (Web stage, Texts). `web.cjs` still exports only `stages(state)`. Its only new import is `probeBinding` from `../composition-page-core.cjs` (Task 1); it adds no `fs`, `path` or `validateProbeFile`. It keeps every other line as it is. The existing `review` `recommended` text is not changed.

- [ ] **Step 1: Add failing tests to `tests/workflow-next.test.cjs`**

Use the existing helpers (`tmp`, `touch`, `initState`, `nextAction`, `decide`, `recordGate`) and `evidenceFiles()` for the nine paths. A helper writes the nine files with `touch`; evidence is always written before the record, as the real command does. Cases:

- Standard web project at probe, a real probe document whose `url` is `index.html` and `index.html` present, `interaction` recorded `passed`, no evidence: `stage` is `probe`, `command` contains `designer-pipeline verify interaction --probe interaction.json`, and `nextAction` is not `review` (the steering scenario, in these words).
- Evidence written, then recorded `passed`: `review`. Recorded `failed` with the nine files: `probe` with the same command. Record `passed`, then delete one of the nine files: `probe`. Record `passed`, then set the page file a minute ahead: `probe`. Set `interaction.json` a minute ahead: `probe`. Set `screenshot.png`, then `elements.json`, then `result.json` of one size a minute ahead, one at a time: `probe` each time. An old-style record (`recordGate(dir, "interaction", "passed")` with no evidence): `probe` with the same command.
- The page the record is bound to (each with the nine files written and `recordGate(dir, "interaction", "passed")` after them): `url` is `demo.html` with `index.html` also present: `review`; set `demo.html` a minute ahead: `probe`; set only `index.html` a minute ahead: still `review`. `url` is `pages/demo/index.html` with `index.html` also present: `review`; set that file a minute ahead: `probe`; the same project with no root `index.html`: stage `build` (the build rule is not changed). `url` is `http://localhost:5173/`: `probe`, and `command` contains the address, `is not a file inside this project` and `can only be judged by running the check yourself`. `url` names a folder (`pages`), and `url` goes through a folder link that leads outside (make it with `fs.symlinkSync(outside, link, "junction")`; skip the case where that cannot be made): `probe`, and `command` contains `is not a file inside this project`. `url` is `../outside.html`, and `url` is an absolute path (write them straight into `interaction.json`): `probe`, and `command` contains `not a valid probe file`. `url` names a file that does not exist: `probe` with the `verify interaction` command. `interaction.json` missing, or containing `{}`, with a `passed` record and the nine files: `probe` (the first asks for the file, the second says it is not a valid probe file).
- `interaction.json` missing: the action asks for it (no `verify interaction` in its command); with it present and no record: the command is `designer-pipeline verify interaction --probe interaction.json`.
- Quick web project with the probe file, its page, the nine files and a current `passed` record: `done`; the same without the nine files: `probe`.
- Rejection: a standard project at `review` (record current) rejected with a reason: `probe` with the command; record `passed` again without editing anything: `review`.
- Finished project: the `done` action's `evidence.gates` has `interaction` and no `composition`; the stored record has exactly the keys `status` and `at`; the state `schema` is still `design-pipeline.workflow-state.v1`.
- Build: the standard and full build command contains `375x812`, `768x1024` and `1440x900`; the quick one does not. Review: `JSON.stringify(action)` contains `evidence/composition/` and `result.json` and does not match `/video|contact.sheet|footage|beat/i`.
- Update the four existing tests that record the `interaction` gate and expect `done` or `review` ("probe asks to write interaction.json when missing, then routes to verify interaction", "a passed interaction gate goes stale when index.html changes", "a rejected web draft reopens probe", "web review speaks of the page and keeps the shared decision contract"): they also write the nine files (with `touch`) before recording, as the real command does, and write a real probe document (the canonical `document` of `tests/fixtures/interaction-samples.json`, with `url` set to `index.html`) instead of `{}`, so they keep proving what they proved. With `{}` exactly these four fail.
- If `tests/workflow-freshness.test.cjs` exists (slice S0 of `align-workflow-lifecycle`): extend its one helper that builds a web project so it also creates the nine evidence files (`evidenceFiles()`) and writes a real probe document (`url` = `index.html`) instead of `{}`, and change nothing else in that file. If it does not exist yet, say so in the hand-off, so that change's owner knows a web project now needs the nine evidence files and a valid probe file.

Expected: the new cases fail on the current code; the four updated tests fail until `web.cjs` changes.

- [ ] **Step 2: Implement `web.cjs`**

Import `probeBinding`, write the new `probe.finished` and `probe.action` (with the two texts for a page that cannot be bound) and its `why`, the build clause and the `review` `show` text as specified. Keep the stage list, `REFERENCE`, `INTAKE`, `CONCEPTS`, `DELIVER` and the `SHARED_REVIEW` reuse as they are.

- [ ] **Step 3: Hand off**

Report the two paths and the case names. Do not run `node scripts/qa.cjs`. Optionally check by hand with a throwaway script outside the repository that calls `nextAction` on a temporary directory (after Task 1 has created `composition-page-core.cjs`).
Expected: the case names match Step 1.

---

### Task 4: Guides

**Files:**

- Modify: `skill/references/composition-gate.md`
- Modify: `skill/references/workflow-web.md`
- Modify: `skill/references/web-direction.md`
- Modify: `skill/references/qa-checklist.md`
- Modify: `skill/references/web-motion.md`

**Interfaces:**

- `composition-gate.md` keeps its first paragraphs and the film paragraph (another change rewrites it; do not touch those lines) and gains a section `## Web pages`: what the `page` profile does in words (what is not reported for position, what warns, what still fails, and that text contrast is read for every visible text item, not only the first screen); that `verify interaction` uses it on the first screen at 375x812, 768x1024 and 1440x900 and waits up to 4 s for each picture to stop changing; the nine files and what each is for; that a small lone component on an empty page can fail `blank-frame` and what to do (show it at real size with its page around it); what the check does not see (overlapping text, clipped text, text running out of its box, sideways scrolling, layout below the first screen, where only contrast, near-miss alignment and type sizes are read). Also add `page` to the profile list in the first code block, and say that `verify composition --image ... --profile page` runs the same profile by hand.
- `workflow-web.md` `## probe`: one command (`verify interaction --probe interaction.json`; the `interaction.json` example stays as it is), two checks (the probes, then the first screen at three sizes), the nine files, what fails and what warns, that editing the page file that `url` names, the probe file or an evidence file reopens the stage, that `--output` moves only the result, what is not seen, and that every tier uses the same rule. It states the rule once, in plain words: the workflow judges the page file the probe names, inside the project; a page at a web address, or anywhere else outside the project, can only be judged by running the check yourself, and changes to such a page are invisible to `next`; the command accepts such a page and says in its result that `next` cannot count it, and `next` says what to change (point `url` at the page file). It says nothing that suggests the workflow supports remote pages. Keep exactly one `##` heading per stage id. Target size: under 5,120 bytes.
- `web-direction.md`: replace the sentence "Screenshots are the 375x812, 768x1024 and 1440x900 sets from Browser / Visual Checks." with one that names `evidence/composition/<size>/screenshot.png` and says they show the first screen only, so the reviewer still scrolls the live page; change the first-screen wording in the W1 evidence cell to name the files. No other rule text changes. Target size: under 9 KB.
- `qa-checklist.md`: one line under "Browser / Visual Checks" saying that the first-screen pictures for the three sizes are in `evidence/composition/<size>/` after `verify interaction`, and that warnings judged go in this section.
- `web-motion.md`: one sentence, where it describes `verify interaction`, saying that the command also checks the page's first screen at three sizes (see `workflow-web.md`). Nothing else in it changes.
- In `workflow-web.md` `## probe` and `composition-gate.md` also say that errors cannot be waived, that `--allow` belongs to `verify composition` and does nothing for `verify interaction`, and that a page with almost nothing on it fails as blank.

- [ ] **Step 1: Write the five edits**

Follow `skill/references/plain-language.md`. Do not restate the W1 to W7 table or the gate's findings; point to them.

- [ ] **Step 2: Read-through against the spec**

Compare the text with `specs/web-workflow/spec.md` (the guide requirement) and `specs/composition/spec.md` and with the fixed interfaces. Expected: each requirement has a place; the command and file names are exact; the probe example still parses as JSON; `workflow-web.md` still has a heading for each of `intake`, `reference`, `concepts`, `build`, `probe`, `review`, `deliver`.

- [ ] **Step 3: Hand off**

Report the five paths and the byte counts of `workflow-web.md` and `web-direction.md`. Do not run `node scripts/qa.cjs`.

---

### Task 5: Registration, Changelog, QA and Smoke (integrator)

**Files:**

- Modify: `skill/references/package-resources.json`
- Modify: `CHANGELOG.md`
- Create: `openspec/changes/add-web-composition-checks/qa.md`
- Modify: `openspec/changes/add-web-composition-checks/tasks.md` (tick boxes only)

**Interfaces:**

- `package-resources.json`: add `scripts/composition-page-core.cjs` to `required`, next to `scripts/composition-core.cjs`.
- `CHANGELOG.md` under `[Unreleased]`: an Added entry (the first-screen check of `verify interaction`, the `page` profile, and the plain sentence in the command's result when the page is not a file inside the project) and a Changed entry (the web `probe` stage reads one record over the probe file, the page its `url` names and nine evidence files, instead of a fixed `index.html`; it does not finish for an http(s) address or any page that is not a file inside the project; what a record of the `interaction` gate now means; web build and review text), each naming the change id.
- `qa.md` follows `openspec/changes/add-music-driven-plate-kit/qa.md`: Conformance (verified), Open questions and answers, Visual Acceptance: PENDING with no reviewer, Not verified.

- [ ] **Step 1: Register and record the change**

Edit `package-resources.json` and `CHANGELOG.md`. Compare, with a throwaway script outside the repository, the keys of `FIX` in `composition-core.cjs` with the 14 finding codes before this change (`blank-frame`, `low-contrast`, `weak-separation`, `off-balance`, `dead-band`, `no-focal-point`, `clutter`, `palette-sprawl`, `edge-crowding`, `text-contrast`, `text-off-canvas`, `alignment-near-miss`, `flat-hierarchy`, `type-scale-sprawl`), and the `KNOWN_OPTIONS` and `BOOLEAN_OPTIONS` sets of `cli-core.cjs` with those of the copy Task 2 made before its first edit (and check that `--settle-ms` is in neither), and record both results in `qa.md`. If `scripts/tool-list.json` exists, run its check and its map generator as its own `tasks.md` says; no row should change. Run `openspec validate add-web-composition-checks --strict`.
Expected: same 14 codes; same option sets; valid.

- [ ] **Step 2: Run the QA gate on a quiet tree**

Run `node scripts/qa.cjs` directly (no pipe or redirect into the repository). Expected: exit 0. On failure, return the failing file to its owner (Task 1, 2, 3 or 4), wait for the fix, rerun.
Then run it once more with `DESIGN_PIPELINE_PUPPETEER_MODULE=D:/projects/design-pipeline/tern-snapshot-1/runtime/node_modules/puppeteer-core` and `PUPPETEER_EXECUTABLE_PATH` set to the headless Chrome in the HyperFrames cache (on this machine `C:/Users/Administrator/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe`), so the browser-gated tests run. Expected: exit 0 and the gated tests reported as run, not skipped.

- [ ] **Step 3: Smoke the real command on temporary web projects**

In a temporary directory outside the repository (use the sibling `puppeteer-core` path above with `--puppeteer-module`):

1. `next --root <dir> --deliverable web --tier standard`; answer intake and reference (`decide`), write `concepts.md`, `decide --stage concept --choice 1`, then write `index.html` (a tall page whose `#card` follows `mousemove`, like `liveHtml()` in `tests/interaction-capture.test.cjs`, with three sections) and `interaction.json` with `url` set to `index.html`.
2. `next`. Expected: stage `probe`, command `designer-pipeline verify interaction --probe interaction.json`.
3. `verify interaction --root <dir> --probe interaction.json --puppeteer-module <path>`. Expected: exit 0, the result and nine files under `evidence/composition/`, `state.gates` holds only `interaction` with `status` `passed`, `checks` both `passed`.
4. `next`. Expected: stage `review`. Then edit `index.html` and run `next`. Expected: stage `probe` again with the same command.
5. Repeat step 3 on a copy of the page that has a dead card (no `mousemove` listener). Expected: exit 2, `checks.interaction` `failed`, `checks.composition` `passed`, and `next` stays at `probe`.
6. Repeat step 3 on a copy of the page with a nearly empty body. Expected: exit 2, `checks.composition` `failed`, the `blank-frame` finding with its size and fix in `composition.findings`.
7. Write an old-style record (`state.gates.interaction = { status: "passed", at: <now> }`) into a project that has no `evidence/composition/`. Expected: `next` names the same command.
8. Copy the page to `pages/demo/index.html`, set `url` to `pages/demo/index.html`, run the command, then edit the root `index.html`. Expected: `next` still returns `review`. Then edit `pages/demo/index.html`. Expected: stage `probe`.
9. Serve the page with a small local server (`http.createServer`), set `url` to the server's address and run the command. Expected: exit 0, the pictures come from the address, the record is `passed`, the result's `next` ends with the sentence that `designer-pipeline next` cannot count the page as finished, and `next` returns stage `probe` with the text that states the rule and names the address. Set `url` back to the file, run the command again. Expected: the result's `next` has no such sentence, and `next` returns `review`.

Record the commands, exit codes and key output in `qa.md`.

- [ ] **Step 4: Write `qa.md` and tick the tasks**

Record the `qa.cjs` exit codes (both runs), the smoke output, Visual Acceptance as pending with no reviewer and the statement that agents never record it, and what was not verified (real pages; the open questions' defaults). Tick the `tasks.md` boxes that are done.
Expected: `openspec validate add-web-composition-checks --strict` still valid after the last edit.

---

## Acceptance

- `openspec validate add-web-composition-checks --strict` reports valid.
- `node scripts/qa.cjs`, run directly, exits 0, and so does the second run with the browser variables set, with the gated tests run.
- The smoke of Task 5 Step 3 shows: `next` names `verify interaction` at `probe`; the one command writes the result and nine files and records one gate key; `next` then reaches `review`; an edit to the page file that `url` names reopens `probe` and an edit to another file does not; an http address runs and records, its result says that `next` cannot count the page, and `next` does not finish; a dead card and a nearly empty page each exit 2 with the right half named in `checks`; an old probes-only record reopens `probe`.
- `git status` shows changes only in the files owned by Tasks 1 to 5, this plan, its spec, and files that were already modified or untracked before the work started.

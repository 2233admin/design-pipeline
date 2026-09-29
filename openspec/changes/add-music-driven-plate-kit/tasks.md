# Tasks

Order: wave 1 (W1, W2, W3, W7 in parallel), gate 1, wave 2 (W4, W5 in parallel), gate 2, closure.
The gates and the closure belong to W6, the integrating agent. Each worker edits only the files it
owns; no file appears under two owners. Interfaces are fixed in `design.md` sections 4.1 to 4.6
and 5: option names, class names, custom-property names and the hit shape. Nothing else may be
renamed without telling the owner of the other side.

## Verification protocol

The project's only sanctioned harness is `node scripts/qa.cjs`, run directly (`AGENTS.md`: never
bare `node --test`, which discovers nested upstream fixtures).

- `qa.cjs` has no scoped mode. It reads no arguments and no filter variables. It passes every file
  of `scripts/test-manifest.json` to `node --test` as an explicit path under a hermetic
  environment (temporary HOME and TMP, dead proxy, fixed clock), and around that it checks that the
  manifest equals `tests/*.test.cjs`, packages `skill/` twice and compares the hashes, installs the
  package, and finally fails unless `git status` is byte-identical to its start. One run took 73 s
  here.
- A scoped run is therefore: put the new test file in `scripts/test-manifest.json` and run
  `node scripts/qa.cjs`. A test file that is not in the manifest never runs, and QA fails while the
  manifest and `tests/` disagree.
- A run is valid only on a quiet tree: a sibling's half-written file fails the status check and can
  fail packaging. So no worker runs `qa.cjs`. Each worker creates its files and tests and reports
  them; W6 registers them and runs QA at each gate, hands failures to the owning worker, and reruns.
  W6 runs the full QA once more at the end.
- `scripts/test-manifest.json` and `skill/references/package-resources.json` (`required`) have one
  owner, W6, so that ownership stays disjoint. Registration list: tests `film-kit.test.cjs` (W1),
  `film-audio-events.test.cjs` (W2), `film-chrome.test.cjs` (W7); required package files
  `references/film-choreography/audio-events.js` (W2),
  `references/film-choreography/instrument-chrome.css` (W7) and every file under
  `evals/film/music-driven/` (W5).
- A worker may check its own module before the gate with a throwaway script outside the repository,
  and may use the local browser method of `design.md` section 8 (installed Chrome and ffmpeg, no
  puppeteer). That is smoke evidence, never a substitute for the gate, and is not shipped.

## Done in this slice

- [x] Read the current creative layer, gates, scaffold, eval harness and the reference project.
- [x] Spike the kit and the chrome against the real probe, storyboard gate, timeline gate and
  render gate, in a real Chrome; record the results in `design.md` section 8.
- [x] Write the proposal, design, tasks and spec delta; fold in the user's decisions on Q1, Q6 and
  Q8; `openspec validate add-music-driven-plate-kit --strict` passes.

## Wave 1

### W1 Instrument kit (size L)

Owns `skill/references/film-choreography/patterns.js`, `registry.json`, `timeline-probe.js`, the new
`tests/film-kit.test.cjs`, and the argument table of the test named "choreography registry and
module agree" in `tests/film-gates.test.cjs` (edit only that table).

- [x] Add the lane primitive to `patterns.js`: sort hits, drop a hit under one frame after the
  previous kept hit or before `until`, attack on the hit, release truncated at the next hit, every
  tween a `fromTo` with explicit endpoints and `immediateRender: false`; throw when `attack` is
  under one frame. Add `hash(seed, index)`, the number formatter (`String(Number(x.toFixed(3)))`,
  never a trailing `.0`) and the colour guard (a value that begins with `var(` throws with the fix).
  List the tween property whitelist in the file header.
- [x] Implement `audio-meter` (with `axis`), `event-scope`, `tick-ticker`, `grid-pulse`,
  `build-countdown` (one `to` tween on `innerText` with `modifiers`, an explicit no-op hold, no
  start option) and `hold-then-hit` (opacity 0 at time 0, `fromTo` chain, flash-only when `zoom` is 1
  and `shakeFrames` is 0), with the option names of `design.md` 4.3. Validate required options with
  `need()` and return the handoff time.
- [x] Register the six in `registry.json` with `kind`, `animates`, `audio`, `markup` (chrome class
  names), `productRole`, `required`, `optional`, `use`; add the top-level `helpers` block for
  `audio-events.js` (API names of 4.4) and the `chrome` block exactly as `design.md` 4.6 lists it.
- [x] Make the probe treat `modifiers` as a control key.
- [x] Extend the parity test's argument table with the six instruments.
- [x] Test through a mock-node recorder into the real `probe()` and the real `checkTimeline`
  against a synthetic storyboard: property whitelist, `fromTo` shape and absolute positions; lane
  invariants under dense, unsorted and coincident hits from a fixed generator (no `Math.random`):
  no `property-conflict`, every kept attack on its hit, every release ends by the next hit; no
  emitted string with a trailing `.0`; the `var(` guard; determinism and seed sensitivity; the
  `build-countdown` shape, ease (0 to 0, 1 to 1, never decreasing, zero from `until − freeze`) and
  formatter; the `hold-then-hit` shake, flash-only mode and the absence of other tweens in the
  freeze; registry documentation completeness and `required` enforcement; `scanCompositionSource`
  on `patterns.js` reports nothing; the probe ignores `modifiers`.
- Proves: schedule-level seek-safety and compatibility with the existing gates, at the gate.
  Does not prove real browser rendering.
- Optional smoke, once, outside the repository: real GSAP 3.14.2 in a temporary directory and the
  installed Chrome, HyperFrames' seek sequence (`totalTime(t + 0.001, true)` then
  `totalTime(t, false)`), the six instruments on one page, the same times visited in ascending and
  in shuffled order. Expect no difference in normalised visual state; report the output.

### W2 Audio adapter and grid script (size M)

Owns the new `skill/references/film-choreography/audio-events.js`, the new
`tests/film-audio-events.test.cjs`, `skill/scripts/score-project-core.cjs` and
`tests/film-score.test.cjs`.

- [x] Write `audio-events.js` as a UMD module, global `FilmAudio`: `fromScoreGrid`, `fromAnalysis`,
  `hits`, `beats`, `bar`, `hash`; parse note names and MIDI numbers; pure, no clocks or randomness;
  throw with a fix (`designer-pipeline film score`) on a missing or wrong-schema grid.
- [x] Make `film score` write `lib/score-grid.js` (`FilmAudio.setGrid(<grid JSON>);`, loaded after
  `audio-events.js`) beside `score-grid.json`, creating `lib/`, and add the composition hint to
  its `next` output.
- [x] Test with grids produced by `summarizeGrid` from events shaped like the kernel's
  (`{ atSec, durSec, value: { s, note, gain } }`): selection by sound, note range, duration, gain,
  window; strength normalisation; quiet windows; bars; wrong schema; `fromAnalysis` beats and bars;
  the scan of `audio-events.js` reports nothing; `film score` with the injected fake renderer
  writes `lib/score-grid.js` deep-equal to the grid.
- Proves: the data path, at the gate. Does not prove that a real Strudel render yields those events.

### W3 Documents (size M)

Owns `skill/references/workflow-film.md`, `product-film-direction.md`, `film-score.md`,
`hyperframes.md` and `skill/SKILL.md`. Text only; no code, no tests.

- [x] `workflow-film.md`: for a music-led film, concepts cards state the instrument premise; plan
  writes `## Treatment` in `concepts.md`, fills `sound.md` with the `Section` column, then one
  storyboard beat per plate; build uses the kit and the chrome; review fills the music-driven
  section of `qa.md`.
- [x] `product-film-direction.md`: the treatment template and plate brief with the field mapping of
  `design.md` 5, the style-bible seed as the chrome slots, the product-object rule, rules R1 to R7
  with the fields to read, and the statement that they are Visual Acceptance guidance (R7 is also
  a Conformance finding when broken).
- [x] `film-score.md`: the voice-to-response table, a selector row for each of the three templates
  (from their source), how to read a window from bar numbers, and `lib/score-grid.js`.
- [x] `hyperframes.md`: the kit contract (property tweens only, no callbacks and why, the lane rule,
  `fromTo` with `immediateRender: false`, no trailing `.0`, literal colours, counters as one `to`
  tween on static markup), the chrome, the single style table and how a plate re-scopes it, and the
  local browser smoke method; link the kit from the beat author contract.
- [x] `skill/SKILL.md`: one pointer line in the film bullets. Keep the front door short.
- Proves: nothing by test. A read-through against `design.md`, then the gate.

### W7 Instrument chrome (size M)

Owns the new `skill/references/film-choreography/instrument-chrome.css` and the new
`tests/film-chrome.test.cjs`. The registry's `chrome` block is W1's; the two sides meet at the names
in `design.md` 4.6.

- [x] Write `instrument-chrome.css` from `design.md` 4.6: the fourteen custom properties with
  achromatic colour defaults, the recipes, and none of the excluded constructs. A header comment
  states that it is original work whose recipe list adapts ideas only.
- [x] Test the file's text (no CSS dependency): declared properties equal `chrome.properties` of the
  registry; every `var(--fk-*)` is declared; colour defaults have equal red, green and blue; none of
  `animation`, `transition`, `@keyframes`, `@import`, `@font-face`, `url(`, `clip-path`, `polygon(`,
  a gradient other than `repeating-linear-gradient`; no `transform` on `.fk-log__col`, `.fk-stage`,
  `.fk-cell`; no `opacity` on `.fk-flash`; every `fk-` class is in `chrome.recipes` and every class
  named there or in an instrument's `markup` exists.
- [x] Local smoke, outside the repository: a throwaway page with every recipe, screenshotted with
  the installed Chrome (`--headless=new --screenshot`), once with the defaults and once with a
  style table that overrides all six colours; look at both PNGs and report what they show, including
  legibility of the label, data and display sizes at 1920 by 1080.
- Proves: the file matches its documentation and avoids the constructs that fight the timeline, at
  the gate. The smoke shows that it renders in Chrome, not in HyperFrames.

## Gate 1 (W6, after wave 1)

- [x] Register `film-kit.test.cjs`, `film-audio-events.test.cjs` and `film-chrome.test.cjs` in
  `scripts/test-manifest.json`, and `audio-events.js` and `instrument-chrome.css` in the package
  `required` list.
- [x] Run `node scripts/qa.cjs` on a quiet tree. Return each failure to the owner of the file it
  names; rerun until exit 0.

## Wave 2

### W4 Scaffold wiring (size S; after W1, W2 and W7)

Owns `skill/scripts/film-project-core.cjs` and `tests/film-project.test.cjs`.

- [x] Copy `lib/audio-events.js` and `lib/instrument-chrome.css` in `film scaffold`. In the generated
  `index.html`: link the chrome before the film's own `<style>`; load `audio-events.js`; declare one
  `STYLE` table and apply it to the `--fk-` custom properties; add the commented `lib/score-grid.js`
  line beside the commented `<audio>` line.
- [x] Add `CALLS` skeletons for the six instrument ids, using `FilmAudio` for `hits` and `STYLE` for
  colours.
- [x] Change the `sound.md` note to the `Section` column and the header for BPM, bar length and the
  start of bar 1; add the music-driven review section to the `qa.md` note; add one line to `FILM.md`.
- [x] Update the pinned lists at the three places (lines 47, 249, 293): the scaffold file list and
  the two `scriptFiles` expectations (the chrome is not a script; `lib/audio-events.js` is).
- [x] Test: every `CALLS` key is a registry id; the scaffolded storyboard passes the gate; the page
  links the chrome and the kit scripts; the style table is applied and its literals are what the
  calls receive; the source scan of the scaffolded project reports nothing.
- Proves: the scaffold, at the gate. Does not prove that the page runs in HyperFrames; whether
  `hyperframes lint` and `check` accept a local `<link rel="stylesheet">` is unverified, and inlining
  the chrome into `<style>` is the fallback.

### W5 Golden case and eval (size L; after W1, W2 and W7)

Owns everything under `skill/evals/film/music-driven/`, `skill/evals/film/film-benchmark.json`,
`skill/evals/film/README.md` and `tests/film-timeline-eval.test.cjs`.

- [x] `storyboard.json` from `design.md` 7, passing `checkStoryboard` with no finding.
- [x] `score.strudel.js`, the 12-bar pattern, and `score-grid.json` generated by calling
  `summarizeGrid` on the pattern's events, written by a small script kept in the test, not typed.
- [x] `treatment.md`: the treatment, song map and plate briefs, written in the template of
  `design.md` 5 as the worked example, with the style table and per-section grounds.
- [x] `build.js` (UMD, appends the kit calls to a timeline, ends the timeline at 24 s with an
  explicit hold) and `index.html` (chrome classes, its own `STYLE`, every planned hard cut visible:
  a different ground per section, or a flash accent from `hold-then-hit` with `zoom: 1` and
  `shakeFrames: 0`).
- [x] `music-driven-launch` scenario in `film-benchmark.json`, `required: false`, prompt with the
  golden brief, `privateExpectations` that name the kit behaviours; update the scenario count.
- [x] `README.md` for the case and a pointer from `skill/evals/film/README.md`: arms, fields
  recorded, rubric, decision rule, and the list of steps that need HyperFrames and Chrome.
- [x] Tests: the storyboard passes with no finding and no warning; the grid deep-equals
  `summarizeGrid`; the recorded tweens of `build.js` pass `checkTimeline` with no finding; the page
  uses only documented classes and properties; the manifest validates and the brief omits
  `privateExpectations`.
- [x] Local render, outside the test suite: frames from the installed Chrome at 30 fps, encoded
  with ffmpeg against a click-track, then `evaluateFilmRender`. Report the findings, the per-beat
  `changedShare` and the contact sheet to W6. This is Conformance and calibration evidence only.
- Proves: fixture consistency and gate compatibility, at the gate. Does not judge the film.

## Gate 2 (W6, after wave 2)

- [x] Register every file under `evals/film/music-driven/` in the package `required` list.
- [x] Run `node scripts/qa.cjs` on a quiet tree, return failures to their owners, rerun to exit 0.

## Closure (W6)

- [x] Add the `CHANGELOG.md` entry under Unreleased.
- [x] Run `node scripts/qa.cjs` directly (no pipe) and `openspec validate add-music-driven-plate-kit
  --strict`.
- [x] Write this change's `qa.md`: results, the open questions and their answers, the local render
  numbers labelled as Conformance and calibration, and the Visual Acceptance section as pending until
  a full-environment run with a named reviewer is recorded.
- [x] Tick these boxes.

## Pending a full environment (not done by any task above)

- [ ] Render the golden case with Strudel and HyperFrames; run `film check`; record the existing
  evidence fields for both arms.
- [ ] Run the blind pairwise review and record the result and the reviewer in `qa.md`.
- [ ] Recalibrate the review heuristics of `design.md` 6 against the first real render.

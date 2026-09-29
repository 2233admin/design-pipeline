# QA record: add-music-driven-plate-kit

## Conformance (verified)

- `openspec validate add-music-driven-plate-kit --strict`: valid. The two sibling changes
  (`strengthen-film-cue-binding-and-song-map`, `harden-film-frame-determinism`) also validate strict.
- `node scripts/qa.cjs`, run directly with output outside the repository: exit 0 after the final
  edit (bounds wording in `film-score.md`). Earlier gates: Gate 1 exit 0 after wave 1 and
  registration, closure run exit 0 after wave 2 and the golden-case rework.
- Registered: tests `film-kit`, `film-audio-events`, `film-chrome` in `scripts/test-manifest.json`;
  `audio-events.js`, `instrument-chrome.css` and every file under `evals/film/music-driven/`
  (including `regenerate-grid.cjs`) in `skill/references/package-resources.json`.
- Wave workers ran their own scoped tests by explicit file path; those are not formal evidence.
  Only the `qa.cjs` runs above count.
- Audit of the shared `tests/film-project.test.cjs` (overwritten once by W4 from HEAD): the owner of
  the determinism/cue tests compared the file with what it wrote; all cases present, one CDN
  `.min.js` case restored, two assertions changed legitimately (scaffold now ships
  `lib/audio-events.js`).

## Open questions and answers

- Q1 instruments: product or concept objects (decided). Q6 golden case: 24 s product film (decided).
  Q8 neutral chrome ships (decided). Q2 to Q5 and Q7 keep the defaults in `design.md` section 10.

## Local render numbers (Conformance and calibration only, not Visual Acceptance)

Method: installed Chrome 154 headless, GSAP 3.14.2, HyperFrames-style seek, 720 frames at 30 fps,
ffmpeg, audio a rough click-synth of the grid (not a Strudel render), then `evaluateFilmRender`.
Result: gate passed with no finding; planned cuts [2, 10, 14, 20, 22] all detected, none
unplanned (two extra detections are flash-off frames). Before the node-canvas rework the break
plate measured about a third below groove and drop, so rule R5 is only partly met; heuristics R1 to
R6 are uncalibrated. Artifacts are under the workers' temp folder and are not part of the change.

## Visual Acceptance: PENDING

No reviewer has judged the film. The blind before/after protocol in
`skill/evals/film/music-driven/README.md` has not been run. Agents never record acceptance.

## Not verified

No `puppeteer-core`, HyperFrames, `film score` render, or `film check` capture in this
environment; whether `hyperframes lint` and `check` accept `innerText` plus `modifiers` tweens or a
local stylesheet link; a real Strudel render of the golden score (event shapes matched
`@strudel/core` 1.2.6 `queryArc` in a one-off check outside the suite).

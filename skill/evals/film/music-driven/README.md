# Golden case: `canvas-instrument-24s`

A 24 s, 120 BPM, six-plate promotional film for a generic node-canvas app whose concept is that the
canvas is an instrument. It is the fixture and the protocol of the music-driven plate kit
(`references/film-choreography`: six audio-bound instruments, `audio-events.js`, the neutral
`instrument-chrome.css`). It is **not** NERV and copies nothing from the reference video: a cream,
cobalt, near-black and teal look of its own, one ground per section. Every plate shows the canvas
itself: nodes are chrome frames, wires are thin chrome meters (the track is the wire, the bar is
the signal), ports are static dots, the canvas is a faint grid, and the audio events drive the
nodes and the wires.

**What this case is not evidence of.** Nothing here shows that the kit improves the picture. The
fixtures prove consistency and gate compatibility only. A picture is judged by the blind review
below, by a named reviewer, on a full-environment render; until that result is recorded as Visual
Acceptance in the change's `qa.md`, this case and this protocol are not reported as evidence of
improvement. A local render (below) is Conformance and calibration evidence only.

## Files

| File | What it is |
| --- | --- |
| `treatment.md` | the treatment, style-bible seed and six plate briefs, the worked example of the template |
| `sound.md` | the song map (`Beat id`, `Window (s)`, `Bars`, `Section`, `Music event`, `Motion response`) and the voice selectors |
| `storyboard.json` | six beats, 2 / 8 / 4 / 6 / 2 / 2 s (cadence ratio 4); passes `verify film-storyboard` with no finding, warnings included |
| `score.strudel.js` | the twelve-bar Strudel pattern (one expression) |
| `score-grid.json` | the grid `film score` writes for it: `summarizeGrid` of the pattern's events |
| `regenerate-grid.cjs` | the model of the pattern's events and the script that writes `score-grid.json` from it; the test imports the same model |
| `build.js` | the reference composition build: a UMD function that appends the kit calls to a timeline and ends it at 24 s |
| `index.html` | the composition: chrome classes only, its own `STYLE` table and per-section `GROUND` tables |

`build.js` and `index.html` expect the scaffold's `lib/` next to them (`patterns.js`,
`audio-events.js`, `instrument-chrome.css`, and `score-grid.js` from `film score`). To run them,
copy this folder into a project made by `designer-pipeline film scaffold`, run
`designer-pipeline film score --bpm 120` there (or write `lib/score-grid.js` as
`FilmAudio.setGrid(<score-grid.json>);`), and open `index.html`.

## Fixture provenance

- `score-grid.json` is generated, never typed. `regenerate-grid.cjs` holds a small model of the
  pattern's events (voice, note, gain and slots per bar, row by row) and applies `summarizeGrid`,
  the function `film score` uses. To regenerate after changing the pattern, edit the model to match
  and run `node skill/evals/film/music-driven/regenerate-grid.cjs`, then review the diff.
  `tests/film-timeline-eval.test.cjs` imports the same model and requires the fixture to deep-equal
  its grid; verification is `node scripts/qa.cjs`.
- Strudel cannot run inside the suite (it is AGPL and `film score` installs it on demand), so the
  model stands in for it. When this fixture was written the pattern was evaluated once with
  `@strudel/core` 1.2.6 (`queryArc`, the kernel's own call) in a temporary directory outside the
  repository and its 153 events matched the fixture exactly (sound, note, gain, onset and step
  length). That comparison is not repeated by the suite: whoever changes `score.strudel.js` repeats
  it or renders with `film score`.
- Events are listed in time order (then voice). `film score` lists them in Strudel's own order; the
  adapter sorts, so nothing depends on it.
- Not verified here: that `film score` renders this pattern to audio, that HyperFrames accepts
  `index.html` (a local stylesheet link and `innerText` tweens with `modifiers` are unverified, see
  `references/hyperframes.md`), and the real fonts.

## Protocol: two arms

Compare two skill packages and nothing else. There is no old-patterns control build.

- Arm A: the skill package before the music-driven plate kit.
- Arm B: the skill package with it.
- The same model, the same brief (the scenario `music-driven-launch` in `../film-benchmark.json`,
  `required: false`, so it never blocks the three v1 scenarios), the same machine class, a fresh
  context each. Each arm delivers `storyboard.json`, `timeline.json` (probed with
  `references/film-choreography/timeline-probe.js`) and `out.mp4`.
- Neither arm is given this folder: it is the reference for the reviewer, not a hint.

Run it like the rest of the film benchmark (`../README.md`): `benchmark brief` gives the blind
brief (no `privateExpectations`), `film-eval measure` and `benchmark evaluate` score it. The
scenario's gate score is Conformance only.

## Evidence recorded for both arms

From existing outputs only; no new gate, field or schema:

- storyboard, timeline and render status and findings (both arms must have no errors, or the
  difference is a gate artifact);
- `audio.cutsOnOnset`;
- planned, detected and missed cuts (`plannedCutsSec`, `cuts.detectedSec`, `cuts.missedSec`);
- per-beat `changedShare` and `stillShare`;
- the contact sheet (`evidence/contact-sheet.png`), plus stills at the plate midpoints and one
  drop-cut pair (a frame before, at and after the drop).

## Blind pairwise review

A named reviewer (the user, decided; agents prepare contact sheets and never record acceptance)
watches both films with sound, in a randomised order, without knowing which arm is which, and scores
each criterion from 1 to 5:

1. Audio legibility: can a viewer name which sound drives which motion within three seconds?
2. Section contrast: do intro, groove, build, drop, break and outro look and move differently?
3. Build and drop: does the build accelerate and stop, and does the drop land with impact?
4. Instrument identity and dominance: is each plate's instrument clearly one object, and clearly the largest thing in its plate?
5. Cohesion: do the plates read as one film and one interface?
6. Product comprehension retained: does the viewer still understand what the product does?
7. Polish: type, spacing, edges, timing of details.

Decision rule: arm B is preferred if it scores higher on at least five of the seven criteria **and**
is not worse on criterion 6. Instruments that swamp the product are the main regression risk, which
is why criterion 6 is a guard and not one vote among seven. Record the scores, the order shown and
the reviewer's name in the change's `qa.md` as Visual Acceptance; the gates keep reporting
`creativeAcceptance: "not-assessed"`. Every threshold in the review rules (`product-film-direction.md`,
R1 to R7) is provisional until recalibrated against the first full-environment render.

## Steps that need HyperFrames and Chrome

Not runnable without them, and not run by the suite:

1. `designer-pipeline film score --bpm 120` (Strudel offline render in headless Chrome).
2. `npx hyperframes lint`, `check` and `render` of the composition, then `designer-pipeline film
   check --project-root .` (timeline capture, source scan, render gate, audio gate).
3. Both arms' renders and the blind review.

A local approximation that needs only the installed Chrome, ffmpeg and GSAP is described in
`references/hyperframes.md` (Local browser smoke): it produced the stills and numbers reported with
this change, as Conformance and calibration evidence and not as Visual Acceptance.

## What the local run of this fixture showed

See the change's `qa.md`; the numbers are Conformance and calibration only. Two things to know when
reading this composition: a lane whose last hit is cut off by the window's `until` ends on the
attack, so a hold that follows is not still (the break plate ends its pulses early for that reason,
and a test pins it), and the look is still a floor, not a finished design: flat grounds, outlined
nodes, straight wires and pictures built from rectangles and circles.

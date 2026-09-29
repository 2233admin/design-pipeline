# HyperFrames Route

This is a project-owned summary of the official HyperFrames skill contract. It keeps the pipeline
route usable when the upstream skill tree is absent; the upstream source remains authoritative for
new workflow and runtime details.

- Source: <https://github.com/heygen-com/hyperframes>
- Reviewed revision: `0e4da52c8222b8d18a1211b34f2fb3bd0f7e79ee`
- License: Apache-2.0

## Select the route

Use HyperFrames for HTML-based video, reels, motion graphics, title cards, explainers, captions,
overlays, slideshows, voiceovers, or a Remotion port. Match the deliverable, not a passing mention
of motion or animation. Ordinary UI motion stays on the project's normal motion route.

For a fresh video request, route once:

1. Existing Remotion source: `remotion-to-hyperframes`.
2. Presentation or navigable deck: `slideshow`.
3. Captions on unchanged footage: `embedded-captions`.
4. Designed overlays on unchanged footage: `talking-head-recut`.
5. Beat-driven music video: `music-to-video`.
6. Product or website promotional film/animation: `product-launch-video`.
7. Other short unnarrated motion-first unit: `motion-graphics`.
8. PR explanation: `pr-to-video`.
9. Topic or article explainer: `faceless-explainer`.
10. Otherwise: `general-video`.

For product promotion, apply `references/product-film-direction.md` before choosing a template or
authoring a storyboard, including when the user asks only for an HTML preview. Its reference and
asset study plus sound direction precede film construction. This project-owned
creative contract complements the upstream runtime contract below. Technical checks and creative
review are separate outcomes; ordinary promotional wording is sufficient to activate both.

Existing project state wins over fresh routing. An existing `BRIEF.md`, `hyperframes.json`, or
`STORYBOARD.md` resumes the recorded workflow. An explicit inspect, check, preview, render, publish,
or batch-render request performs only that operation. When the user requests a creative revision,
reassess the recorded storyboard against the product-film contract rather than preserving a failed
structure solely because it already exists.

## Composition contract

- HTML is the source of truth. Timing is declared in `data-*` attributes and media playback is
  owned by HyperFrames.
- A standalone root is directly in `<body>`; a sub-composition root is inside `<template>` and its
  host id, inner composition id, and timeline key must match exactly.
- The root carries a sized box, `data-start="0"`, dimensions, and `data-duration`.
- Register exactly one synchronous `gsap.timeline({ paused: true })` at
  `window.__timelines[compositionId]`. The renderer seeks this timeline frame by frame.
- Keep IDs unique across the assembled page. Put full-screen fills on a full-bleed child, not the
  composition root.

## Determinism and motion

- No `Date.now`, `performance.now`, render-time clocks, unseeded randomness, network dependence,
  input-state dependence, or infinite repeats.
- Do not tween `display`, raw `visibility`, or layout properties such as `top`, `left`, `width`,
  and `height`; use seek-safe transform aliases and the framework's clip lifecycle.
- Do not pair a CSS initial transform with a GSAP tween of the same property.
- Prefer GSAP for most choreography. Use another adapter only when the composition needs Lottie,
  Three.js, Anime.js, CSS keyframes, WAAPI, or TypeGPU, and preserve one render-loop owner.
- Jitter, shake and noise are a pure function of the frame: derive them as `hash(seed, frameIndex)`
  (a seeded generator such as mulberry32 restarted per frame), never from a running random stream
  or the continuous timeline time `t`. The value is then constant across the shutter interval when
  a frame is motion-blurred and identical in preview and export.
- `film check` scans `index.html` and `compositions/*.html` and reports `nondeterministic-source`
  (file and line) for `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame` and
  autoplaying `<video>`/`<audio>` as errors, and `setTimeout`/`setInterval` as warnings. Comments
  and string contents are ignored; a seeded hash passes. Local `<script src>` files inside the
  project are scanned too and reported by their own path (a root-relative `/js/app.js` resolves
  against the project root); network URLs and drive-letter/UNC/`file:` paths are listed as
  unscanned, a local `*.min.js` is not scanned but is listed and warns, and a `src` outside the
  project root or missing warns (`external-script-unscanned`). Runtime-injected scripts are not
  followed.

## Beat author contract

What every beat's code (a choreography call, a block, or hand-written GSAP) must satisfy:

1. Overwrite-only output: a beat sets the state of its own elements and writes nothing else, so
   seeking to any time yields the same frame no matter what ran before.
2. Deterministic in `t`: everything is a tween on the paused timeline at an absolute `at`, or a
   pure function of the seeked time or frame index. No clocks, unseeded randomness, timers or
   autoplay.
3. Palette constants: colors, fonts and sizes come from the constants at the top of the
   composition's `<style>`/script, not literals scattered through beats. A film that uses the
   instrument kit keeps them in one `STYLE` table (below).
4. Where to edit: motion in `index.html`'s script (one commented call per beat, in storyboard
   order); timing and cues in `storyboard.json`; catalog blocks in `compositions/<block>.html`.
   Do not edit `lib/patterns.js` for one film; add a beat call instead.
5. Music-driven beats use the instrument kit and follow its contract below rather than
   hand-written GSAP; a hand-written tween does not inherit what the kit encodes.

## Instrument kit

Six audio-bound instruments live beside the other choreography patterns in
`references/film-choreography/patterns.js` and `registry.json` (`kind: "instrument"`):
`audio-meter`, `event-scope`, `tick-ticker`, `grid-pulse`, `build-countdown`, `hold-then-hit`. Each
takes `hits` (plain `[{ atSec, strength? }]`), an `at` and `until` window in absolute seconds and
returns `until`. Hits come from `FilmAudio` (`references/film-score.md`). The registry lists each
one's options, the chrome classes its markup needs, and the product object it can be; read it
instead of guessing. Call one like any other pattern:
`FilmPatterns["grid-pulse"](tl, { cells, hits, at, until, rest, lit })`. Every instrument is a
product or concept object: the meter is a load, the log is a feed, the cells are jobs, and the
frame header label names it (`references/product-film-direction.md`, Music-driven films).

**Contract.** What the kit does, and what a film must not undo:

- **Property tweens only.** `clipPath`, `backgroundColor`, `color`, `scale`, `x`, `y`, `opacity` and
  `innerText`, configured with `duration`, `ease`, `immediateRender` and `modifiers`. No callbacks
  (`onUpdate`, `onStart`, `onComplete`, `call`), timers, canvas drawing, repeats, delays or layout
  properties. Why no callbacks: whether one fires on a seek depends on the `suppressEvents` value the
  caller of `totalTime` passes, which a composition cannot see (in GSAP 3.14.2, `seek(t)` fires
  neither `onUpdate` nor `call`, while `time`, `totalTime` and `progress` fire `onUpdate`). A property
  tween renders on every seek whatever the caller passes, and the timeline gates see it; a callback
  is not a tween, so neither is true of it.
- **One lane per animated property.** Hits are sorted; a hit less than one frame after the previous
  kept hit, or less than one frame before `until`, is dropped. The attack starts on the hit and
  lasts at least one frame, the release is truncated at the next hit, so tweens of one target and
  property never overlap (`property-conflict`). Give each animated (target, property) one
  instrument; two instruments on the same element and property conflict. A colour and a size of one
  element are separate properties and separate lanes.
  The window end is a lane's last stop, not a reset: a hit closer to `until` than attack plus release
  has its release cut at `until`, and one closer than the attack has its attack cut to `until − hit`
  and no release, so the lane can end at or near the attack peak, unresolved. Keep pulses and travel
  short enough to rest before `until` (for example an `event-scope` `travel` of 0.6 s in a 2-bar
  hold), or end the plate with an explicit reset.
- **`fromTo` with `immediateRender: false`.** Every property tween has explicit start and end, so a
  seek to any time gives the same frame. The countdown is the one exception (below).
- **No trailing `.0` in a number inside a string.** `clip-path: inset(85% 0 0 0)`, not `85.0%`:
  GSAP stopped interpolating a `clipPath` whose end value had a trailing `.0` under a non-linear
  ease and jumped at the end. The kit formats numbers as `String(Number(x.toFixed(3)))`; format your
  own the same way.
- **Literal colours.** `rest`, `lit`, `textColor` and `alert` are literal colours from the style
  table. `var(--fk-accent)` as the start of a `fromTo` was read as transparent, so the kit throws on
  a value that starts with `var(`.
- **Counters are one `to` tween on static markup.** `build-countdown` tweens `innerText` with a
  `modifiers` formatter and there is no start option: the element's static text is the start,
  written the way `format` writes it (`08.00`). A `fromTo` on `innerText` shows its raw start (`8`)
  after a backward seek; a `to` reads the formatted text and renders through the formatter at every
  progress. Give the element `tabular-nums` and a fixed width (the chrome's `fk-readout` does), as
  HyperFrames' guide requires for counters.
- **Seeded choice.** Random-looking choice is `hash(seed, index)` with a seed you pass, so the same
  inputs give the same tweens.
- **One camera owner.** `hold-then-hit` scales and shifts a `.fk-stage` wrapper and flashes a
  `.fk-flash` overlay; do not drive that wrapper with another pattern in the same window, and keep
  other instruments out of `[hit − freeze, hit)` with `FilmAudio.hits`'s `quiet` option. The
  countdown holds explicitly through its freeze.
- **Weight.** Tween count is hits times lanes (436 for the 24 s golden case); keep an instrument to
  at most 24 lanes.

The probe treats `modifiers` as configuration, so a fade-only beat is not hidden behind a counter.

## Instrument chrome and the style table

`references/film-choreography/instrument-chrome.css` is a neutral set of recipes (prefix `fk-`) the
scaffold copies to `lib/instrument-chrome.css` and links before the film's own `<style>`: a frame
with a header, labels, a tick scale, a readout, a meter, a scope, a log, a cell grid, the flash
overlay and the stage wrapper. The registry's `chrome` block lists its custom properties, recipes
and the instrument each serves. Its colour defaults are greys: it is a floor, and a film that keeps
them is monochrome by choice.

The chrome adds no `animation`, `transition`, `@keyframes`, `@import`, `@font-face`, `url(` or
`clip-path`, and no `transform` on the log column, the stage or a cell and no `opacity` on the
flash: those belong to the timeline. Do not add them in the film's own CSS either, and do not give a
GSAP-tweened property an initial CSS value (the instrument sets the rest state in the timeline).

**One style table.** Declare a single `STYLE` table at the top of the composition's script, apply it
to the root, and pass the same literals to the kit calls:

```js
const STYLE = { ink: "#0b0f14", line: "#3a4756", text: "#e8eef5", rest: "#16202b", accent: "#ffb020", alert: "#ff4d3d" };
for (const key in STYLE) document.documentElement.style.setProperty("--fk-" + key, STYLE[key]);
// later: FilmPatterns["grid-pulse"](tl, { cells, hits, at, until, rest: STYLE.rest, lit: STYLE.accent });
```

The palette has one source. Setting only the custom properties leaves the colours the kit tweens at
the film's literals while the CSS shows defaults (observed: a grey frame with green and yellow
cells), and the kit cannot read `var(--fk-accent)` itself. The table is the film's style-bible seed
(`product-film-direction.md`): colours, the three type voices (`font-label`, `font-data`,
`font-display`), `unit`, `stroke` and `radius` are all keys.

**Re-scoping per plate.** A section may give its subtree its own ground with a second table applied to
its own element, `plate.style.setProperty("--fk-ink", GROUND.drop)`, so a hard cut reads as a scene
change (the render gate cannot see a cut between similar dark grounds and reports
`planned-cuts-missing`; the edit workflow met the same dark-to-dark case). Where neighbouring plates
share a ground, cut with a flash accent: `hold-then-hit` with `zoom: 1` and `shakeFrames: 0`; the
drop carries the full impact. Calls for that plate pass the re-scoped literals.

Whether `hyperframes lint` and `check` accept a local `<link rel="stylesheet">` is unverified; if
they do not, inline the file into `<style>` and change nothing else. Generic font families render
differently across machines; a film that needs identical pixels ships its own fonts.

## Local browser smoke

HyperFrames may be unavailable. To see a plate before the gates, without shipping anything: build
the timeline synchronously (an async page that waited on `requestAnimationFrame` printed nothing
under `--dump-dom`) in a page that reads `#t=<seconds>` and seeks with HyperFrames' sequence,
`totalTime(t + 0.001, true)` then `totalTime(t, false)`. Run the installed Chrome:
`chrome --headless=new --disable-gpu --user-data-dir=<temporary directory> --window-size=1920,1080
--virtual-time-budget=4000`, with `--dump-dom` (write results into a `<pre>` and parse the dump in
Node, including the timeline probe's JSON for `verify film-timeline`) or `--screenshot=<file>`.
For a film, launch once per frame and run several in parallel (240 frames took under two minutes,
720 frames five), then encode `ffmpeg -framerate <fps> -i f%04d.png -i <click track or score> -c:v
libx264 -pix_fmt yuv420p …` and run `verify film-render` on the result. Keep this outside the
project: it is Conformance and calibration evidence, never Visual Acceptance, and it does not prove
that HyperFrames renders the page. Visit sampled times in ascending and then shuffled order and
expect the same visual state.

## Production loop

Use the project-pinned CLI from the composition root:

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes preview
npx hyperframes render --quality high --output out.mp4
ffprobe -v error -show_format out.mp4
```

`check` is the final gate for lint, runtime errors, layout, motion assertions, and contrast. For
sub-compositions, snapshot visible midpoints and inspect each mounted scene. Preview is review, not
approval; render only after approval, then verify that the output exists, is non-empty, and has a
plausible duration.

Keep the CLI version pinned for reproducibility. A latest-version upgrade probe may be run before a
render-affecting command, but a dependency bump is a separate, explicit change and must be followed
by `npx hyperframes check`.

# Design

This change adds a creative layer, not a gate. It gives an agent building a scored film four
things it does not have today: a treatment template that turns a song into plates, a small kit of
audio-bound instruments in the existing choreography registry, a neutral chrome that gives those
instruments a shared look and a single palette, and review rules for escalation, negative space and
cut visibility. It also defines a golden case and a before-and-after protocol.

It claims no visual improvement. HyperFrames cannot render a film in this environment. What ran
locally instead (the installed Chrome, ffmpeg, the repository's own probe and gates) gave
Conformance evidence and calibration numbers, section 8. The protocol in section 9 is a procedure a
human runs later, and every threshold in it is provisional.

## 1. What the reference video does, and what carries over

Read: `docs/TREATMENT.md`, `docs/ENGINE.md`, `app/src/scenes/_eva.ts`, `psycho.ts`, `battery.ts`
of github.com/bizarro/evangelion (code MIT per its README). Ideas only, restated in our own words;
no code, text, palette or asset is copied.

| Technique (source) | Disposition | Lands in |
| --- | --- | --- |
| Treatment, then style bible, motion language, song map, one brief per plate (`TREATMENT.md`) | Adopt | section 5 |
| One instrument per section, each the sound made visible (`TREATMENT.md`, `psycho.ts` header) | Adopt, bound to product objects (decided, Q1) | sections 4, 5 |
| Voice to response: kick bounce (`duck`), clap alarm, hats tick, bass mass, vocal accent | Adopt | `film-score.md` voice table, kit |
| Builds accelerate, last beat freezes, drop is a hard cut with flash, zoom and shake, breaks stop pumping | Adopt | rules R2 to R5, `build-countdown`, `hold-then-hit` |
| Countdown as a build integral: a steepening curve plus the running share of kicks, landing on the drop bar (`battery.ts` `drain`) | Adopt, own weights | `build-countdown` |
| Event-locked transients: attack on the hit frame, short decay (`pulse`, `hit`) | Adopt | lane rule, section 4.2 |
| Persistence by age since the event (`psycho.ts` shader) | Adapt | release curve of `event-scope` columns |
| Escalation through colour as well as rate (`battery.ts` `heat`) | Adopt | rule R2, `build-countdown` alert tint |
| Each rare event spawns a discrete object, a log line or callout (`battery.ts` vocal chops) | Adapt | `tick-ticker` rows |
| Frame is a pure function of time, jitter keyed to the frame index (`ENGINE.md`) | Already shipped | `harden-film-frame-determinism`; kit uses `hash(seed, index)` |
| One shared kit file so plates read as one interface (`_eva.ts`) | Adopt | `patterns.js` kit, the chrome and one style table |
| Panel with a header label, tick scales, live readouts, segmented level meters (`_eva.ts`: `panel`, `scale`, `segMeter`, readouts) | Adapt as neutral recipes | chrome, section 4.6 |
| One scene file per parallel author, kit read-only (`ENGINE.md`) | Adopt lightly | plate briefs are self-contained |
| Sweep cursor of one turn per bar; staggered power-on and power-off | Defer | later kit addition; both need linear or stepped motion or entry choreography |
| Real waveform, spectrum, mel, chroma, bass pitch from Demucs stems and a Python analyzer | Exclude from v1 | Q3; no continuous audio data exists in this repository |
| Palette, chamfered header-tab panels, hex grids, hazard stripes, seven-segment digit faces, bilingual captions, condensed title serif, CRT scanline pass, NERV, MAGI and Angel iconography | Exclude | NERV visual language |
| three.js and GLSL engine, GPU spectrum textures, 4K scale, sub-frame shutter accumulation | Exclude | capture and render belong to HyperFrames |
| Sixteen plates at 133 BPM over 184 s | Exclude | content, not technique |

## 2. Constraints found in the current code and in HyperFrames

Each one shaped a decision below.

- `beat-fade-only` is an error when every property an action beat animates is in `opacity`,
  `autoAlpha`, `scale`, `scaleX`, `scaleY`. A meter that only scales fails.
- `property-conflict` is an error when two non-driver tweens on one target and property overlap by
  more than 1 ms.
- `linear-motion` warns on a tween over 0.3 s with linear easing that moves position, scale or
  rotation.
- `uniform-cadence` is an error for four or more beats whose longest is under three times the
  shortest. The plate windows of the reference song map (6.79 s to 18.0 s) give 2.65, so a
  faithful copy of that structure would fail it.
- `render-static-beat` is an error for an action beat of 0.5 s or more that renders frozen.
- `planned-cuts-missing` is an error when more than half of the planned hard and match cuts are not
  found by the scene detector (threshold 0.3). The edit workflow already found dark-to-dark cuts
  invisible and fixed them with a `flash`.
- `film check` scans `index.html`, `compositions/*.html` and local scripts for clocks, unseeded
  randomness, timers and autoplay.
- `score-grid.json` (`design-pipeline.score-grid.v1`) holds `beats` and `events` with `atSec`,
  `durSec`, `sound`, `note`, `gain`. It is symbolic, from Strudel `queryArc`. Events are not
  labelled kick or hat. Nothing in the repository produces envelopes, bands or a waveform.
- `film-edit analyze` requires a footage directory, so music-only analysis does not exist.
- The registry is read only for pattern ids; the storyboard gate looks up `choreography` there.
  A test compares registry ids with the exports of `patterns.js`. No schema validates the registry.
- Tests pin the scaffold library list (`film-project.test.cjs` lines 47, 249, 293) and the
  benchmark scenario count (`film-timeline-eval.test.cjs` line 95).
- The scaffold pins GSAP 3.14.2.
- HyperFrames' GSAP adapter (`packages/core/src/runtime/adapters/gsap.ts`) seeks with
  `totalTime(t + 0.001, true)` and then `totalTime(t, suppressEvents)`; `suppressEvents` is true only
  when its caller says so. Its GSAP guide asks for `immediateRender: false` on later tweens of the
  same property and element, prefers `fromTo` for seek-back safety, documents `innerText` counters
  with a mandatory `tabular-nums` and a fixed-width container, and lists `clipPath` as a legitimate
  target (its property list is a denylist). `hyperframes.md` forbids a CSS initial transform paired
  with a GSAP tween of the same property.
- HyperFrames' own audio guidance says never to add equalizer bars, spectrum analyzers or waveform
  displays as decoration and to let the content decide what audio drives. It also documents a
  Canvas visualizer built from precomputed `audio-data.json` and one `tl.call` per frame. That route
  works only when callbacks run, and it is invisible to the timeline gate.

## 3. Decisions taken

These are reversible and low in blast radius; anything that changes scope or taste is in section 10.

1. **No new gate, code or schema.** The layer is patterns, an adapter, a stylesheet, documents,
   scaffold notes and fixtures. Rules are review guidance. The earlier changes already shipped the
   guardrails; the remaining gap is the picture.
2. **The kit tweens properties only.** Whether an `onUpdate` or a `call` fires depends on the
   `suppressEvents` value HyperFrames' caller passes, which is not visible from here (Node, GSAP
   3.14.2: `seek(t)` fires neither, `time`, `totalTime` and `progress` fire `onUpdate`). A property
   tween renders on every seek whatever the caller passes, and the gates see it, since a callback is
   not a tween. Counters are `innerText` tweens with a `modifiers` formatter, as HyperFrames
   documents.
3. **Every tween is a `fromTo` with explicit endpoints and `immediateRender: false`; one lane per
   animated property.** Each (target, property set) is a sequence of attacks and releases that never
   overlap: the attack starts on the hit and lasts at least one frame, the release is truncated at
   the next hit. Hits are sorted; a hit less than one frame after the previous kept hit, or less
   than one frame before `until`, is dropped. Evidence in section 8. The one exception is the
   countdown, which is a single `to` tween (section 4.3).
4. **Hits are plain data.** Patterns take `[{ atSec, strength? }]` and an `at`/`until` window and
   return `until`. They never read the grid schema, so any source that can produce times can feed
   them. A separate module, `audio-events.js` (global `FilmAudio`), turns a score grid or an
   edit-analysis `music` block into hits. It is not a pattern, so the registry parity test keeps its
   meaning; the registry documents it under `helpers`.
5. **The composition reads data synchronously.** `film score` also writes `lib/score-grid.js`
   (`FilmAudio.setGrid(<the grid JSON>)`), because the timeline must be built in one synchronous
   pass. The scaffold loads `audio-events.js` before `score-grid.js`, so `FilmAudio` is the only
   data entry and no second global exists. `score-grid.json` stays the source for
   `checkGridAlignment`. `FilmAudio` throws, naming `designer-pipeline film score`, when no grid
   was set.
6. **Roles are selectors, not labels.** A Strudel voice is chosen by `sound`, note range,
   duration, gain and window. Read from the template source, not from a render, `punchy-launch`
   separates on paper: a `sine` at `c1` is the kick-like voice, `white` at gain 0.25 the clap-like
   one, `white*8` at gain 0.12 the hat-like one, sawtooth chord notes the long pads. `tech-pulse`
   has a square eighth-note pulse and 16th hats at gain 0.08 to 0.1 and no clap; `calm-build` has
   no drums. `film-score.md` documents a selector row per template.
7. **The kit ships a neutral chrome and one style table (decided, Q8).** The chrome is a CSS file
   whose palette, type and metrics are custom properties; the film's style bible overrides them from
   one table that also supplies every colour the kit tweens (section 4.6). Neutral means monochrome
   defaults and none of the reference's look.
8. **Colour options are literals, counters are one `to` tween, numbers have no trailing zeros.**
   Each came from a failure observed in a real browser (section 8.2).

## 4. The kit

### 4.1 Contract shared by all six

- Options: `at` and `until` (absolute seconds), `hits`, `fps` (default 30), plus the ones below.
  Missing required options throw, like the existing patterns.
- Tweens use only `clipPath`, `backgroundColor`, `color`, `scale`, `x`, `y`, `opacity`, `innerText`,
  with `duration`, `ease`, `immediateRender`, `modifiers`. No callbacks, repeats, delays or layout
  properties. Every tween has an absolute position as its last argument. Every property tween is a
  `fromTo` with `immediateRender: false`, except the countdown.
- A string that carries numbers is built from numbers formatted with `String(Number(x.toFixed(3)))`,
  so `85`, never `85.0`.
- A colour option is a literal colour. A value that begins with `var(` throws, with the fix.
- Pseudo-random choice is `hash(seed, index)` with a caller seed; identical inputs give identical
  tweens.
- The timeline probe treats `modifiers` as configuration. Today it lists `modifiers` as an animated
  property (observed, section 8.3), which would hide a fade-only beat behind a counter.

### 4.2 Lane rule

For hits h1 < h2 < … in `[at, until)`: sort them, then drop any hit under `1/fps` after the previous
kept hit or before `until`; it would not be visible at the render rate. Then attack_i = min(attack,
h_(i+1) − h_i), starting at h_i, and release_i = min(release, h_(i+1) − (h_i + attack_i)), starting
at h_i + attack_i, and omitted when it is not positive. The last hit uses `until` as the next hit.
`attack` below one frame throws. A rest state is written with a `set` at `at`. Attack and release
are `fromTo` tweens: the attack runs from the rest values to the peak values and the release from
the peak values back to rest, so a jump to any time gives the same frame.

### 4.3 The six patterns

| id | Reads | Animates | Behaviour | Markup (chrome classes) | Product object it can be |
| --- | --- | --- | --- | --- | --- |
| `audio-meter` | hits | `clipPath` on one bar | bounce: rest at `floor`, attack to `floor + (1 − floor)·strength`, release back; `axis` y rises from the bottom, x fills from the left | `.fk-meter > .fk-meter__track > .fk-meter__bar`; target is the bar | throughput, load, capacity |
| `event-scope` | hits | `clipPath` on N column bars | each column is an `audio-meter` lane fed the hits shifted by `j·travel/N` and scaled by `decay^j`, so a pulse travels across; not a waveform | `.fk-scope > .fk-scope__col` × N | activity or heartbeat of a process |
| `tick-ticker` | hits | `y` of one column of rows | one row per hit, a step of at most `step` (default 0.06 s), truncated at the next hit; throws if hits exceed `rows` | `.fk-log > .fk-log__col > .fk-log__row` × M; target is the column; `rowPx` equals `--fk-row` | log, feed, event stream |
| `grid-pulse` | hits | `backgroundColor`, `scale` on cells | per hit, the `perHit` fraction of cells with the lowest `hash(seed + hitIndex, cellIndex)` light and release; one lane per cell | `.fk-cells > .fk-cell` × N | job, node or cell matrix |
| `build-countdown` | hits (optional) | `innerText` on one element, optionally `color` | one `to` tween with a custom ease and a `modifiers` formatter. The share burned is `(1 − bite)·p^curve + bite·s(t)`, where `p` is progress through the window and `s` is the running, normalised sum of the hits, so every hit visibly bites; the value is the start value times one minus the share burned. Monotone, zero from `until − freeze`, then an explicit no-op hold like `camera-follow`. With `textColor` and `alert`, a `fromTo` on `color` over the same window | `.fk-readout--display > .fk-readout__value`; its static text is the start value written the way `format` writes it (`08.00`), and GSAP reads the start from it | queue, deadline, progress |
| `hold-then-hit` | a cue time | `opacity` on an overlay, `scale`, `x`, `y` on a wrapper | overlay set to 0 at time 0; flash of one frame, zoom punch `zoom` (default 1.06), shake of `shakeFrames` one-frame steps from `hash(seed, k)` (each step starts where the last ended); returns `hit + 0.4`. With `zoom: 1` and `shakeFrames: 0` it is a flash-only accent. It does not cancel other tweens; the caller keeps other instruments out of `[hit − freeze, hit)` with the adapter's `quiet` option | `.fk-flash` and `.fk-stage` (a wrapper that no camera pattern drives in the same window) | the moment the product ships or completes |

Why the countdown is a `to`: a `fromTo` re-applies its raw start value (`8`, not `08.00`) whenever the
timeline is rewound before the window, because the start is written without the modifier (section
8.2); a `to` reads the formatted static text once and renders through the modifier at every progress
including 0.

Options, `*` required, defaults after the name. These names and the hit shape are the interface the
other workers build against; anything not listed is the worker's choice.

- `audio-meter`: `target*`, `hits*`, `at*`, `until*`, `axis` `y`, `floor` 0.15, `attack` 0.05,
  `release` 0.35, `attackEase` `power4.out`, `releaseEase` `power2.in`, `fps` 30.
- `event-scope`: `columns*` (a selector list), `hits*`, `at*`, `until*`, `travel` 1.2 s, `decay`
  0.9, `floor` 0.1, `attack` 0.05, `release` 0.25, `fps`.
- `tick-ticker`: `target*`, `hits*`, `at*`, `until*`, `rowPx*`, `rows`, `step` 0.06, `fps`.
- `grid-pulse`: `cells*`, `hits*`, `at*`, `until*`, `rest*`, `lit*` (literal colours from the style
  table), `perHit` 0.25, `seed` 1, `attack` 0.04, `release` 0.3, `peakScale` 1.12, `fps`.
- `build-countdown`: `target*`, `at*`, `until*`, `format*` (number to text), `hits` (none), `freeze`
  0.5, `curve` 1.9, `bite` 0.28, `textColor` and `alert` (literals, given together), `fps`. There is
  no start option; the start is the element's static text.
- `hold-then-hit`: `hit*`, `flash*`, `target*`, `freeze` 0.5, `zoom` 1.06, `shake` 12 px,
  `shakeFrames` 8, `seed` 1, `fps`; its window starts at `hit − freeze`.

Weights `curve` and `bite` are tunable; the reference video's split is not a rule. Tween counts
follow hits × lanes; the golden composition is 436 tweens for 24 s. The guide recommends at most 24
lanes per instrument.

### 4.4 `FilmAudio`

`fromScoreGrid(grid)`, `fromAnalysis(music)`, `hits(audio, { sound, midiMin, midiMax, durMin,
durMax, gainMin, from, to, quiet })` returning `[{ atSec, strength }]` with strength normalised to
the selection's largest gain, `beats(audio, { from, to, every })`, `bar(audio, k)` with 1-based bar
numbers like the song map, and `hash(seed, index)`. Note names and MIDI numbers are both accepted.
These names are the interface; the contract is pure functions, no clocks or randomness, and a
thrown error with a fix on bad input. `fromAnalysis` yields beats and bars but no events, so only
beat-locked components have data for a user-supplied track (Q4).

### 4.5 Registry documentation

Instrument entries add `kind: "instrument"`, `animates`, `audio`, `markup`, `productRole` to the
existing fields, with `grammar: ["combination", "product-demonstration"]`, `transformation:
"data-update"` (`state-change` for `hold-then-hit`) and `handoff: "continuation"` (`hard-cut` for
`hold-then-hit`). The adapter is a top-level `helpers` entry and the chrome a top-level `chrome`
entry (section 4.6). A test asserts every documentation field and that each name in `required` makes
the pattern throw when missing, so the documentation cannot drift from the code.

### 4.6 Instrument chrome

The instruments define behaviour. Without a look, a plate that answers the music still looks bare;
the local render (section 8.4) shows how bare. The chrome is the smallest look that makes plates
read as one interface, and it is written so that a style bible replaces all of it.

Files: `skill/references/film-choreography/instrument-chrome.css` (owner W7) and the registry's
top-level `chrome` block (owner W1, from this section). The scaffold copies the CSS to
`lib/instrument-chrome.css` and links it before the film's own `<style>`, so the film's overrides win
by order. It is original work; its recipe list adapts ideas only.

**Custom properties**, the override API (prefix `--fk-`):

| Property | Role | Default |
| --- | --- | --- |
| `--fk-ink` | ground and surface fill | `#111111` |
| `--fk-line` | hairlines, ticks, borders | `#707070` |
| `--fk-text` | labels, readouts, flash | `#ebebeb` |
| `--fk-rest` | unlit cell, meter track | `#1e1e1e` |
| `--fk-accent` | lit and active fill | `#f5f5f5` |
| `--fk-alert` | escalation tint | `#ffffff` |
| `--fk-font-label` | label voice | `system-ui, sans-serif` |
| `--fk-font-data` | data and log voice | `ui-monospace, Consolas, monospace` |
| `--fk-font-display` | hero readout voice | `var(--fk-font-data)` |
| `--fk-unit` | base length | `8px` |
| `--fk-stroke` | hairline weight | `2px` |
| `--fk-radius` | corner radius | `2px` |
| `--fk-row` | log row height, equals `rowPx` | `24px` |
| `--fk-cols` | columns of a cell grid, per instance | `8` |

The six colour defaults are greys, so the chrome has no look of its own and a film that keeps them
is monochrome by choice. Label, data and display sizes default to 2.5, 3 and 16 units (20, 24 and
128 px at 1920 by 1080): HyperFrames' counter guidance asks for hero labels and mandatory
`tabular-nums`, and the spike's 14 px labels read as noise in a frame.

**Recipes** (prefix `fk-`), each documented in `chrome.recipes` with its role and the instrument it
serves:

| Class | Role | Serves |
| --- | --- | --- |
| `fk-frame`, `fk-frame__head`, `fk-frame__body` | hairline rectangle with a header strip; the head label names the product or concept object | every instrument |
| `fk-label`, `fk-label--dim`, `fk-label--display` | tracked uppercase label voice, a dim variant, a large variant for hero readouts | annotation |
| `fk-ticks`, `fk-ticks--x` | tick scale, minor and major, from `repeating-linear-gradient` | `audio-meter` |
| `fk-readout`, `fk-readout__value`, `fk-readout--display` | value with tabular numerals and a fixed minimum width; display size for a hero counter | `build-countdown` |
| `fk-meter`, `fk-meter__track`, `fk-meter__bar`, `fk-meter--segmented`, `fk-meter--x` | level meter; the bar is the tween target; the segment mask sits on the track; a horizontal variant | `audio-meter` |
| `fk-scope`, `fk-scope__col` | row of thin bars | `event-scope` |
| `fk-log`, `fk-log__col`, `fk-log__row` | clipped window, scrolling column, fixed-height rows | `tick-ticker` |
| `fk-cells`, `fk-cell` | grid of cells | `grid-pulse` |
| `fk-flash` | full-bleed overlay | `hold-then-hit` |
| `fk-stage` | wrapper that scales and shifts | `hold-then-hit` |

**Constraints**, each tested against the CSS text by W7, each from a failure mode above:

1. No `animation`, `transition`, `@keyframes`, `@import`, `@font-face` or `url(`: a CSS animation is
   a second time source outside the seeked timeline, and a font or image is an external dependency.
2. No `clip-path` anywhere, and no `transform` on `.fk-log__col`, `.fk-stage` or `.fk-cell`, and no
   `opacity` on `.fk-flash`: those are the properties the instruments tween, and HyperFrames forbids
   pairing a CSS initial value with a tween of the same property. The overlay's rest state is written
   by `hold-then-hit` at time 0.
3. Gradients only as `repeating-linear-gradient` (the tick scale and the segment mask): no smooth
   fills, no decoration.
4. Every colour default is achromatic (red, green and blue equal).
5. The declared custom properties equal the documented set, and every `var(--fk-*)` names one.

**One style table.** A composition declares one `STYLE` table at the top of its script. It applies the
table to the root with `document.documentElement.style.setProperty("--fk-" + key, value)` for each
entry, and it passes the same literals to the kit calls (`rest`, `lit`, `textColor`, `alert`). The
palette therefore has one source. A section may re-scope the slots for its subtree with a second
table applied to its own element, which is how each section gets its own ground (rule R7). The kit
cannot take `var(--fk-accent)` directly, because GSAP read a `var()` start value as transparent
(section 8.2), which is why the guard throws.

Observed drift hazard: with the custom properties left at their defaults and the tween colours taken
from a film palette, the frame was grey while the cells were the film's green and yellow. The single
table exists to make that impossible by construction.

**Kept out**, so that the chrome stays neutral: chamfered or cut-corner panels, hex grids, hazard
stripes, scanlines and glow, seven-segment faces, bilingual captions, icons, any shipped font, any
colour default with a hue. Tests can check the last four constructs listed in constraints 1 to 4; the
rest are review items.

**Scaffold.** `film scaffold` links the CSS with `<link rel="stylesheet" href="lib/instrument-chrome.css">`.
Whether `hyperframes lint` and `check` accept a local stylesheet link is unverified; inlining the
file into `<style>` is the fallback and needs no other change. Font availability is a rendering
environment dependency: the chrome names generic families, and a film that needs identical pixels on
every machine ships its own fonts.

## 5. Treatment, song map, plate briefs

No new artifact and no schema change. The four intake questions stay; the track goes under
"assets", and measured tempo facts go in `sound.md`'s header.

| Stage | Artifact | Addition |
| --- | --- | --- |
| concepts | `concepts.md` | Each card for a music-led film states its instrument premise. After the pick, the chosen card is extended with `## Treatment` |
| plan | `concepts.md` | Treatment fields: premise; instrument arc as a table (plate, instrument, the product object it is, the audio role that drives it); style-bible seed (the six chrome colour slots and any extra colour the film names, three type voices, `--fk-unit`, `--fk-stroke`, `--fk-radius`, a ground per section, and a **must-not-copy** line taken from `reference.md`); motion language (voice to response table); escalation and negative space |
| plan | `sound.md` | Song map gains a `Section` column: intro, groove, build, drop, break, outro. A header states BPM, bar length and the start of bar 1, so a window is `(bar − 1) × bar length` |
| plan | `storyboard.json` | One beat per plate; the brief's keys map onto existing fields (below) |
| build | `index.html` | The `STYLE` table, then one commented kit call per beat |
| review | `qa.md` | A music-driven review section with rules R1 to R7 |

Plate brief keys and where each lands:

| Brief key | Storyboard field |
| --- | --- |
| Instrument (the dominant element) | `subject` |
| What it does to the sound, one verb per element | `productAction` |
| State at start and end | `transformation` (`data-update`, `state-change` or `morph`) with `from` and `to` |
| Kit ids used | `motion` |
| Primary kit id | `choreography` |
| Hits it answers | `soundCues` |
| Freeze before the drop | `holdSec` |
| Escalation, negative-space or cut-accent line | `note` |

A brief never restates a number the storyboard owns; it names the beat id. Every element has one
verb bound to one audio role, echoing the upstream doctrine that an element without a verb is not
designed. Briefs are self-contained, so plates can be built independently.

## 6. Review rules

Reported only in `qa.md`'s creative review. They add no finding code, change no gate status, leave
`creativeAcceptance: "not-assessed"`, and do not enter any `film-eval` score. Each names the
existing field to read; thresholds are review heuristics. Where a number appears it comes from the
local calibration render of section 8.4 (one throwaway layout, click-track audio) and is a starting
point, not a threshold.

| Rule | Read | Looks right |
| --- | --- | --- |
| R1 One dominant instrument per plate, at most three supporting layers, each bound to a different audio role; the dominant one is large | the beat's `motion` list; the contact-sheet frame | one element is clearly the largest and brightest, about a third of the frame or more; layers answer different sounds. The calibration render fails the size test: small frames on a large empty ground |
| R2 Builds accelerate through rate, size or colour | beat lengths under the `riser` cue; the instrument's hit rate | the build is shorter than the groove and its rate rises; at least two of the three channels change |
| R3 The last beat before a drop holds still | `holdSec` on the preceding beat; the span itself (`stillShare` is film-wide, a sanity check only) | `holdSec` of at least 0.3 s, and the frame is still for that span |
| R4 A drop is a hard cut with impact | handoff kind; `plannedCutsSec`; `cuts.missedSec`; `audio.cutsOnOnset` | `hard-cut` on the drop cue's downbeat, the cut is detected, the full impact (flash, zoom, shake) lands with it |
| R5 A break stops pumping without freezing | per-beat `changedShare` of the break against the groove and drop, from a render without cut accents | clearly lower than both, and above the frozen floor of 0.02%. Calibration: 2.4% against 5.4% and 5.2% |
| R6 Sections differ in density | per-beat `changedShare` grouped by section, and the contact sheet | the drop above the break. Calibration: 5.2% against 2.4%, groove 5.4%, build 2.1%, intro 1.5%; "several times" was not observed, so judge with the contact sheet |
| R7 Every planned hard cut is visible to the scene detector | `cuts.missedSec`; the contact sheet | each section has its own ground, or the cut carries a flash accent (`hold-then-hit` with `zoom: 1` and `shakeFrames: 0`). This is also a Conformance finding: the render gate reports `planned-cuts-missing`. Calibration: 4 of 5 cuts missed on similar dark plates, none missed with accents |

Motion sampling is 10 fps at 160 by 90, so R5 and R6 read beat means, not single hits. Per-beat
`changedShare` is dominated by cut accents when they are on (section 8.4), so R5 and R6 are read
from an accent-free render or from the contact sheet. Audio legibility, whether a viewer can name
which sound drives which motion within three seconds, is judged by watching with sound.
Instruments are product or concept objects: a plate whose instrument represents nothing the
product or concept has is a revision finding, and the frame header label is where it says what it is.

## 7. Golden case

`canvas-instrument-24s`: a generic node-canvas app, the product of the existing `canvas-launch`
benchmark scenario. Concept: the canvas is an instrument. 120 BPM, bar 2.0 s, twelve bars. The
plate lengths are 2, 8, 4, 6, 2 and 2 s, a ratio of 4. The shape was chosen to clear
`uniform-cadence`; the gate shaped the case, and Q5 is the honest place to change that.

| Plate (beat id) | Bars, window | Section | Music | Instrument = product object | Audio role | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| `type-on-pad` | 1, 0 to 2 s | intro | pads only | `tick-ticker` = the prompt node's log | beat ticks | open |
| `cells-on-kick` | 2 to 5, 2 to 10 s | groove | kick, clap, hats | `grid-pulse` = generation cells; `audio-meter` = queue load; `tick-ticker` = job log | kick, kick, hats | hard-cut |
| `countdown-build` | 6 to 7, 10 to 14 s | build | snare roll 8ths then 16ths, last beat silent | `build-countdown` = render queue timer; `tick-ticker` | snare roll | hard-cut, `holdSec` 0.5 |
| `drop-impact` | 8 to 10, 14 to 20 s | drop | full drums and bass | `hold-then-hit` on the storyboard strip; two `audio-meter` = throughput | drop, kick, clap | hard-cut |
| `break-settle` | 11, 20 to 22 s | break | drums out, bass swell | `event-scope` = process trace, with a slow ambient drift | bass | hard-cut, `holdSec` 0.6 |
| `brand` | 12, 22 to 24 s | outro | one stab | logo over the strip | accent | hard-cut, `holdSec` 0.6 |

Cues: `music-in` entry 0, `groove-in` downbeat 2, `build-riser` riser 10, `drop-1` impact 14,
`break-in` silence 20, `brand-hit` accent 22, `music-out` exit 24, each bound to the beat that
starts on it. Every cut sits on a multiple of 0.5 s, so `checkGridAlignment` holds (observed).

Look: the chrome recipes, a `STYLE` table of the film's own, not the chrome defaults and not the
reference palette, and a ground per section so that a hard cut reads as a scene change (R7). Where
two neighbouring plates would share a ground, the cut carries a flash accent; the drop carries the
full impact. The plates are `.clip` elements with `data-start` and `data-duration`, so HyperFrames
owns their visibility and an instrument's rest state is not shown before its window. The closing
rule drifts through the last hold and ends the timeline at 24 s; the timeline gate compares the
timeline's end with the storyboard, and an empty padding tween is what HyperFrames' guide advises
against.

Files under `skill/evals/film/music-driven/`: `README.md` (protocol), `storyboard.json`,
`score-grid.json` (generated by calling `summarizeGrid`, never typed, with a test that fails on
drift), `score.strudel.js`, `treatment.md` (treatment, song map, plate briefs), `build.js` (a UMD
module that appends the kit calls to a timeline) and `index.html` (chrome classes, the style table,
the call to `build`). Rendering `score.strudel.js` and `index.html` needs Strudel and HyperFrames.

## 8. Spike evidence

Everything here ran before this document was written and is throwaway, outside the repository.

### 8.1 Gates on a recorder timeline (Node)

A recorder timeline, the real `probe()`, the real `checkStoryboard` and `checkTimeline`, sketches of
the six patterns on the golden case, 12 bars at 120 BPM. The storyboard of section 7 passed with no
finding (`cadenceRatio` 4). The kit build (410 tweens) passed the timeline gate. Hats at 0.25 s with
a fixed 0.35 s release gave `property-conflict`; a naive grid pulse of 12 of 24 cells per hat gave 8
of them, for example `#cell-2 backgroundColor is driven by two tweens between 2.25s and 2.34s`. The
lane rule removes them.

### 8.2 Real browser: Chrome 154 headless, GSAP 3.14.2, HyperFrames' seek sequence

A page loaded with `--dump-dom`, seeking with `totalTime(t + 0.001, true)` then `totalTime(t, false)`
and reading the DOM.

- **Trailing `.0` stops interpolation.** `clipPath` interpolates for `inset(85% …)` to `inset(17% …)`,
  for fractional values (`85.5` to `17.25`), for polygons and for the repository's own `ui-demo` and
  `reveal-in-context` strings. Twelve of 60 combinations of format, duration and ease jumped at the
  end instead; every one had an end number written with a trailing `.0` (`17.0%`) and a non-linear
  ease (`power4.out`). My first sketch built its strings with `toFixed(1)`. Hence the number
  formatter of 4.1.
- **`var()` colours.** As the end value of a `to` tween, `var(--fk-accent)` interpolated (the value at
  eased 0.5 was the exact 75% blend). As the start value of a `fromTo`, GSAP read it as transparent:
  a cell went from `rgba(0,0,0,0)`, and its release ended at `rgba(0,0,0,0)`. Hence literal colours
  and the guard.
- **Counters.** A `fromTo` on `innerText` with `modifiers` showed the raw start value (`8`) after a
  backward seek, whether the start was written as a number or as the formatted string (`08.00`). A
  `to` tween on `innerText` with the formatted static text gave `08.00`, `07.54`, `04.73`, `00.31`,
  `00.00` at 10, 10.5, 12, 13.4 and 13.5 s and the same text before the window after any rewind.
- **Seek-order independence.** Fourteen times between 2.005 and 14.4 s, visited in ascending and then
  in shuffled order: with the `to` countdown, no difference in normalised visual state (computed
  clip path, the background and transform of all 32 cells, the ticker, flash and stage transforms,
  the timer text and colour). With the `fromTo` countdown, six differences, all the timer text.
- **Screenshots.** The chrome recipes (frame, label, ticks, readout, segmented meter, cells, log)
  rendered as intended with the monochrome defaults and with a film palette; the build frame at
  12.9 s showed an alert-tinted `02.05` and the drop frame at 14.03 s a white-out flash with the zoom
  and shake offset, the interface still legible. The drift hazard of 4.6 appeared here.
- **HyperFrames source.** The adapter, guide and recipes listed in section 2 were read, not run.

### 8.3 The golden composition through the real probe and gates

The six plates built with the final kit shapes, run in Chrome through the repository's real
`timeline-probe.js`, and the JSON given to `checkTimeline`, `checkStoryboard`, `checkGridAlignment`
and `scanCompositionSource`. Final result: 436 tweens, 24 s, storyboard passed with no finding,
timeline passed with no finding, grid alignment passed, source scan with no
`nondeterministic-source`. Three defects surfaced on the way, each now a requirement:

- Two coincident hits in one meter, from an unsorted, doubled hit list, gave `property-conflict` at
  14 s and again at 14.5 s until the hits were sorted and the merge compared with the previous kept
  hit rather than the previous input.
- The timeline ended at 22.8 s against the storyboard's 24 s (`duration-mismatch`) until the last plate
  ended the timeline.
- `modifiers` appeared among the animated properties of the countdown beat.

### 8.4 Local render and the real render gate

The same composition on a throwaway layout (frames small on a large ground, 14 px labels, synthetic
click-track score), one Chrome launch per frame, ffmpeg, then `evaluateFilmRender`.

| Variant | Gate | Per-beat `changedShare` % (intro, groove, build, drop, break, brand) |
| --- | --- | --- |
| 10 fps, no cut accents | failed: `planned-cuts-missing`, 4 of 5 cuts not found | 1.46, 5.44, 2.15, 5.24, 2.37, 0.22 |
| 10 fps, break plate with a slow drift | same finding | 1.46, 5.44, 2.15, 5.24, 3.70, 0.22 |
| 30 fps, flash accents at 2, 10, 20, 22 and full impact at 14, drift | passed, no finding; every cut detected (each flash as an on and an off event); `cutsOnOnset` 0.8; `stillShare` 0.138 | 5.51, 10.03, 9.00, 6.06, 18.00, 10.49 |

What it says:

- No `render-static-beat` in any variant: the break plate moved 2.4% of pixels per step against a 0.02%
  floor, because the scope's columns are large. A negative-space plate is not automatically flagged.
- Cuts between plates on similar dark grounds are invisible to the scene detector. That is the
  edit workflow's dark-to-dark finding again, and it is why R7 exists.
- Cut accents dominate per-beat `changedShare` (10.03 against 5.44 for the same groove), so density
  is read from an accent-free render or the contact sheet. Numeric thresholds stay out (Q2).
- The contact sheet shows small frames floating in a large empty ground: the chrome is a floor, and
  R1 asks the treatment to compose the dominant instrument at scale.

The audio and composition gates were not run: the click-track has no loudness target and the layout
gate needs the HyperFrames capture.

### 8.5 Local method

For a worker who needs evidence before the gate. Build the timeline synchronously in a page that
seeks to `#t=<seconds>` with HyperFrames' sequence. `chrome.exe --headless=new --disable-gpu
--user-data-dir=<temporary> --window-size=1920,1080 --virtual-time-budget=4000` with `--dump-dom`
(write results into a `<pre>` and parse the dump in Node, including the probe's JSON for
`checkTimeline`) or `--screenshot=<file>`. For a film, one launch per frame, six in parallel: 240
frames took 1 min 47 s and 720 frames 5 min 12 s here. Then
`ffmpeg -framerate <fps> -i f%04d.png -i click.wav -c:v libx264 -pix_fmt yuv420p …` and
`evaluateFilmRender`. An async page that waited on `requestAnimationFrame` produced no output under
`--dump-dom`, so build synchronously. This is a smoke method for evidence, not a shipped tool.

## 9. Evaluation protocol

For the golden brief, two arms with the same model, the same prompt and the same machine class:
the skill package before this change and the skill package after it, each producing
`storyboard.json`, `timeline.json` and `out.mp4`. The scenario `music-driven-launch` joins
`film-benchmark.json` with `required: false`, because a required scenario would block every
existing run until it was measured; its gate score is Conformance only.

Recorded for both arms, from existing outputs: storyboard, timeline and render status and
findings (both arms must have no errors, or the difference is a gate artifact); `cutsOnOnset`;
planned, detected and missed cuts; per-beat `changedShare` and `stillShare`; the contact sheet.

Blind pairwise review by a named reviewer, order randomised, watching with sound, scoring 1 to 5:
audio legibility; section contrast; build and drop; instrument identity and dominance; cohesion;
product comprehension retained; polish. Decision rule: the candidate is preferred on at least five
of seven criteria and is not worse on product comprehension. Instruments that swamp the product are
the main regression risk, hence the guard. The result is recorded in this change's `qa.md` as Visual
Acceptance with the reviewer named; gates keep reporting `creativeAcceptance: "not-assessed"`.

There is no control build (decided, Q6): a control the change's authors write carries a straw-man
risk, so the comparison is between the two skill packages and nothing else.

## 10. Questions

Decided by the user:

- **Q1. Instruments are product or concept objects, not literal analyzers.** A spectrum or waveform
  appears only when the product is an audio or analysis tool. Upstream HyperFrames forbids
  equalizer bars and spectrum analyzers as decoration; the reference video is built from literal
  instruments; this change takes the first stance.
- **Q6. The golden case is the 24 s product film of section 7.** No abstract reel and no control
  build.
- **Q8. The kit ships neutral chrome** (section 4.6): appearance as CSS recipes on custom
  properties, no reference palette, panels, hexes or fonts, documented in the registry, no schema.

Still open, each with the default this change uses:

- **Q2. Numbers for the review rules?** Default: none; the reviewer reads existing fields. An
  additive block on `verify film-render` (share of audio onsets answered by motion, section
  contrast, build acceleration, freeze before drop) would extend the v1 evidence. The calibration
  render argues for the default: per-beat `changedShare` moved from 5.44 to 10.03 for the same groove
  once cut accents were on, and 10 fps at 160 by 90 does not resolve single onsets. Thresholds would
  need synthetic-clip tests and an accent-aware definition.
- **Q3. Continuous audio data?** Default: none. The kit is event and grid based, so a true waveform
  or spectrum scope is out. Options: HyperFrames' documented route, `extract-audio-data.py` output
  (Python and numpy) drawn to a Canvas by one `tl.call` per frame (it needs callbacks to run and is
  invisible to the timeline gate), or exporting the in-repo `onsetEnvelope`. Also: should Strudel
  events carry an explicit `voice` label in `score-grid.json` instead of selectors?
- **Q4. Music-only analysis for a user-supplied track?** Default: none. Only a Strudel score gives
  events. Options: let `film-edit analyze` run without footage, or add a declared tempo and offset
  source, which invites unmeasured tempo claims.
- **Q5. Keep `uniform-cadence` for bar-locked films?** Default: keep it and design around it. The
  reference structure would fail at 2.65. Exempting films whose plates start on downbeats changes an
  existing gate.
- **Q7. Who reviews, and does the benchmark scenario stay optional?** Default: the user reviews
  blind; agents prepare contact sheets and never record acceptance; the scenario is
  `required: false`.

## 11. Risks

- Instruments swamp the product message. Mitigations: rule R1, the comprehension guard.
- The chrome is a floor, not a look. The calibration render is plain, and a picture can answer the
  music and still look bare. That is the likeliest reason a full-environment run shows a smaller
  gain than the reference video. Mitigations: R1 asks for scale, the treatment carries a style-bible
  seed, and the chrome is meant to be overridden.
- Hard cuts between similar dark plates fail the render gate. Mitigation: R7, a ground per section
  or a flash accent; observed and cured in section 8.4.
- Tween count. 436 for 24 s here; hits × lanes grows, and capture cost under HyperFrames is
  unmeasured.
- Three GSAP behaviours bite silently (trailing `.0`, `var()` starts, counter rewinds). The kit and
  its tests encode them; hand-written GSAP in a film does not inherit that.
- The golden case is shaped by the cadence rule and was written by us; the protocol's fairness
  depends on the reviewer being blind.
- Selectors over Strudel voices work for the three shipped templates and for a pattern the agent
  writes with the same conventions; other music has no events (Q4).
- Registry and chrome documentation can rot; the completeness tests guard them.
- The fixture grid can drift from the writer; the test compares it with `summarizeGrid`.
- Fonts: generic families render differently across machines unless the film ships its own.

## 12. Not verified here

Verified locally: the browser behaviours, the real probe and gates on the golden composition, and a
render gate run on locally rendered frames (section 8). Not available: `puppeteer-core`, HyperFrames,
`film score` rendering, so no `film check` capture.

- HyperFrames itself: whether `hyperframes lint` and `check` accept `innerText` tweens with
  `modifiers` and a local `<link rel="stylesheet">`, when its runtime ticks between seek and
  capture, and its capture time and memory at these tween counts.
- The real Strudel render: whether the pattern renders to the events the fixture grid lists, and
  onset alignment against a real score (the local run used a click-track).
- Real fonts and real layout: the composition gate's capture, and the chrome under the film's own
  fonts.
- The visual quality of any film. The local render is a throwaway layout, and its gate results are
  Conformance and calibration only.
- The calibration of every review heuristic against a designed film.
- The blind review itself.

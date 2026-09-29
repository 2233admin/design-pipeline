# Product film delta

## ADDED Requirements

### Requirement: Music-driven instrument patterns are registered and documented

The choreography library SHALL register six instrument patterns, `audio-meter`, `event-scope`,
`tick-ticker`, `grid-pulse`, `build-countdown` and `hold-then-hit`, in `registry.json` and export
them from `patterns.js` under the same ids. Every instrument entry SHALL carry `kind: "instrument"`,
`required`, `optional`, `animates` (the properties it tweens), `audio` (what data it reads),
`markup` (the element structure it needs, in chrome class names), `productRole` and `use`. The data
adapter SHALL be documented under a top-level `helpers` key of the registry and the chrome under a
top-level `chrome` key, neither as a pattern. The storyboard gate SHALL accept an instrument id as
a beat's `choreography` value without any storyboard schema change.

#### Scenario: Registry, module and documentation agree

- **WHEN** the registry and `patterns.js` are loaded
- **THEN** the registry pattern ids SHALL equal the module's exported ids
- **AND** every instrument entry SHALL carry each documentation field above
- **AND** every option an instrument's `required` list names SHALL make the pattern throw when it is missing.

#### Scenario: A beat names an instrument

- **WHEN** a storyboard beat sets `choreography` to `grid-pulse`
- **THEN** `verify film-storyboard` SHALL NOT report `choreography-unknown` for that beat.

### Requirement: Instruments are seek-safe by construction

An instrument SHALL append only property tweens positioned at absolute times, drawn from `clipPath`,
`backgroundColor`, `color`, `scale`, `x`, `y`, `opacity` and `innerText` with the GSAP configuration
keys `duration`, `ease`, `immediateRender` and `modifiers`. Every property tween SHALL be a `fromTo`
with both endpoints explicit and `immediateRender: false`, except the countdown, which SHALL be one
`to` tween on `innerText` whose start is the formatted static text of its element. An instrument
SHALL NOT use callbacks (`onUpdate`, `onStart`, `onComplete`, `call`), timers, canvas drawing,
repeats, delays, layout properties or any clock or unseeded randomness. Any pseudo-random choice
SHALL derive from `hash(seed, index)` with a seed the caller passes. A string that carries numbers,
such as a `clipPath`, SHALL be built from numbers formatted without trailing zeros. A colour option
SHALL be a literal colour; a value that begins with `var(` SHALL make the pattern throw with a fix.

An instrument SHALL sort its hits by time. Each animated (target, property set) SHALL be a single
lane: its tweens SHALL NOT overlap in time. A kept hit's attack SHALL start at the hit's time and
last at least one frame; its release SHALL be truncated at the next hit or at `until`; a hit closer
than one frame to the previous kept hit, or to `until`, SHALL be dropped. The timeline probe SHALL
treat `modifiers` as configuration, not as an animated property.

#### Scenario: Dense hits do not conflict

- **WHEN** an instrument is fed hits 0.125 s apart with a 0.35 s release
- **THEN** the recorded tweens SHALL pass `checkTimeline` with no `property-conflict`
- **AND** every kept hit's attack SHALL start at its `atSec`
- **AND** every release SHALL end no later than the next hit.

#### Scenario: Unsorted and coincident hits are safe

- **WHEN** an instrument is fed hits out of order, two of them at the same time
- **THEN** it SHALL sort them and keep one of the coincident pair
- **AND** the recorded tweens SHALL pass `checkTimeline` with no `property-conflict`.

#### Scenario: Hits under one frame apart are dropped

- **WHEN** two hits are 10 ms apart at 30 fps
- **THEN** only the first SHALL produce tweens
- **AND** its attack SHALL last at least one frame.

#### Scenario: Numbers carry no trailing zeros

- **WHEN** `audio-meter` is built with a floor of 0.15 and a strength of 0.8
- **THEN** no emitted `clipPath` string SHALL contain a number written with a trailing `.0`.

#### Scenario: Colours are literals

- **WHEN** `grid-pulse` receives `lit: "var(--fk-accent)"`
- **THEN** it SHALL throw an error that tells the author to pass the literal colour from the style table.

#### Scenario: Same inputs give the same tweens

- **WHEN** an instrument is built twice with the same options and seed
- **THEN** the recorded tween lists SHALL be identical
- **AND** changing the seed SHALL change a `grid-pulse` cell choice and a `hold-then-hit` shake sequence.

#### Scenario: A build countdown is monotone and lands on the drop

- **WHEN** `build-countdown` is built for a window `at` to `until` with a freeze of 0.5 s
- **THEN** it SHALL append one `to` tween on `innerText` with no start value of its own
- **AND** its ease SHALL map progress 0 to 0 and 1 to 1 and SHALL never decrease
- **AND** the displayed value SHALL be zero from `until` minus the freeze to `until`
- **AND** the pattern SHALL schedule nothing but its explicit no-op hold inside that freeze.

#### Scenario: A flash-only accent is possible

- **WHEN** `hold-then-hit` is built with `zoom: 1` and `shakeFrames: 0`
- **THEN** it SHALL set its overlay to opacity 0 at time 0, flash it for one frame and change no scale or position.

#### Scenario: The shipped libraries pass the source scan

- **WHEN** `lib/patterns.js` and `lib/audio-events.js` are scanned by `film check`
- **THEN** the scan SHALL report no `nondeterministic-source` finding.

### Requirement: Instruments read hits as data

Instruments SHALL take hits as plain arrays of `{ atSec, strength? }` with `strength` from 0 to 1,
plus an `at` and `until` window in absolute seconds, and SHALL return `until` as their handoff time.
The adapter `audio-events.js` (global `FilmAudio`) SHALL build an audio object from a
`design-pipeline.score-grid.v1` grid or from the `music` block of `design-pipeline.edit-analysis.v1`,
and SHALL select hits by sound name, note (name or MIDI number), duration range, minimum gain,
time window and excluded quiet windows. It SHALL fail with a concrete fix when no grid was loaded
or the schema is wrong. The pipeline SHALL NOT analyze audio at composition time and SHALL NOT add a
second analyzer, analysis schema or receipt. `film score` SHALL also write `lib/score-grid.js`,
calling `FilmAudio.setGrid` with the same grid JSON, so a synchronous composition reads it through
the adapter and no second global exists.

#### Scenario: Hits are selected from a score grid

- **WHEN** a grid built by `summarizeGrid` holds sine events at note `c1`, noise events at gain 0.25
  and noise events at gain 0.12
- **THEN** selecting `sound: "sine"` with `midiMax` below `c2` SHALL return only the sine events
- **AND** selecting noise with `gainMin: 0.2` SHALL return only the 0.25 events
- **AND** a `quiet` window SHALL remove every hit inside it and no hit outside it.

#### Scenario: No grid is loaded

- **WHEN** `fromScoreGrid` receives nothing or a grid with another schema
- **THEN** it SHALL throw an error that names `designer-pipeline film score` as the fix.

#### Scenario: `film score` exposes the grid to the composition

- **WHEN** `film score` writes `score-grid.json`
- **THEN** it SHALL also write `lib/score-grid.js` whose assigned object deep-equals that JSON.

### Requirement: A neutral instrument chrome ships with the kit

The package SHALL ship `references/film-choreography/instrument-chrome.css`, a set of CSS recipes
with the class prefix `fk-` and the custom-property prefix `--fk-`. The registry's top-level
`chrome` key SHALL document its file, prefix, custom properties (name, role, default) and recipes
(class, role, instrument served). The chrome SHALL provide a frame with a header, a label, a tick
scale and a readout with tabular numerals and a fixed minimum width, and the parts of the six
instruments' markup contracts: a meter with track and bar, a scope of columns, a log with a
scrolling column and rows, a grid of cells, a flash overlay and a stage wrapper. Every colour, the
three type voices and the base metrics SHALL be custom properties, and every colour default SHALL
be achromatic. The chrome SHALL NOT declare `animation`, `transition`, `@keyframes`, `@import`,
`@font-face`, `url(`, `clip-path` or any gradient other than `repeating-linear-gradient`, SHALL
NOT declare `transform` on `.fk-log__col`, `.fk-stage` or `.fk-cell`, and SHALL NOT declare
`opacity` on `.fk-flash`. It SHALL NOT change any schema.

#### Scenario: The chrome defines exactly the documented properties

- **WHEN** the chrome is parsed
- **THEN** the custom properties declared in `:root` SHALL equal the names in the registry's `chrome.properties`
- **AND** every `var(--fk-*)` reference SHALL name a declared property
- **AND** every colour default SHALL have equal red, green and blue components.

#### Scenario: The chrome cannot fight the timeline

- **WHEN** the chrome text is scanned
- **THEN** it SHALL contain none of the constructs listed above
- **AND** no rule for `.fk-meter__bar` or `.fk-scope__col` SHALL declare `clip-path`.

#### Scenario: Recipes match the registry

- **WHEN** the chrome and the registry are loaded
- **THEN** every `fk-` class in the chrome SHALL appear in `chrome.recipes`
- **AND** every class named in `chrome.recipes` or in an instrument's `markup` SHALL exist in the chrome.

#### Scenario: The palette has one source

- **WHEN** `film scaffold` writes a project
- **THEN** `lib/instrument-chrome.css` SHALL exist and `index.html` SHALL link it before the film's own style
- **AND** `index.html` SHALL declare one style table, apply it to the `--fk-` custom properties and pass that table's literals to the instrument calls
- **AND** the scaffolded storyboard SHALL still pass the storyboard gate.

### Requirement: Treatment, song map and plate briefs use the existing artifacts

For a music-driven film, the film workflow and its scaffold SHALL define the treatment as a
`## Treatment` section of `concepts.md` under the chosen card (premise, instrument arc, style-bible
seed with a must-not-copy line, motion language, escalation and negative space), the song map as
`sound.md`'s table extended with a `Section` column (intro, groove, build, drop, break or outro),
and each plate brief as a block whose keys map onto existing storyboard beat fields: the instrument
is the beat's `subject`, the audio binding sentence is its `productAction`, the change of state is
`transformation` of kind `data-update` or another existing kind with `from` and `to`, the kit ids
are `motion`, the primary kit id is `choreography`, bound hits are `soundCues`, the freeze before a
drop is `holdSec`, and the escalation or negative-space line is `note`. The style-bible seed SHALL
be the chrome's custom-property slots plus any extra colour the film names. The storyboard schema,
its finding codes and every receipt SHALL NOT change.

#### Scenario: The scaffold carries the template

- **WHEN** `film scaffold` writes a project
- **THEN** `sound.md` SHALL contain a song-map table with a `Section` column
- **AND** `qa.md` SHALL contain a music-driven review section
- **AND** the scaffolded storyboard SHALL still pass the storyboard gate.

#### Scenario: A plate is a storyboard beat

- **WHEN** a plate brief is written with the documented key mapping
- **THEN** the resulting beat SHALL validate against `design-pipeline.film-storyboard.v1` unchanged.

### Requirement: Instruments are product objects, not decoration

The film direction reference SHALL require a treatment to name, for each instrument, the product
or concept object it is and the audio role that drives it, and SHALL state that an instrument with
neither is decoration. The chrome's frame header label SHALL be where the instrument names that
object. A creative review that finds such an instrument SHALL record it as a revision finding.

#### Scenario: An orphan instrument

- **WHEN** a plate's meter answers the kick but represents nothing the product or the concept has
- **THEN** the creative review SHALL record a revision finding for that plate.

### Requirement: Escalation, negative-space, density and cut-visibility rules are Visual Acceptance guidance

The film references SHALL document these rules: one dominant instrument per plate with at most
three supporting layers, each bound to a different audio role; builds accelerate through rate, size
or colour; the last beat before a drop holds still; a drop is a hard cut with impact; a break stops
pumping without freezing; sections differ visibly in density; every planned hard cut is visible to
the scene detector, by a different ground between sections or by a flash accent. Each rule SHALL
name the existing evidence fields a reviewer reads (`holdSec`, handoff kind, beat lengths,
`plannedCutsSec`, `cuts.missedSec`, per-beat `changedShare`, `stillShare`, `cutsOnOnset`, the
contact sheet) and SHALL be reported only in the creative review of `qa.md`. These rules SHALL NOT
add a finding code, SHALL NOT change any gate status or `creativeAcceptance`, and SHALL NOT change
any `film-eval` score. `planned-cuts-missing` keeps its existing meaning and severity.

#### Scenario: Gate output is unchanged

- **WHEN** `verify film-storyboard`, `verify film-timeline` and `verify film-render` run on the
  shipped example
- **THEN** their finding codes, statuses and `creativeAcceptance: "not-assessed"` SHALL equal the
  results before this change.

### Requirement: A non-NERV golden case and a before-and-after protocol

The repository SHALL ship a golden case under `skill/evals/film/music-driven/`: a 24 s, 120 BPM,
six-plate film for a generic node-canvas app, with a storyboard, a score grid, the Strudel pattern
that produces it, a treatment with song map and plate briefs, and a reference composition build
that uses only documented chrome classes and custom properties and overrides the chrome palette
with its own style table. The storyboard SHALL pass the storyboard gate with no findings, including
warnings. The score grid SHALL equal the output of `summarizeGrid` for the pattern's events. The
reference composition build SHALL pass `checkTimeline` through the real probe with no error and no
warning and SHALL end its timeline at the declared duration. A scenario `music-driven-launch` SHALL
be added to the film benchmark, optional and not required, and SHALL validate. The eval README
SHALL define the two arms (skill package before and after this change, same model and brief), the
existing evidence fields recorded for both, the blind pairwise rubric with its decision rule, and
the steps that cannot be run without HyperFrames and Chrome. The golden case and protocol SHALL NOT
be reported as evidence that the kit improves the picture until a full-environment run is recorded
in the change's `qa.md` as Visual Acceptance with the reviewer named. Evidence from a local render
SHALL be recorded as Conformance and calibration only.

#### Scenario: The golden fixtures are consistent

- **WHEN** the golden storyboard, score grid and reference build are loaded
- **THEN** the storyboard SHALL pass `checkStoryboard` with no findings
- **AND** the score grid SHALL deep-equal `summarizeGrid` of the pattern's events
- **AND** the recorded tweens of the reference build SHALL pass `checkTimeline` with no finding
- **AND** the classes and custom properties the reference page uses SHALL all be documented in the registry's `chrome` key.

#### Scenario: The benchmark keeps working

- **WHEN** the film benchmark manifest is validated
- **THEN** it SHALL validate with the new scenario present
- **AND** its blind brief SHALL omit the new scenario's `privateExpectations`.

### Requirement: No new gate, receipt schema or analyzer

This change SHALL NOT add a gate, a finding code, a receipt, an analysis schema or a storyboard,
timeline or render-evidence field. It SHALL add only the instrument patterns, the adapter, the
chrome file, the copied library files, the `film score` grid script, the probe's handling of
`modifiers`, documentation, scaffold notes and eval fixtures.

#### Scenario: Contracts are unchanged

- **WHEN** the storyboard, timeline, render, score-grid and film-check schema identifiers and the
  sets of finding codes are compared with the previous release
- **THEN** they SHALL be equal.

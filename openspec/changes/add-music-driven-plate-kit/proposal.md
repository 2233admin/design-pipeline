# Add a music-driven plate kit

## Why

The film gates now reject known failure shapes, and the two latest changes bound sound cues to
beats and made composition frames deterministic. None of that changes what a scored film looks
like. The user's reference for finished quality, github.com/bizarro/evangelion, gets its result from
craft the pipeline does not encode: a treatment that gives every section its own instrument, an
instrument that is driven by a named sound, a fixed vocabulary from voice to motion, builds that
accelerate and freeze before the drop, drops that cut with impact, breaks that stop, and one shared
kit that makes the plates read as one film.

The eight existing choreography patterns are all product-demonstration moves. None of them is
bound to a hit in the score, and none of them brings a look, so an agent that wants the picture to
answer the music has to invent both from nothing, and a weaker model does not.

## What changes

1. A treatment, song-map and plate-brief template that fits the existing intake, concepts,
   `sound.md` and storyboard artifacts. No new artifact, schema or gate.
2. Six audio-bound instruments in the existing `film-choreography` registry (`audio-meter`,
   `event-scope`, `tick-ticker`, `grid-pulse`, `build-countdown`, `hold-then-hit`), seek-safe and
   deterministic, taking hits from the existing score grid or edit analysis through a small pure
   adapter.
3. A neutral instrument chrome: one CSS file of recipes (frame, label, tick scale, readout, and
   the parts the six instruments need) whose palette, type and metrics are CSS custom properties
   that the film's style bible overrides. It carries appearance, so a plate is not bare, and stays
   neutral: monochrome defaults, no reference palette, chamfered panels, hexes, hazard stripes,
   scanlines or fonts. It is documented in the registry; it adds no schema.
4. Escalation, negative-space, density and cut-visibility rules for review, each naming the
   existing evidence a reviewer reads, reported under Visual Acceptance (the one rule the render
   gate already checks stays a Conformance finding).
5. A golden case that is not NERV, a 24 s product film for a generic node-canvas app whose concept
   is that the canvas is an instrument, with a before-and-after protocol and a blind review rubric.

`design.md` separates the reference techniques that generalise from the NERV-specific ones, which
are excluded, and lists ordered work for parallel workers in `tasks.md`.

## Decisions taken by the user

- Instruments are product or concept objects. A spectrum or waveform appears only when the product
  is an audio or analysis tool.
- The golden case is the 24 s product film. There is no old-patterns control build.
- The kit ships the neutral chrome described above.

## What this change does not claim

It claims no visual improvement. HyperFrames, puppeteer-core and a Strudel render are not
available in this environment, so the golden case cannot be rendered by the real pipeline here. A
throwaway page rendered with the installed Chrome and ffmpeg, and measured with the repository's
own probe and gates, supplied Conformance evidence and calibration numbers (`design.md` section
8); that is not Visual Acceptance. The change ships the layer and the procedure for judging it.
The result of that procedure is a human's, recorded later.

## Not in scope

- Porting the reference engine, renderer, palette, type, shapes or NERV imagery. Capture and render
  stay with HyperFrames.
- A new gate, finding code, receipt, analysis schema, or any field on the storyboard, timeline or
  render-evidence contracts.
- Continuous audio data (envelopes, spectrum, waveform) and a true spectrum or waveform scope.
- Music licensing, which the user has ruled out of scope.

## Builds on

`codify-product-film-gates` (registry, gates), `film-timeline-and-model-evals` (benchmark),
`add-motion-craft-rules` (`property-conflict`, `linear-motion`), `add-strudel-film-score` (score
grid), `add-music-led-editing` (grid data, flash and punch on drops),
`ground-films-in-references-and-sound` (reference and sound before construction),
`harden-film-frame-determinism` (`hash(seed, frameIndex)`, source scan) and
`strengthen-film-cue-binding-and-song-map` (song map, music-to-motion vocabulary).

## Open questions

Five decisions remain open, each with the default this change uses: numeric review signals (none),
continuous audio data (none), music-only analysis for a supplied track (none), the cadence rule for
bar-locked films (kept), and who reviews and whether the benchmark scenario stays optional (the
user, blind; optional). See `design.md` section 10.

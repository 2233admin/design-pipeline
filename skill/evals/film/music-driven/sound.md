# Sound

The `sound.md` of the golden case `canvas-instrument-24s`, filled the way `references/film-score.md`
asks for a music-driven film. The score is `score.strudel.js`; `score-grid.json` is the grid that
`designer-pipeline film score` writes for it.

- Energy arc: a sparse intro, a groove that fills the canvas, a build that accelerates and stops
  dead, a drop that lands with impact, a break that stops pumping, one stab.
- Music source and reuse basis: generated with Strudel from `score.strudel.js` (built-in synth and
  noise sounds only, no samples); nothing is auditioned or licensed from elsewhere.
- BPM 120, bar length 2.0 s, bar 1 starts at 0 s, so a window is `(bar - 1) x 2.0` to `bar x 2.0`.
  The tempo is the pattern's own (`cps` 0.5, one cycle is one bar), not a measurement of a recording.
- Entry and exit points: entry at 0 s (`music-in`), exit at 24 s (`music-out`).
- Intentional silence: the last beat of the build (13.5 s to 14 s) and the last two beats of the
  break (21 s to 22 s) carry no event; the picture holds still with them.

## Song map

One row per beat, in storyboard order. Section: intro, groove, build, drop, break or outro. Music
event: downbeat, impact, riser, break, accent or none. Motion response comes from the music-to-motion
vocabulary in `references/film-score.md`. Every hit event has a cue in the storyboard's
`sound.cues`, bound in that beat's `soundCues`.

| Beat id | Window (s) | Bars | Section | Music event | Motion response |
| --- | --- | --- | --- | --- | --- |
| `type-on-pad` | 0-2 | 1 | intro | entry `music-in`: pad only | One prompt line per beat tick in the prompt node's log; an image node waits, unconnected; nothing else moves (negative space) |
| `cells-on-kick` | 2-10 | 2-5 | groove | downbeat `groove-in`: kick, clap and hats enter | The generation node's cells and the prompt wire fire on the kick, the clap routes signal along the queue wire and jumps the queue meter, the hats tick the log node and flash the log wire |
| `countdown-build` | 10-14 | 6-7 | build | riser `build-riser`: snare roll on eighths, then sixteenths, last beat silent | The render queue node's ETA loses a bite per snare hit, the depth node and its wire climb on the rising pulse, the log node ticks the beat; the last 0.5 s holds still |
| `drop-impact` | 14-20 | 8-10 | drop | impact `drop-1`: full drums and bass | Hard cut on the downbeat with flash, zoom punch and shake on the finished strip node; a frame lights on the kick, the clap and the bass send signal up the wires from throughput nodes A and B |
| `break-settle` | 20-22 | 11 | break | silence `break-in`: drums out, bass swell in two pulses | One pulse travels across the small process trace node and every column returns to rest, a slow drift; the last 0.6 s holds still |
| `brand` | 22-24 | 12 | outro | accent `brand-hit`: one stab; exit `music-out` | Hard cut on the stab with a flash-only accent (zoom 1, no shake); the logo resolves over the finished strip and the closing rule wipes to the end |

Every cut sits on a multiple of 0.5 s, so `checkGridAlignment` finds every cut and accent cue on the
beat grid.

## Voices

Events carry no voice label, so a voice is a selector over the grid: sound, note range, step length
and gain. Two voices that share all four would need the pattern changed, not the selector. The
selectors are the ones `build.js` uses.

| Voice | Selector | Where | Answered by |
| --- | --- | --- | --- |
| Pad | `sound: "sawtooth"`, one note per bar (2 s), gain 0.35 | bars 1-10 | nothing per hit: the ground colour of the section |
| Beat tick | `FilmAudio.beats` | bar 1, bars 6-7 | `tick-ticker` (prompt node log, render log node) |
| Kick | `sound: "sine", midiMax: "b1"` (gain 0.7, 0.25 s slots, four per bar) | bars 2-5, 8-10 | `grid-pulse` (generation node cells, strip node frames) and `audio-meter` (the prompt wire) |
| Clap | `sound: "white", gainMin: 0.2` (gain 0.25, 0.5 s slots, beats 2 and 4) | bars 2-5, 8-10 | `audio-meter` (queue meter and queue wire; throughput node A and its wire) |
| Hat | `sound: "white", durMax: 0.3` (gain 0.12, eight per bar; `durMax` excludes the claps) | bars 2-5, 8-10 | `tick-ticker` (log node) and `audio-meter` (the log wire) |
| Snare roll | `sound: "pink"` (gain 0.2; eight in bar 6, twelve in bar 7) | bars 6-7 | `build-countdown` (a bite per hit) |
| Rising pulse | `sound: "square", durMax: 0.6` (gain 0.12 up to 0.36, one per beat, last beat silent) | bars 6-7 | `audio-meter` (depth node and its wire) |
| Bass | `sound: "sawtooth", midiMax: "c3", durMax: 0.5` (gain 0.45, 0.25 s slots; `durMax` excludes the pad) | bars 8-10 | `audio-meter` (throughput node B and its wire) |
| Swell | `sound: "triangle"` (gain 0.35, then 0.55; beats 1 and 2 of bar 11) | bar 11 | `event-scope` (process trace node) |
| Stab | `sound: "square"`, one note of 2 s, gain 0.3 | bar 12 | `hold-then-hit` (the cue time itself: 22 s) |

Each plate's dominant instrument and each supporting layer answer a different voice, so a viewer can
name which sound moves which element.

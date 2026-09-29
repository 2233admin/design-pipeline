# Film score (music as code)

Compose the soundtrack as a Strudel pattern, render it offline, and time the edit to its real
musical events.

```bash
designer-pipeline film score --project-root <dir> --bpm 120 --template punchy-launch --key c --write
designer-pipeline audio master --input assets/score.wav --output assets/score-mastered.wav --target web --fade-out 1
```

- Templates: `punchy-launch` (builds to a clear drop), `calm-build` (spacious, slowly opening),
  `tech-pulse` (steady precise pulse). The drop lands on the storyboard's first `downbeat` or
  `impact` cue. The template writes `score.strudel.js`, one Strudel expression you can edit;
  later runs without `--template` render your edited pattern.
- Output: `assets/score.wav`, and `score-grid.json` with the beat grid and every note/sound
  onset from the pattern (Strudel `queryArc`), not detected from audio. `lib/score-grid.js` beside it
  holds the same grid for the composition (below).
- Gate: hard and match cuts, and `downbeat`/`accent`/`impact` cues, must sit within one frame of
  a beat or event (`cut-off-grid`, `cue-off-grid`, each with the snap time). `film check` runs it
  whenever `score-grid.json` exists.
- `--write` records the score in `sound.assets` so the audio gate's license check passes.
- Storyboard gate: a declared `downbeat`/`accent`/`impact`/`riser` cue that no beat lists in
  `soundCues` warns (`cue-unbound`): the music has a hit the storyboard never answers. A bound cue
  whose `atSec` lies outside its storyboard beat (the scene window `startSec`-`endSec`, not the
  music's beat grid) warns (`cue-outside-beat`), and a cue after the film ends fails
  (`cue-outside-film`). Both are storyboard-consistency checks.

## Music to motion vocabulary

Give every music event one motion response so cuts and effects follow the score instead of
guessing. Write the choices in `sound.md`'s song map (beat id, window, bars, music event, motion
response) and bind each cue id in the beat's `soundCues`.

| Music event | Cue kind | Motion response |
| --- | --- | --- |
| Downbeat, impact, drop | `downbeat`, `impact` | Hard cut or match-cut on the hit, plus a `flash` or `zoom-punch` (`edit` fx) on the same frame |
| Riser, build | `riser` | Shorten the beats under it and accelerate the motion; land the cut on the release |
| Break, silence | `silence` | Hold: freeze the last frame or set the beat's `holdSec`; let the picture stop with the sound |
| Accent, hat-like tick | `accent` | A tick: a one-frame nudge or pulse of the focal subject, no cut |

Do not answer every beat of the bar; keep hard cuts for the events a listener would name.

Alignment to the music's beat grid is a review choice, not a gate rule. A cue may deliberately
lead the grid (anticipation), trail it (lag or syncopation) or sit in a breakdown with free timing;
`cue-outside-beat` only asks that it stay inside its storyboard scene. If a project wants tight
alignment, make it an optional policy: `score-grid.json` already checks cuts and
hit cues against the beat grid within one frame (`cut-off-grid`, `cue-off-grid`), and the
creative review in `qa.md` judges whether the picture and the music feel together.

## Music-driven films

For a film whose picture answers the music, the score grid is data the composition reads, not
only a gate input. `film score` writes `lib/score-grid.js`, one statement,
`FilmAudio.setGrid(<the grid JSON>);`, next to `score-grid.json`. The composition loads
`lib/audio-events.js` first and `lib/score-grid.js` after it, so `FilmAudio` is the only entry to the
data and no second global exists (`score-grid.json` stays the source for the alignment gate).
A timeline is built in one synchronous pass, which is why the grid is a script and not a fetch.
Without a grid, `FilmAudio` throws and names `designer-pipeline film score` as the fix.

```js
const audio = FilmAudio.fromScoreGrid();          // the grid set by lib/score-grid.js
const win = FilmAudio.bar(audio, 2, 4);           // bars 2 to 5: { bar: 2, from: 2, to: 10, durSec: 8 }
const kicks = FilmAudio.hits(audio, { sound: "sine", midiMax: "b1", from: win.from, to: win.to });
```

`hits` returns `[{ atSec, strength }]` sorted by time, or `[]` when nothing matches, with strength
normalised to the largest gain in the selection. Options: `sound` (a name or a list), `midiMin` and
`midiMax` (note names such as `b1` with `c4` = 60, or MIDI numbers; a note filter drops noise, which
has no note), `durMin` and `durMax` in seconds, `gainMin` (there is no maximum), `from` and `to`
(a time window) and `quiet` (`[[from, to], …]`, windows to leave silent, such as the freeze
before a drop). `midiMin`/`midiMax`, `durMin`/`durMax` and `gainMin` are inclusive; every time
window, `from`/`to` and each `quiet` window, is half-open `[from, to)`: a hit exactly at `from` is
kept, a hit exactly at `to` is not. Other helpers: `beats(audio, { from, to, every })`
returns hit-shaped beats, `bar(audio, k, count)` a window in seconds for 1-based bar numbers,
`hash(seed, index)` a seeded number in [0, 1), and `fromAnalysis(music)`. The functions are pure: no
clock, no randomness. Instruments take these arrays as plain data (`hyperframes.md`, kit contract).

**Events carry no voice label.** The grid lists `sound`, `note`, `gain` and the step length
`durSec`; nothing says kick or hat. A voice is therefore a selector: sound, note range, step length
and gain. Step length is the event's slot in the pattern (`white*8` gives eight per bar, half a
beat each), not its decay. Write the selector down in the song map so the choice is reviewable.
A track that did not come from a Strudel score (`fromAnalysis`) yields beats and bars only, so a
film built on it can lock components to the beat and nothing finer; `hits` returns nothing for it.

### Reading a window from bar numbers

A bar is four beats. Bar length is `4 × 60 / bpm` (2.0 s at 120 BPM), and bar 1 starts at the
time the song map's header gives, normally 0. Bars are numbered from 1, so bars `a` to `b` cover
`(a − 1) × bar length` to `b × bar length`; at 120 BPM bars 2 to 5 are 2 s to 10 s, which is what
`FilmAudio.bar(audio, 2, 4)` returns. State BPM, bar length and the start of bar 1 in `sound.md`'s
header (measured or from reliable metadata, as for any tempo claim) so that every window in the
map is arithmetic, and pass the resulting seconds as `from`/`to` and as `at`/`until` of the
instrument.

### Voice to response

One response per voice, and one verb per screen element. This extends the cue-kind table above; it
does not replace it. The instruments are in `film-choreography/registry.json` and are objects of
the product or concept (`product-film-direction.md`, music-driven films).

| Voice (how to select it) | Response | Instrument that carries it |
| --- | --- | --- |
| Kick: low sine on the beat | The dominant element bounces: rises on the hit, falls before the next | `audio-meter`, `grid-pulse` |
| Clap or snare: mid-gain noise on the off beat | An alarm: a second layer answers, or the countdown loses a bite | `audio-meter`, `build-countdown` |
| Hats and ticks: short, quiet, fast noise | A tick per hit, discrete and small | `tick-ticker`, `event-scope` |
| Bass: long low note | Mass: a slow swell, no per-hit twitch | `event-scope` with a long release, ambient drift |
| Pad: sustained chord note | No per-hit response; it sets the ground and the mood | a ground colour per section |
| Stab, riser peak, drop: a single event | An accent: one flash, zoom and shake, or a new object | `hold-then-hit` |

Builds accelerate and freeze on the last beat; a drop is a hard cut with impact; a break stops
pumping without freezing (rules R2 to R5 in `product-film-direction.md`).

### Selector rows for the templates

Read from each template's source in `score-core.cjs`, not from a render. Slot lengths are in beats
(`60 / bpm` seconds each, 0.5 s at 120 BPM), and `durMin`/`durMax` take seconds, so `0.75 beat`
below means `0.75 × 60 / bpm` (0.375 s at 120 BPM). Note ranges hold for all six keys (`--key c` to
`a`): the kick and bass roots reach at most `a1` (33) and `a2` (45), so `b1` and `b2` bound them; the
`+19` bell stays at `c4` (60) or above. Every template has an intro then a drop; the switch time is
the template's `dropSec`, so take `from`/`to` from the storyboard's cues.

`punchy-launch`

| Voice | Selector | Where |
| --- | --- | --- |
| Kick | `sound: "sine", midiMax: "b1"` (gain 0.7, half-beat slots, beats 1 and 3) | drop |
| Clap | `sound: "white", gainMin: 0.2` (gain 0.25, one-beat slot, beats 2 and 4) | drop |
| Hat | `sound: "white", durMax: 0.75 beat` (gain 0.12, eight per bar; the `durMax` excludes the claps, which share the sound) | intro and drop |
| Stab | `sound: "square"` (gain 0.22, half-beat slots, five per bar) | drop |
| Pad | `sound: "sawtooth"` (gain 0.35, then 0.4; one note per bar) | intro and drop |

`tech-pulse` (no clap)

| Voice | Selector | Where |
| --- | --- | --- |
| Pulse | `sound: "square"` (gain 0.25, then 0.28; eight per bar) | intro and drop |
| Hat | `sound: "white"` (gain 0.08, then 0.1; sixteen per bar, quarter-beat slots) | intro and drop |
| Kick | `sound: "sine", midiMax: "b1"` (gain 0.6, one-beat slots, beats 1 and 3) | drop |
| Stab | `sound: "sawtooth"` (gain 0.2, half-beat slots, three per bar) | drop |

`calm-build` (no drums; every voice is a sine or triangle)

| Voice | Selector | Where |
| --- | --- | --- |
| Pad | `sound: "triangle"` (gain 0.35, then 0.4; one note per bar) | intro and drop |
| Bell | `sound: "sine", midiMin: "b3", durMin: 1 beat` (gain 0.18, one per bar, beat 2; the `durMin` and `midiMin` keep it apart from the stab and the bass) | intro |
| Stab | `sound: "sine", durMax: 0.75 beat` (gain 0.2, three per bar; the only half-beat sine) | drop |
| Bass | `sound: "sine", midiMax: "b2"` (gain 0.45, one per bar, one-beat slot) | drop |

A pattern you edit or write yourself keeps working as long as its voices differ in one of these
four attributes; if two voices share all of them, change the pattern, not the selector.

Licensing: Strudel is AGPL-3.0-or-later. It is not part of this package. On first use `film score`
installs pinned Strudel packages into `<project>/.design-pipeline/strudel` (git-ignored) and
builds a browser bundle there. Only Strudel's built-in synth and noise sounds are enabled; no
sample libraries are loaded, so no third-party sample licenses enter the score. The rendered
audio is your work, not a copy of Strudel.

Rendering runs in headless Chrome from the HyperFrames install, on a localhost page (AudioWorklet
effects need a secure context) with seeded randomness. Two renders of the same pattern differ by
at most one least-significant bit in a few samples.

Scores come out at their natural level; master them with `audio master`. The gates check timing,
loudness and licensing; whether the music suits the film stays with creative review.

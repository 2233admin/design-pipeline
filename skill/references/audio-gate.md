# Audio gate

Check a film's soundtrack before calling it delivered. Works on an audio file or a rendered video.

```bash
designer-pipeline verify audio --audio out.mp4 --storyboard storyboard.json [--target web|podcast|broadcast]
designer-pipeline audio master --input assets/score.wav --output assets/score-mastered.wav --target web --fade-out 1
```

Targets: web -14 LUFS, podcast -16 LUFS (both +/-1.5 LU), broadcast -23 LUFS (+/-1 LU); true
peak at most -1 dBTP.

Errors: `audio-missing` (scored film without audio), `loudness-off-target`, `true-peak-over`,
`clipping` (flat-topped runs at the peak), `entry-late` (music audible later than the entry
cue), `license-noncommercial` (a `commercialUse: false` asset in a commercial film). Warnings:
`unexpected-silence` (a gap of 0.75 s or more with no `silence` cue), `abrupt-end` (still loud
at the last frame), `exit-early`, `license-unrecorded`. Every finding carries a `fix`.

## Hit cues

Every `impact`, `accent` and `downbeat` cue in `sound.cues` is timed against the sound onsets
measured in the file: the rise of level in 32 ms windows every 8 ms, in the full band and in a
high band, so a bright tick over a sustained pad counts as well as a low hit; each rise is judged
against the 1.5 s around it. The offset is sound minus picture, negative = early, as in earshot's
timeline. Within one frame (`fps`, default 30) the cue is on the frame; within 100 ms it is
`cue-off-frame` (warn); nothing within 100 ms is `impact-unsounded` (error) or `cue-unsounded`
(warn) for an accent or downbeat. A file with audio but nothing audible leaves every hit cue
unsounded.

`metrics.cueSync` lists every cue, `chance` (the share of the film's audible time within 100 ms
of some onset, which is what random cue times would score) and `chanceOnFrame` (the same share
within one frame). With `chance` of 0.5 or more, even for a single hit cue, the matches prove
nothing (a busy drum track hits every cue): `sync-at-chance` asks you to check the effects stem
on its own, and `cue-off-frame` then prescribes no shift, because the onset found may be the
bed's. Below that, the `cue-off-frame` fix gives the shift in ms; from 50 ms off it first asks
you to rule out a buried effect, whose nearest onset may be the music's.

An effect quieter than the music around it is not found: that is the finding (it is buried), not
a detector miss; ride effects 3-10 dB over the bed. A cue that lands on the bed's own beat counts
as sounded, which is intended when the cue is the music's downbeat; for an effect meant to sit
on that beat, only `chanceOnFrame` and the effects stem tell the two apart.

`riser`, `voiceover`, `entry`, `exit` and `silence` are not timed as hits. `film score`'s
`cue-off-grid` checks the score's own notes from the pattern; this check measures what reached
the delivered mix.

Record licensing in the storyboard: `sound.usage` (commercial by default for promotional films)
and `sound.assets: [{ id, license, commercialUse, file?, source? }]`.

`audio master` applies two-pass EBU R128 loudness normalization and an optional fade-out. It
masters 1.5 dB under the target's true-peak ceiling, because encoding the film's AAC track adds
inter-sample peaks. When the gain would push a peaky mix over that ceiling, a lookahead limiter
first shaves the transients (at most 10 dB, reported as `limiterDb`), so the gain stays linear and
quiet and loud sections keep their difference. When it still reports `normalization: dynamic`,
loudnorm compressed the mix and flattened the sections; lower the source peaks (softer kicks,
more sustained parts) and master again.

`film check` runs this gate on the rendered film. The gate measures delivery; whether the music
suits the film, the mix balance and the emotional arc stay in creative review.

## You cannot hear

An agent never says how a soundtrack sounds, or that a sound "fits", from the gate alone: the gate
measures levels and timing. Report its numbers ("-14.2 LUFS, 3/3 hit cues on the frame, chance
0.08"). Anything about character, mix or taste needs a listening reading with its number, or the
words "measured, not listened to". The owner judges taste after playing the film.

## Listening and effects with earshot (optional)

[earshot](https://github.com/Leonxlnx/earshot) (MIT, Python, CPU, local) gives the agent ears.
`doctor` lists it under the optional "Listening and film sound" companions; nothing here installs
it. When it is present, use its own skills (`earshot`, `real-sound`) for these jobs:

| Need | earshot | Notes |
| --- | --- | --- |
| Effects for a code-made film | `earshot kit init --preset calm\|crisp\|minimal\|launch`, `kit render`, `kit check` | Renders a bank of sounds made in code, no models, about a minute; `kit.lock.json` gives each take's measured onset, peak and end to place on the cue frame. Record the kit in `sound.assets` (the bank is MIT). |
| Effects from real recordings | the `real-sound` skill | When the brief asks for recorded sound: sourcing with licence audit, realness gate, deterministic mixer. |
| Pick or trim a sound | `rank`, `find`, `describe`, `ab` | Quote the z score; only "strong" (z >= 3) supports a claim. |
| Listen to the finished film | `timeline <film> --cues <cues.json>`, `sheet <film> -o sheet.png`, `critique <film>` | Open the sheet PNG. `critique` scores against seven professional launch films; it is evidence for creative review. |

Order for a film with effects: picture cues, effects placed from the lock, `audio master`, then
`verify audio` (this gate) and, with earshot, `timeline` and `sheet` on the same render. Each CLI
call loads its models (20-40 s; `sfx` and `kit` load none), so for more than a few calls use the
earshot MCP server or one Python script. earshot readings never pass a gate and never count as
Visual Acceptance: the owner still decides after playing the film.

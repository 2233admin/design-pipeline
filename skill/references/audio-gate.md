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

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
  onset from the pattern (Strudel `queryArc`), not detected from audio.
- Gate: declared `downbeat`/`accent`/`impact` cues promise a musical event within one frame
  (`cue-off-grid` is an error). Hard and match cuts outside that window produce `cut-off-grid`
  warnings: review the intended anticipation, delay or counterpoint before snapping them.
  `film check` runs this check whenever `score-grid.json` exists.
- `--write` records the score in `sound.assets` so the audio gate's license check passes.

Licensing: Strudel is AGPL-3.0-or-later. It is not part of this package. On first use `film score`
installs pinned Strudel packages into `<project>/.design-pipeline/strudel` (git-ignored) and
builds a browser bundle there. Only Strudel's built-in synth and noise sounds are enabled; no
sample libraries are loaded, so no third-party sample licenses enter the score. The rendered
audio is your work, not a copy of Strudel.

Rendering runs in a headless browser (the HyperFrames headless shell, else an installed Chrome,
Edge or Chromium) on a localhost page (AudioWorklet effects need a secure context) with seeded
randomness. Two renders of the same pattern differ by
at most one least-significant bit in a few samples.

Scores come out at their natural level; master them with `audio master`. The gates check timing,
loudness and licensing; whether the music suits the film stays with creative review.

## Placing sound effects: hits by onset, swells by peak

Where an effect is anchored depends on its shape:

- **Hits** (impacts, taps, clicks, pops, ticks): the onset is the hit, and the peak follows within
  a few milliseconds. Put the onset on the cue frame and declare the cue `impact`, `accent` or
  `downbeat`; the audio gate times those cues by the onsets it measures in the delivered mix (see
  the Hit cues section of [audio-gate.md](audio-gate.md#hit-cues)).
- **Swells** (whooshes, risers, reverse cymbals, sweeps): they are heard at their loudest moment,
  which may be 300 ms or more into the file. Place them so that the peak lands on the moment, and
  declare the cue `riser`, which the hit timing does not measure; the rise before the peak is the
  anticipation.

The moment itself comes from the `sound.cues` time taken from the same curve that moves the picture
(see `film-methods.md`), never from the file's first sample.

```bash
# hit: onset = first 1 ms window within 20 dB of the file's peak (prints seconds)
ffmpeg -i sfx/tick.wav -af "asetnsamples=48,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-" -f null - \
  | paste - - | awk '{split($3,a,":");split($4,b,"=");t[NR]=a[2];v[NR]=b[2]+0;if(NR==1||v[NR]>m)m=v[NR]}END{for(i=1;i<=NR;i++)if(v[i]>m-20){print t[i];exit}}'
# swell: loudest 10 ms RMS window (prints seconds and dB)
ffmpeg -i sfx/whoosh.wav -af "asetnsamples=480,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - \
  | paste - - | awk '{split($3,a,":");split($4,b,"=");if(NR==1||b[2]+0>m){m=b[2]+0;t=a[2]}}END{print t, m}'
# delay = (cue - anchor) in ms; mix without normalising the bed
ffmpeg -i assets/score.wav -i sfx/whoosh.wav -filter_complex "[1]adelay=<ms>:all=1[s];[0][s]amix=inputs=2:normalize=0:duration=first" assets/mix.wav
```

Window sizes assume 48 kHz (`asetnsamples` = rate / 1000 for 1 ms, rate / 100 for 10 ms). Use the
RMS window for swells, not the instantaneous 1 ms peak: a click or pop at the start of a whoosh
can be its highest sample. In the recorded test a whoosh with a short click at 0 s had its
instantaneous peak at 0 s and its loudest RMS window at 0.29 s; confirm the anchor by listening
when the two disagree. Also measured: a tick starting after 20 ms of silence had its onset at
0.020 s, and a swell peaking at 0.299 s, delayed by 1701 ms, peaked at 2.000 s in the mix.

Then `audio master` the mix and let the audio gate check loudness, true peak and clipping. Record
each effect file in `sound.assets` with its license (a recorded or downloaded effect is a
third-party asset; one synthesised in the Strudel score is your work). Whether the effect suits
the moment stays with listening review.

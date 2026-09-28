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
- Gate: hard and match cuts, and `downbeat`/`accent`/`impact` cues, must sit within one frame of
  a beat or event (`cut-off-grid`, `cue-off-grid`, each with the snap time). `film check` runs it
  whenever `score-grid.json` exists.
- `--write` records the score in `sound.assets` so the audio gate's license check passes.

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

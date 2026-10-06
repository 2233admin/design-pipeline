# Music-led edits (PV, MAD, beat montage)

PV and MAD describe a broad field of visual direction, not a fixed cutting recipe. Subject action,
staging, key poses, motifs, compositing, typography and sound can all carry the piece. Read
`animation-thinking.md` before choosing effects. This CLI handles the assembly of existing clips;
author generated shots through the film workflow and bring their rendered clips into the edit.
Narration may be one soundtrack layer without requiring literal one-sentence/one-picture cuts.

```bash
designer-pipeline film-edit analyze --project-root <dir> --audio assets/music.wav   # beat grid + footage shots
designer-pipeline film-edit auto    --project-root <dir> --style mad|pv [--duration 30] [--width 1920 --height 1080]
designer-pipeline film-edit render  --project-root <dir>                             # renders/edit.mp4
designer-pipeline film-edit check   --project-root <dir>                             # edit, render, audio, composition
```

Project layout: footage in `sources/` (mp4, mov, webm, mkv) with `sources/licenses.json`
(`{"clip.mp4": {"license": "...", "commercialUse": true}}`; unrecorded footage counts as
non-commercial), music anywhere, optionally `score-grid.json` from `film score`, whose exact grid
replaces beat detection.

- `analyze` tracks the beat (tempo within 0.5 BPM, beats within one frame on test tracks), finds
  downbeats and per-bar energy, and splits footage into candidate shots at scene cuts (long takes
  become about 2.5 s windows) with each shot's motion peak.
- `auto` writes `edit.json`. `mad`: one beat per shot in loud bars, two in medium, four in calm,
  flashes on loud downbeats. `pv`: two, four or eight beats per shot. Shots rotate through sources
  and are trimmed so their motion peak lands just after the cut. Edit `edit.json` by hand
  afterwards; every clip is `{source, inSec, outSec, atSec, durSec, speed?, fx?: [flash, freeze, zoom-punch]}`.
- These `auto` presets are rough assembly aids, not definitions of PV/MAD. Rebuild the phrase
  around the intended performance, visual relationship and audio; remove unmotivated flashes.
- `check` findings, each with a `fix`: `timeline-gap`, `timeline-overlap`,
  `license-noncommercial`, `source-range` (errors); `cut-off-grid`, `shot-too-short`, `shot-too-long`,
  `monotone-rhythm`, `clip-reused`, `speed-extreme`, `cut-not-visible` (warnings). The render,
  audio and composition gates run on the result through a storyboard derived from the edit.

For an off-grid cut, distinguish an accidental offset from an intentional pickup, delayed accent
or counterpoint. Keep intentional choices and record their timecodes in `qa.md`; inspect source
motion, camera movement and editing separately before adjusting them together.

The render limits the music to -2.5 dBFS so the AAC-encoded film stays under -1 dBTP. The gates
check timing, rhythm, licensing and delivery; choosing the right moments and the emotional arc
remains creative review.

# Design

## Onsets for hit timing

`audio-core.cjs` gains `hitOnsets`: mono 16 kHz, RMS in 32 ms windows every 8 ms, in the full band
and a high band (first difference); the onset function is the sum of the positive rises of
`log1p(1000 * rms)` in both bands. A peak counts when it exceeds 0.3 (about 3 dB) and the mean plus
two standard deviations of the 1.5 s around it; two peaks within 50 ms are one onset, the stronger
kept. An onset is reported at the start of the 8 ms step that rose.

Why not reuse `film-core.soundEvents`: its 32 ms non-overlapping hop quantizes onsets to a full
frame at 30 fps, its first-come 80 ms gap lets a weak ripple swallow the hit right after it, and
its linear full-band energy misses a bright tick over a sustained pad (the tick added 1 dB of
energy but a large high-band rise). Changing it would move the cut and reference-shot results
that depend on it, so the cue sync keeps its own detector inside the audio gate.

Shorter windows were tried and rejected: an 8 ms window reads the ripple of a 220 Hz pad as onsets.

## Judging a cue

Offset = nearest onset minus the cue (earshot's sign: negative = early). Within one frame
(`board.fps`, default 30): on the frame. Within 100 ms: `cue-off-frame`. Otherwise unsounded:
error for `impact` (a hit is promised), warning for `accent` and `downbeat` (a soft moment may be
intended). `riser`, `voiceover`, `entry`, `exit`, `silence` are not timed as hits. Chance is the
share of the audible span within 100 ms of some onset; with three or more hit cues and chance >= 0.5,
`sync-at-chance` says the matches prove nothing and points at the effects stem.

## Measured

- Synthetic: hits on cue are found at 0 ms; a cue 60 ms early reads +60 ms (off the frame at
  30 fps, on it at 12 fps); 70 hits every 150 ms give chance 0.89.
- Real beds: earshot's `launch` kit, placed with `kit.place` at levels from `kit.gain_db` /
  `kit.bed_level`, over the four music tracks in `examples/seed-film-reference/assets`: 20 of 20
  cues on the frame (offsets -14 to +23 ms). The piano track's chance was 0.61, so `sync-at-chance`
  fired there, as intended. The same effects at fixed kit levels, not set against the bed, left
  some under the music; those read unsounded, which is the finding (buried), not a miss.
- A regression test mixes a tick and a hit over the repository's seed score and requires all four
  cues on the frame with chance under 0.5.

## Compatibility

A film whose storyboard declares an `impact` cue with no sound now fails `verify audio` and
`film check`. Edits derived by `edit` declare cuts as `accent` cues; they can only warn. No path,
schema id or command changes.

## earshot

Registered as an optional companion group (`earshot`, `real-sound`) with an install line and a
fallback. The pipeline never installs or runs it. Its readings are creative-review evidence: they
never pass a gate and never count as Visual Acceptance.

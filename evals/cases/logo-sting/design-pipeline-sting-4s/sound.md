# Sound

- Energy arc: a rising filtered noise and a low saw build for one bar; the landing hits on the
  next downbeat; the chord rings out under the held lockup.
- Music source and reuse basis: `score.strudel.js` at 120 BPM, rendered with Strudel's built-in
  synths (no samples), mastered with `audio master --target web --fade-out 0.4`. Strudel is
  AGPL and is installed on demand, never bundled; the rendered audio is this project's work.
- Entry and exit: entry at 0 s (riser), exit at 4 s (ring-out).
- Accents bound to beats: gate-1 tick at 1.0 s, gate-2 tick at 1.5 s (beats 3 and 4 of bar 1),
  landing at 2.0 s (downbeat of bar 2). Onset detection finds all three within one frame.
- Intentional silence: none; the ring-out fades under the hold.
- Not auditioned by ear (see reference.md, inspection limits).

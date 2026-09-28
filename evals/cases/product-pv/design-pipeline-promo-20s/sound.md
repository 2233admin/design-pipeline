# Sound

- Energy arc: a filtered eighth-note pulse under the typing (0-6 s); the drop on the cut to the
  finding, with bass, a saw riff and a tick as each join turns green (6-14 s); a thinner
  breakdown with a chime on the pass and a tick as the model lanes arrive (14-18 s); a final
  chord under the logo (18-20 s).
- Music source and reuse basis: `score.strudel.js` at 120 BPM (one bar = 2 s), Strudel built-in
  synths only, mastered with `audio master --target web --fade-out 1`. Strudel is AGPL and is
  installed on demand, never bundled; the rendered audio is this project's work.
- Entry and exit: entry at 0 s, exit at 20 s.
- Accents bound to beats: enter 1.5, scaffold 2, draft 4, drop 6, joins 9/10/11/12, passed 14,
  lanes 15.5, logo 18. Onset detection finds all but 15.5 within one frame; at 15.5 the RMS
  envelope rises 6 dB (-17 to -11 dBFS), below the detector's film-wide threshold.
- Intentional silence: a 50 ms gap before the pass at 14 s.
- Not auditioned by ear (see reference.md, inspection limits).

# Sound

- Energy arc: filtered chords and a riser under the black intro, a snare roll into the reveal
  (0-6 s); four-on-the-floor with a sparse lead in the verse (6-18 s); snares on 2 and 4 and an
  opening filter in the pre-chorus, with bar 20 dropped out for the black-out line (18-30 s); full
  kit, the J-pop "royal road" progression (F G Em Am) and the hook melody in the chorus (30-54 s);
  a pad and a soft pulse under the silhouette (54-66 s); sixteenth hats, an octave lead and a
  crash every bar in the final chorus (66-84 s); the last hit on bar 57 and a chord ringing out
  under the end card (84-90 s).
- Music source and reuse basis: `score.strudel.js` at 160 BPM (one cycle is one 1.5 s bar),
  Strudel built-in synths only, no samples. Mastered with `audio master --target web --fade-out
  1.5`. Strudel is AGPL and installed on demand, never bundled. Usage is internal: the film is an
  evaluation fixture.
- Vocals: none. The lyrics are typeset, and the lead synth plays their melody.
- Entry and exit: entry at 0 s, exit at 90 s.
- Accents bound to the picture: reveal 5.625 (flash), verse 6, pre-chorus 18, black-out 28.5
  (silence), chorus 30 (impact, flash), split 42, bridge 54, final chorus 66 (impact, flash),
  outro 84.
- Dynamics: the arrangement is layered so the choruses sit about 6 dB above the verse and the
  bridge (measured on the master: verse -18.6, pre-chorus -15.5, chorus -12.4, bridge -18.4, final
  chorus -12.6 LUFS). The first masters came out flat because loudnorm fell back to
  dynamic mode on the peaky kicks; `audio master` now limits transients first so the gain stays
  linear. The film measures -14.1 LUFS, LRA 6 LU, -2.1 dBTP.
- Not auditioned by ear.

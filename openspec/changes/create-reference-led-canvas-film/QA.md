# Field Notes / review evidence

Date: 2026-09-22. Preview: <http://127.0.0.1:4176/>.

## Moving review

- First audiovisual passage reviewed in real time at 1, 2, 3.017, 4.017, 5.017, 6.017 and
  7.017 seconds. The city subject and perspective changed inside the shot; the detail crop
  continued the same source footage. This was playback evidence, not only seeks to stills.
- Full 32-second playback sampled 20 times at 1.7-second intervals, including the ended state.
  A 20-frame contact sheet was inspected in the browser tool. Source movement, detail crops,
  moon-to-canvas pullback, selected-node expansion, short result cuts and the brand hold were
  visible. No independent page/slide entrances supply the primary action.
- The source selection is deliberately footage-led and cool; it borrows the reference's fine
  annotations and local image inserts. It does not reproduce SEAM's laboratory/organic subject
  matter. The canvas is a promotional concept using genuine existing project clips.
- User creative acceptance: on 2026-09-22, the user reported that this version had no major
  remaining problems and requested a summary and GitHub PR. This accepts the current direction
  for review; it does not imply final publication, audio mastering or acceptance of earlier films.

## Sound and media

- All three local videos and the stereo score reached readyState 4. Videos played muted; the
  score was unmuted and playing during the sampled sequence.
- Largest absolute score/composition drift in the full playback sample: 0.050644 seconds.
  All source videos and the score paused at the end. The final source frame remained held.
- The score is a generated local 32-second, 44.1 kHz, stereo 16-bit WAV. The source composition
  measured 0 clipped samples, -1.31 dBFS sample peak and -14.82 dBFS RMS. FFmpeg ebur128 measured
  -12.5 LUFS integrated, 2.3 LU loudness range and -1.3 dBFS true peak. Default player volume is 0.8.
- Listening limitation: audio input was unavailable to the reviewing model. These facts establish
  delivery, measured levels and synchronization, not a subjective audition of music quality or
  an audio match to the reference. Neither the reference soundtrack nor original clip audio is used.

## Player and layout

- Explicit play, full playback, ended state and restart exercised in the browser. No captured
  browser console warnings or errors in the full run.
- Keyboard seeking from Home to 0.1s exposed an in-flight video-seek race. The held-frame callback
  now reconciles the latest composition target. Recheck after decode: composition/audio 0.1s,
  city source 0.349s as requested, media paused, no seek pending.
- Held 21.8s canvas frame inspected after decode: city 3.52s, moon 9.1075s, night 2.31s;
  all three correct source frames visible with node text and connections.
- Mute toggled successfully. At 390×844 the 16:9 film remained contained, controls stayed visible
  and document scroll width equaled viewport width (390px). Temporary viewport override reset.
- The final seek fix was followed by another successful replay to 32s. Fullscreen entered with
  the film filling the preview; the page was then restored to the initial play-with-sound entry.

## Repository validation

- `node --check` passed for `film.js` and `server.cjs`.
- `node scripts/qa.cjs` exited 0: 676 tests passed, 11 installed-package tests passed,
  packaging/install and public CLI smoke passed, repository status remained byte-identical.
  Log: `.scratch/reference-film-qa.log`.
- New film kept as the browser deliverable; the preview URL was sent to the Codex browser panel.
  These checks establish technical readiness; user feedback is recorded separately above.

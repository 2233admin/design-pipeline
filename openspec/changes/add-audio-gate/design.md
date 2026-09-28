# Design

Measurement uses ffmpeg only (already required by rendering): `ebur128=peak=true` for integrated
LUFS, loudness range and true peak; a 50 ms RMS envelope from 48 kHz float PCM for audible
start/end, silences (below -50 dBFS for at least 0.75 s) and the tail level.

Clipping is detected as flat tops: runs of 6 or more samples exactly at a peak of at least
-0.18 dBFS. A fixed full-scale threshold missed real clipping (encoders saturate below 1.0);
a relative near-peak band flagged clean low-frequency crests. Measured: a clipped 220 Hz tone
held its peak for 54 samples, while a clean 50 Hz crest repeated its peak value 3 times.

Storyboard `sound` gains optional `usage` (commercial, personal, internal; commercial when
absent) and `assets` records (`id`, `license`, `commercialUse`, optional `file` and `source`).
Existing storyboards stay valid.

`audio master` runs two-pass loudnorm with linear mode requested and clamps first-pass
measurements into loudnorm's option ranges (a clipped mix measured +0.35 LUFS, which loudnorm
rejects). It reports the normalization type the second pass actually used. On the demo score
it fell back to dynamic mode: loudness range went from 8.1 to 1.4 LU, which flattens the
accents. The helper reports this rather than hiding it.

End-to-end evidence on the HyperFrames demo: `film check` raised loudness-off-target (-21.2
LUFS) and abrupt-end; `audio master --target web --fade-out 1`, repointing the audio element
and re-rendering brought the film to -15.0 LUFS and -2.0 dBTP with a -38.9 dBFS tail, and all
gates passed.

Deferred: ducking under voiceover (needs separate stems), beat-grid tempo checks beyond the
existing cut and onset alignment, and audio scoring in `film-eval`.

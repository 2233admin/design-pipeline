# Design

Beat tracking (no dependencies): log-energy onset envelope at 11025 Hz with 23 ms hops; tempo by
envelope autocorrelation over 70-180 BPM at lags of 1, 2 and 4 beats, weighted toward 120 BPM to
settle octave errors; coarse phase by onset strength; then each predicted beat snaps to the
strongest onset within a quarter period and a weighted least-squares fit refines period and
phase. Downbeats take the bar phase with the most onset strength. The coarse 0.5 BPM search alone
read 128 BPM as 129 and drifted; the fit recovered 128.00, 90.03 and 120.09 BPM on test tracks
with at most 12 ms beat error, and the right downbeats. A Strudel `score-grid.json` replaces
detection. `hyperframes beats` was tried first but only reads HyperFrames projects and did not
find the music track in the test project.

Footage: scene cuts and pixel motion reuse the render-gate helpers; uncut takes longer than 3 s
become roughly 2.5 s windows so one take yields distinct moments.

Auto edit: shot length in beats from bar energy (mad 1/2/4, pv 2/4/8), shots rotate through
sources by motion peak, trimmed so the peak falls 12% into the shot, speed within 0.5-1x only to
fill a cut, flash on loud downbeats for mad. Deterministic.

Check: timeline continuity, cuts within one frame of the grid, shot length against tempo,
monotone rhythm (8+ shots of one length), reuse (ranges overlapping by more than half), speed
outside 0.45-2.2x, source ranges, and licensing from `sources/licenses.json` (unrecorded footage
is non-commercial). A storyboard derived from the edit (each clip a hard-cut footage beat with a
bound accent cue) lets the existing render gate check planned cuts and frozen shots, the audio
gate check delivery, and the composition gate check shot midpoints. A planned cut that the scene
detector cannot see becomes `cut-not-visible`.

Evidence (dogfood MAD from this repository's own renders plus generated footage, 12 s at 120 BPM,
15 shots): the first render failed true peak (AAC pushed a -1 dBTP master to -0.8, then to -1.3
after a -1.5 dBFS limiter was still insufficient, fixed with -2.5 dBFS) and flagged two cuts from a
dark shot into a dark shot as not visible; adding `flash` to those clips, as the fix suggests, made
every gate pass.

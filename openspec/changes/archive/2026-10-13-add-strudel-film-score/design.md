# Design

Install: pinned `@strudel/core` 1.2.6, `@strudel/mini` 1.2.6, `@strudel/tonal` 1.2.6,
`@strudel/webaudio` 1.3.0, `superdough` 1.3.0 and `esbuild` 0.28.2 go into
`<project>/.design-pipeline/strudel` (git-ignored). A browser IIFE bundle is built there. The
published `@strudel/core` 1.2.6 imports `SalatRepl`, which `@kabelsalat/web` 0.4.1 does not export,
so the bundle stubs that unused live-coding module. npm runs through npm-cli.js without a shell.

Render: a kernel opens headless Chrome (HyperFrames' puppeteer and chrome-headless-shell), serves
an empty page from 127.0.0.1 because AudioWorklet needs a secure context (on about:blank, effect
worklets failed to load), seeds Math.random, calls `miniAllStrings()` so quoted patterns are
parsed as mini-notation (without it every note failed as "not a note"), registers synth sounds,
evaluates the pattern expression, queries onsets with `queryArc`, and renders with Strudel's own
`renderPatternAudio` (OfflineAudioContext), capturing its WAV download. Console errors such as
unknown sounds fail the render with a fix. Determinism: unseeded renders differed in 640,308
samples by up to 4,851 LSB; seeded renders differ in at most a few dozen samples by 1 LSB.

Grid and gate: `score-grid.json` holds the beats at the chosen BPM (4 beats per cycle) and every
onset. Hard and match cuts, and downbeat, accent and impact cues, must be within one frame of a
beat or onset; findings give the snap time. `film check` adds a score step when the grid exists.

Templates are synth-only (sine, triangle, square, sawtooth, white noise) and use `arrange` to
place the drop on the storyboard's first downbeat or impact cue, snapped to a whole cycle.

End-to-end evidence (HyperFrames demo, 12 s): first `film score` installed Strudel and rendered in
40 s (cached runs 2.7 s), 81 events; it flagged the storyboard's 2.4 s and 8.2 s cues as off the
120 BPM grid with snap points 2.5 s and 8.25 s. After snapping, mastering (-15.1 LUFS, -1.0 dBTP)
and re-rendering the film, `film check` passed storyboard, score, timeline, render, audio and
composition. All three templates render without errors.

Deferred ideas from reviewing mengkong30/ae-motion-production (unlicensed prompt pack for After
Effects; ideas only, no text or code taken): a single-time-source gate (one property driven by one
tween, no stacked easing), a rest-pose return gate on the final frame, an anticipation/main/settle
phase field for action beats, loop-seam checks, and sampling a progress driver at 0, 0.5 and 1.

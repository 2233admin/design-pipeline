# Design

Timeline (from the probe, which now records each tween's ease name):
- `property-conflict` (error): two non-driver tweens on the same target and property overlap in
  time by more than 1 ms. Drivers and zero-length sets are exempt.
- `linear-motion` (warning): non-driver tween longer than 0.3 s with ease none, linear or power0
  that moves position, scale or rotation. Opacity is exempt.
Timeline and render findings now carry `severity`; only errors fail a gate and only errors cost
points in `film-eval`.

Storyboard: optional `endState` (free, rest, loop; free by default) and beat `arc`
(anticipate-act-settle).

Render (pixel motion at 10 fps, 160x90):
- `rest-drift` (error): first and last frames differ by more than 32 levels in over 1% of pixels.
  A 4-level test flagged a truly settled H.264 clip at 0.88% because keyframe and late-frame codec
  noise differ; at 32 levels a settled clip measured 0.28% and a drifting one 5.6%.
- `loop-seam-jump` (error): the last-to-first step changes more than max(3 x median step, 1%).
- `missing-anticipation` / `missing-settle` (warnings, arc beats of 8+ samples): the first 15% of
  the beat averages at least 80% of peak motion; the last 15% does, or motion falls from at least
  80% of peak to under 10% in one step.
`film check` also samples procedurally driven beats at 5% and 95% for the composition gate.

Capture hardening, found on a cold start: the preview registered the parent directory as the
project (HyperFrames reads PWD, inherited from the calling shell), so the preview URL returned 404,
no timeline registered, and `film check` fell back to an old timeline.json while reporting passed.
Now npx runs with PWD set to the project, the preview is started with the project path, the
project id is looked up from `/api/projects` by directory, capture waits up to 30 s for the target
timeline, and a fallback timeline is marked stale so the check reports incomplete.

The golden timeline example had a real property conflict (two `#prompt x` tweens overlapping at
2.4-2.5 s); it was regenerated with DOM-like fixture elements so the probe does not mark them as
drivers.

Provenance: the rule ideas were informed by reviewing mengkong30/ae-motion-production, an
unlicensed After Effects prompt pack; no text or code was taken.

# Design

Primary scope: deterministic film tooling on the `codify-product-film-gates` branch. Stage 0
routed the request to motion-graphics / product-launch-video (`job-plan.json`).

Timeline probe: a read-only UMD snippet that walks `getChildren` recursively, converts child
start times to absolute seconds through parent offsets and time scale, records target labels
(id, data-film-id, classes), animated property names (vars, startAt, keyframes minus control
keys), from/to scalars and repeat. It never seeks or plays the timeline. Verified against
GSAP 3.15.0 by building the example storyboard with the shipped patterns; that probe output is
committed as `timeline.example.json`.

Timeline gate: duration within one frame of the storyboard; findings for layout properties,
`repeat: -1`, tweens past the end, action beats with no animated tween, action beats that animate
only opacity/autoAlpha/scale, and continuation/morph/camera-carry handoffs with no non-ambient
subject animated within 0.35 s on both sides or spanning the boundary. Ambient = animated for more
than 60% of the film, so a drifting background cannot fake continuity.

Evals reuse benchmark v2 rather than a parallel system. Score per scenario = 0.35 storyboard +
0.35 timeline + 0.30 render; each component is 1 on pass, minus 0.15 per own finding, 0 when the
file is missing or invalid. Storyboard findings count once. Unmeasured scenario directories stay
absent so benchmark evaluate reports them as blocked. Fairness flags remain operator assertions.

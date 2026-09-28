# Design

Primary scope: deterministic film tooling on 0.11.0-beta.1. Stage 0 routed the request to
motion-graphics / product-launch-video (`job-plan.json`). Project DESIGN.md and MOTION.md stay
authoritative; the repository interface remains static and adds no runtime dependency. The
choreography module is a reference asset loaded by target HyperFrames compositions, not motion
executed by the package.

Storyboard (`design-pipeline.film-storyboard.v1`): film-level grammar, benefit, proof action and
sound plan; beats carry time range, role (action, title-hold, brand-hold), subject, product action,
transformation kind with from/to states, handoff, motion vocabulary, optional choreography id and
bound sound cues. Shape errors throw contract errors; quality problems return findings so an agent
can revise and rerun. Heuristics: surface-only motion = every motion entry is in a fade/scale/slide
set; slideshow = more than half of handoffs are reset/dissolve, or a reset/dissolve joins two
surface-only beats; holds may not exceed 25% of runtime or appear consecutively; scored films need
an entry cue and cues bound to at least half of the action beats.

Render evidence uses ffmpeg/ffprobe, already required by HyperFrames rendering:
`select=gt(scene,T)` for cuts, an energy-flux onset detector over 8 kHz mono PCM for audio accents,
and midpoint frame extraction tiled into a contact sheet. Results report
`creativeAcceptance: not-assessed` and a limits statement so evidence is never mistaken for review.

Choreography patterns only tween transform aliases, opacity and clipPath, position every tween
absolutely, never repeat infinitely and never read clocks or randomness. A test enforces this and
registry/module parity.

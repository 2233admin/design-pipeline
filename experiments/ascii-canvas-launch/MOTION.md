---
schema: design-pipeline.motion-foundation.v0.1
name: SeedController launch motion
posture: cinematic
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Launch Motion

## Motion Thesis
A quiet seed expands into a structured creative canvas; connections resolve into an image.
Hold important words before advancing and finish with at least three seconds of stillness.

## Motion Principles
- One timeline owns all visual state; frame position can be sought and replayed.
- Prefer ease-out reveals, smooth camera pushes, and restrained crossfades.
- Use readable static chapter selections when motion is reduced.

## Motion Vocabulary
- primitive: transform.orbit — the ASCII seed's projected circular point field.
- primitive: reveal.trim-line — expose node connections in sequence.
- Supporting camera scale and opacity transitions preserve each scene's focal point.

## Procedural Motion
Declarative model: sample a torus on a 100 by 38 character grid with fixed angular sample steps.
Rotation phase derives from timeline seconds, with no random seed or wall-clock source. Landscape
fields use fixed trigonometric height bands and a deterministic symbol ramp. No particle physics.

## Runtime Policy
GSAP 3.13.0 owns one finite 40-second timeline. ASCII frames are sampled only when the quantized
timeline frame changes, at 24 samples per second. No independent requestAnimationFrame loop.
The preview adapter may play the timeline; composition data remains frame-addressable.

## Reduced Motion
Fallback: start paused on the end card. Chapter selection shows a held representative frame.
Explicit play remains available; when the system switches to reduced motion, pause immediately.

## Source Decisions
- Adopted: project-owned orbit and line-reveal semantics, GSAP timeline API, original artwork.
- Rejected: copied launch footage, random frame generation, CSS animation loops, remote runtime assets.

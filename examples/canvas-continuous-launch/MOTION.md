---
schema: design-pipeline.motion-foundation.v0.1
name: SeedController continuous film motion
posture: cinematic
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Launch Motion

## Motion Thesis
A cursor becomes a prompt; its output connection leads the camera to a forming image. The same
image resolves in color, expands into a storyboard and contracts into the closing brand mark.

## Motion Principles
- One timeline owns all visual state; frame position can be sought and replayed.
- Use anticipation, acceleration along the connection, and a held full-color payoff.
- Use readable held frames when motion is reduced.

## Motion Vocabulary
- primitive: transform.orbit — the opening seed's projected character ring.
- primitive: reveal.trim-line — expose node connections in sequence.
- A single camera follows persistent actors through world space; cuts are not needed here.

## Procedural Motion
Declarative model: fixed character samples form the opening ring and a 112 by 56 luminance field.
Time-derived interpolation assembles the image field and sweeps color through it. Camera position,
zoom, node geometry and line reveal are pure functions of timeline seconds. No particle physics.

## Runtime Policy
GSAP 3.13.0 owns one finite 22-second timeline. Static image glyphs are cached after assembly;
the composition renders on timeline updates. No independent requestAnimationFrame loop.
The preview adapter may play the timeline; composition data remains frame-addressable.

## Reduced Motion
Fallback: start paused on the end card. Progress seeking shows a held representative frame.
Explicit play remains available; when the system switches to reduced motion, pause immediately.

## Source Decisions
- Adopted: project-owned orbit and line-reveal semantics, GSAP timeline API, original artwork.
- Rejected: copied launch footage, random frame generation, CSS animation loops, remote runtime assets.

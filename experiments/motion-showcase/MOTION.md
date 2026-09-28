---
schema: design-pipeline.motion-foundation.v0.1
name: Motion Studies language
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Motion Studies

## Motion Thesis
Make orbital relationships and typographic rhythm visible through three deliberate compositions.
Animation is the exhibit; controls and body copy remain stable.

## Motion Principles
- Keep one dominant motion per study with quieter supporting details.
- Use transform and opacity; do not animate layout or blur.
- Start with a usable, readable composition and preserve it when animation is paused.

## Motion Vocabulary
- primitive: transform.orbit — circular paths tie satellites to the central blue sculpture.
- Supporting transitions: typography moves as a repeated strip, and composition layers enter
  together over 700ms. These specialize position and phase, with no procedural randomness.

## Procedural Motion
Disabled. Every path, phase, and delay is authored and deterministic. Pointer response is bounded
to six degrees and belongs only to the poster's decorative interior.

## Runtime Policy
CSS owns animations. IntersectionObserver starts the scroll composition; pagehide disconnects
observers and pointer listeners. No animation library or continuous JavaScript render loop.

## Reduced Motion
Fallback: pause all loops, show scroll content in its final pose, disable pointer tilt, and use
immediate anchor navigation. A visible pause control offers the same static composition on demand.

## Source Decisions
- Adopted: clean-room transform.orbit semantics from the project registry.
- Rejected: external showcase source and decorative motion on navigation controls.

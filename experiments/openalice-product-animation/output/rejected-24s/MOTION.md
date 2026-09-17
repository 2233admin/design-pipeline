---
schema: design-pipeline.motion-foundation.v0.1
name: OpenAlice product-film motion language
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
primitives:
  - reveal.trim-line
proceduralMotion:
  policy: disabled
runtimePolicy:
  runtime: gsap
  dependencies: GSAP 3.15.0 and HyperFrames 0.8.46
  rationale: One finite deterministic composition timeline supports frame seeking and autonomous preview.
  cleanup: Preview pauses the timeline on pagehide and stops control updates; no composition-owned clock.
reducedMotion:
  substitute: Preview opens on a static final overview and offers explicit playback and scene stepping.
sourceDecisions:
  - source: skill/references/hyperframes.md
    adopted: Paused timeline ownership and deterministic seekable composition.
    rejected: Network-dependent media and infinite motion.
    codeCopied: false
---

# Motion Foundation

## Motion Thesis

Research accumulates; execution waits. The same advancing line ties the product story together and stops at the human boundary.

## Motion Principles

One focal motion at a time. Short entrances, long readable holds. No bounce, flashing, random movement, or perpetual orbit. Preview playback advances presentation only, never trade approval.

## Motion Vocabulary

Use `primitive: reveal.trim-line` for the accumulating research spine. Supporting opacity and transform interpolation directs attention within the fixed stage; scene changes consistently advance from right to left.

## Procedural Motion

Disabled. All values are authored timeline keyframes.

## Runtime Policy

GSAP owns one 24-second timeline. HyperFrames owns offline time; a separate preview host plays that same timeline in real time. No Date.now, performance.now, scroll events, or network requests in the composition.

## Reduced Motion

Fallback is a static final overview with scene stepping and an explicit play control. The exported film retains its authored motion; users choose whether to play the MP4.

## Source Decisions

- Adopted: the bundled HyperFrames composition contract and the existing product's inspectable Git-trail metaphor.
- Rejected: scroll-driven triggers and any automated approval demonstration.

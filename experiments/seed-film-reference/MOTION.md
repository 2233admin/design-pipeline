---
schema: design-pipeline.motion-foundation.v0.1
name: Field Notes film motion
posture: cinematic
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Film motion

## Motion Thesis
Moving subjects establish creative value; image details become annotations and connected canvas
relationships. Editing and sound carry the rhythm; graphics explain selected moments.

## Motion Principles
- Preserve the footage's internal motion and vary shot scale with deliberate cuts.
- Align main transitions to the score's musical phrases while leaving space for reading.
- Use a shared source shot when moving from full-frame imagery into the canvas.

## Motion Vocabulary
- primitive: reveal.trim-line — annotations, frame corners and graph connections.
- primitive: transform.orbit — limited deterministic marker arcs around image detail.
- Supporting video crops, masks and scale changes serve the edit rather than isolated section entrances.

## Procedural Motion
Declarative model: fixed normalized annotation anchors and source-clip windows are sampled from
composition time. Video content supplies complex motion. No simulation, render-time randomness or
network-dependent imagery. Any short repeat is a deliberate asset loop with a recorded source window.

## Runtime Policy
One finite paused GSAP timeline owns 32 seconds of composition time. Local muted source videos and
one stereo soundtrack synchronize against this time. Frame-readiness callbacks refresh held frames
after seeking; they do not advance animation. Canvas uses 1600x900 coordinates.

## Reduced Motion
Fallback: start held before playback, with an explicit play-with-sound control. A reduced-motion change pauses
playback. Transcript remains readable without playing. User-controlled seeking shows held frames.

## Source Decisions
- Adopted: existing GSAP runtime and original local media-composite renderer.
- Rejected: infinite autoplay, copied reference soundtrack, independent animation loops.

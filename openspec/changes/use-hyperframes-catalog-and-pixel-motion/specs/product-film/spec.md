# Product film delta

## Requirement: catalog reuse
The pipeline SHALL search the HyperFrames block catalog for a beat's action, SHALL let a
storyboard beat name a block, and SHALL report a named block that the project's catalog does not
contain.

## Requirement: runtime-faithful capture
The pipeline SHALL capture HyperFrames project timelines under the HyperFrames runtime and SHALL
fail, rather than return an empty timeline, when nested compositions cannot load.

## Requirement: procedural motion
Tweens that animate only non-DOM driver objects SHALL NOT count as subject motion in the timeline
gate. The render gate SHALL measure per-beat pixel motion and SHALL fail an action beat that is
frozen in the rendered film.

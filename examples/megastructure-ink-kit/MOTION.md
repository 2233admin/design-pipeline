---
schema: design-pipeline.motion-foundation.v0.1
name: Megastructure Ink motion
posture: minimal
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Megastructure Ink motion

## Motion Thesis
Machines that listen: lights blink on hard steps, scans sweep slowly, terminal lines print character by
character. Nothing eases in for show; the page is still unless a signal is live.

## Motion Principles
- Hard on/off for anything that signals (blink, alarm): `ease-step`, never a fade.
- Slow, linear sweeps for anything that measures (scan heads, sonar): `dur-scan`.
- Content is readable at rest; every print and trace ends where the static page already is.

## Motion Vocabulary
- primitive: reveal.trim-line — frames and rules trace in from their corner over 640ms (`dur-reveal`,
  `ease-trace`).
- Supporting transitions: hover 120ms (`dur-fast`, `ease-standard`); tabs, toggles and the dialog rise 200ms
  (`dur-base`); terminal lines print at 28ms a character (`dur-type`); the live dot and cursor blink every
  1060ms (`dur-blink`); the alarm frame blinks every 880ms (`dur-alarm`, under 3 flashes a second); loaders and
  the sonar sweep once every 4200ms (`dur-scan`).

## Procedural Motion
Disabled. Every duration and curve is a token; the plates are drawn once per size, not animated.

## Runtime Policy
CSS owns every animation and transition; `kit.js` only toggles attributes, draws plates on load and resize,
and appends terminal lines. No animation library and no animation loop in JavaScript.

## Reduced Motion
Fallback: under `prefers-reduced-motion: reduce` every animation and transition runs for 1ms once, so
blinking stops, scans hold and terminal lines appear whole.

## Source Decisions
- Adopted: hard-step blinking and slow scans measured on the reference monitors' cadence by eye from stills
  (no timings were captured from video; the durations are ours).
- Rejected: glitch effects and screen shake; they read as noise in a grammar about silence.

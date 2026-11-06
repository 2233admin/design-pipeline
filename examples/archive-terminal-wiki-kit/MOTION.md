---
schema: design-pipeline.motion-foundation.v0.1
name: Archive Terminal motion
posture: minimal
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Archive Terminal motion

## Motion Thesis
Motion confirms state and draws the terminal's lines: strips, bars and underlines wipe in from the left; panels
rise a few pixels; nothing loops except the live dot and loading sweeps.

## Motion Principles
- One wipe per element, left to right, on first paint or when its state turns on.
- Animate transform, opacity and clip only; never layout.
- Content is readable at rest; every entrance ends where the static page already is.

## Motion Vocabulary
- primitive: reveal.trim-line — the 3px signal strip, the modal accent bar, the tab underline and the tile hover
  strip scale in from the left edge over 450ms (`dur-wipe`, `ease-out-expo`); the archive title prints left to
  right over 560ms.
- Supporting transitions: hover colour 150ms (`ease-standard`); side nav width 200ms; drawer and modal 260ms
  (modal: 10px rise, 0.98 → 1 scale, `ease-out-expo`); section reveal 600ms 8px rise (`ease-out-quint`) with an
  80ms stagger; counter bars grow from the baseline with a 40ms stagger; toasts slide 12px from the left; the
  live dot and skeletons pulse every 2400ms; the modal close tile turns 90° on hover.

## Procedural Motion
Disabled. Every duration, delay and curve is a token; no random or physics-driven motion.

## Runtime Policy
CSS owns every animation and transition; `kit.js` only toggles attributes (`data-theme`, `data-nav`,
`data-drawer`, `aria-selected`, `open`). No animation library and no animation loop in JavaScript.

## Reduced Motion
Fallback: under `prefers-reduced-motion: reduce` every animation and transition runs for 1ms once, so wipes,
reveals and the modal entrance show their end state immediately and the live dot stops pulsing.

## Source Decisions
- Adopted: durations and curves measured on the reference (150ms hover, 200ms nav, 260ms drawer, 450ms wipe,
  560ms title print, 600ms reveal, 2.4s live pulse; expo, quint and standard curves), rebuilt in our own CSS.
- Rejected: the reference's opening splash animation and glitch effects; a first-visit splash blocks reading.

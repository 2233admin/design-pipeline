# The 12 principles of animation, applied to motion graphics

The Disney principles, translated to UI/motion-graphics with concrete numeric examples. Ordered by how often they matter in screen motion (most-used first).

## 1. Slow in and slow out (easing)

The most important. Objects accelerate and decelerate; they don't snap to constant velocity.

Example: a card sliding in from the right travels 600px over 450ms with `cubic-bezier(0.16, 1, 0.3, 1)` (easeOutExpo) — fast at first, settling gently into place.

## 2. Timing

Number of frames / duration defines weight and mood. Fast = light/urgent, slow = heavy/calm.

Example: a 24px notification badge pops in over 150ms; a full-screen onboarding panel slides over 500ms. Same easing, different timing communicates different mass.

## 3. Follow-through and overlapping action

Parts don't all stop at once; trailing elements continue and settle after the lead.

Example: a hero card lands at 400ms; its drop-shadow finishes settling at 450ms, its title text at 460ms, its subtitle at 500ms — a 40-60ms cascade rather than a synchronized stop.

## 4. Anticipation

A small opposite move telegraphs the main action.

Example: a "send" button scales to `0.95` over 80ms (the dip), then springs to `1.0` and the message launches. Or a modal dips `y: +8px` for 60ms before sliding up — the recoil makes the launch feel powered.

## 5. Staging (focal direction)

Direct attention to one thing at a time; the motion makes the important element unambiguous.

Example: dim background to 40% opacity over 200ms while the target element scales `0.9 -> 1.0` and brightens — the eye has exactly one place to land.

## 6. Arcs

Natural movement follows curved paths, not straight lines.

Example: a floating action button moving from bottom-right to center-screen animates along a quadratic bezier path instead of a diagonal line; the slight arc reads as organic rather than mechanical.

## 7. Squash and stretch

Volume-preserving deformation conveys impact and elasticity.

Example: a bouncing dot stretches `scaleY 1.2 / scaleX 0.85` at the top of its arc and squashes `scaleY 0.8 / scaleX 1.15` on landing impact. Keep the product of scales ≈ 1 to preserve perceived volume. Use sparingly in product UI; common in playful loaders and mascots.

## 8. Exaggeration

Push the key pose beyond literal realism for clarity and appeal.

Example: a success checkmark overshoots to `scale 1.15` before settling to `1.0` (using easeOutBack `0.34, 1.56, 0.64, 1`); the overshoot makes success feel emphatic.

## 9. Secondary action

A subordinate motion supporting the primary one.

Example: while a panel slides up (primary), its icon rotates 90deg and a subtle particle shimmer fades in (secondary) — supporting, never competing for attention.

## 10. Straight-ahead vs. pose-to-pose

Pose-to-pose (define keyframes, interpolate between) is the norm for choreographed motion graphics; straight-ahead (frame-by-frame, momentum-driven) suits chaotic/organic effects like particles, smoke, and procedural noise.

Example: a logo build is pose-to-pose (start pose, end pose, eased between); a confetti burst is straight-ahead/physics-driven.

## 11. Solid drawing (depth and weight)

Maintain consistent perspective, volume, and lighting so motion respects 3D space.

Example: when a 2.5D card tilts on hover (`rotateY 8deg`), its shadow shifts and lengthens consistently and a subtle specular highlight sweeps — selling that it's a solid object catching light, not a flat sticker.

## 12. Appeal

The composite charm — clean silhouettes, confident timing, no jank. Achieved by applying the other 11 with restraint: correct easing, deliberate timing, follow-through, a touch of overshoot, and removing anything that competes.

Example: a polished toggle = 180ms easeOutCubic slide, a 40ms follow-through on the label color, a hairline overshoot on the knob — small, coherent, satisfying.

## Practical priority for screen motion

For most product/web work, nailing **slow-in/slow-out, timing, follow-through, anticipation, staging, and arcs** delivers 90% of the quality. Squash/stretch, exaggeration, and secondary action add personality where the brand calls for it.

---
Apply the twelve principles with restraint and UI motion reads as intentional. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=animation-principles)** — the AI motion agent for editable, on-brand motion graphics.

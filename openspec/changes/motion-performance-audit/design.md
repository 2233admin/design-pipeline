## Context

`skill/scripts/interaction-audit.cjs` holds the probe contract, the in-page `auditPage` function and
the summary. `auditPage` is shipped to the page as source text, so everything it needs arrives as
plain JSON in `options` and `pass`. Each audit row must report exactly the codes of `AUDIT_CODES`.
`audit.reduced-motion` already walks `document.getAnimations()` one second after load.

## Decisions

1. **A code, not a gate.** `audit.motion-properties` is appended to `AUDIT_CODES`, so existing
   indices hold. It is required: it needs no selector or threshold, and a page with no timed
   transition and no animation reports `not-applicable`, which the row and native completion accept.

2. **One definition, passed in.** `MOTION_PROPERTIES` (exported) holds the layout property names,
   the blur properties and the exemption selector. `auditPass("audit")` copies it into
   `pass.motion`; `auditPage` throws when it is missing, so a caller that builds its own pass cannot
   skip the check. `evals/ablation/measure.mjs` builds its pass with `auditPass` and needs no edit.

3. **Transitions are read from computed style.** For every element under `body`, and for its
   `::before` and `::after` when they have content, `transition-property` and `transition-duration`
   are paired (a shorter duration list repeats). An entry with a duration above zero is judged:
   `all` fails, a layout property fails. This judges a closed menu, a hidden dialog and an unhovered
   button without opening them, which the animations list cannot do. `transition: all 0s`, the
   initial value, is not a transition.

4. **Layout properties.** The upstream rule names `width`, `height`, `top`, `left`, `margin`,
   `padding`. The list adds only the names a browser reports for the same declarations: `right` and
   `bottom` (the `inset` shorthand expands to all four), the longhands that `margin`, `padding` and
   `inset` expand to in keyframes, the shorthands that `transition-property` keeps, and the logical
   aliases (`inline-size`, `block-size`, `inset-*`, `margin-*`, `padding-*`). `min-`/`max-` sizes,
   border widths and grid tracks are left out: the rule does not name them.

5. **Animations.** Each entry of `document.getAnimations()` with an element target, a keyframe
   effect and a play state other than `idle` is judged, except CSS transitions (decision 3 covers
   them). A layout property among its keyframe properties fails, whatever the play state: a paused
   or finished-and-filling animation still animates that property when it plays. For an infinite
   animation (`iterations` or `endTime` infinite): a `blur(` value in any `filter` or
   `backdrop-filter` keyframe fails; and when it is `running`, its target has a box, the target is
   not skipped by `content-visibility: auto` (`checkVisibility({ contentVisibilityAuto: true })`)
   and the box lies wholly outside the viewport, it fails with the distance and the side.

6. **Exemption.** Motion on or inside `STILL_MOVING.essential` is counted as checked and not
   judged. A progress bar that transitions `width` inside `role="progressbar"` passes, as its
   spinner does under reduced motion.

7. **Count.** `checked` is the number of elements or pseudo-elements with a timed transition plus
   the number of animations judged, exempt ones included.

8. **Findings.** One per element for `all`, one per element listing its layout properties, one per
   animation and defect. Each carries the selector (with the pseudo-element), expected, actual and
   a fix that names the swap: listed properties; `scale()` or `translate()`; a one-shot blur or an
   opacity fade of a blurred layer; `animation-play-state` from an IntersectionObserver or
   `content-visibility: auto`.

## Why these four and not the rest

The rules judged here have one reading. A property name is a layout property or it is not; a loop
is running off screen or it is not. The rules left to review depend on the project: its motion
tokens set the easing and the duration budget, a ripple or a particle legitimately starts at
`scale(0)`, a centered modal legitimately scales from its center, and hover gating applies "where
applicable". An audit finding fails the probe stage and cannot be waived, so a rule with a
legitimate exception does not belong in it.

## Sources

Our own code; no upstream text is copied. Rules read at the locked revisions:
ibelick/ui-skills `skills/baseline-ui/SKILL.md` (Animation) and
`skills/fixing-motion-performance/SKILL.md` (MIT, lock entry `ibelick-ui-skills-rules`);
vercel-labs/web-interface-guidelines `command.md` (Animation; MIT, lock entry
`web-interface-guidelines`); emilkowalski/skills `animation-performance` as distilled in
`animation-opportunity-and-review.md` section 5.

## Risks

- Motion driven by `requestAnimationFrame` or by a library that writes inline styles each frame is
  not in `getAnimations()`; `UC-42` and `UC-06` keep it as a review.
- A keyframe animation that has ended without a fill mode is gone at the reading and is not
  judged. Transitions do not have this gap.
- A loop that is on screen at rest and scrolls out later is not followed (`UC-43`).
- A stylesheet framework that ships `transition: all` on a class the page uses now fails the page.
  That is the rule; the fix is to name the properties.

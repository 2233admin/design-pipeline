## Decisions

1. Emulate with `page.emulateMediaFeatures([{name: "prefers-reduced-motion", value}])` before navigation, so
   CSS media queries and `matchMedia` both see it.
2. Animation inventory: `document.getAnimations()` filtered to `playState === "running"`, reading each effect's
   computed timing and the animated properties from its keyframes. "Moving" properties are `transform`,
   `translate`, `rotate`, `scale`, `top`, `left`, `right`, `bottom`, `width`, `height`, `margin*`, `inset*`,
   `offset*` and `background-position`.
3. Pixel change: five viewport screenshots 250 ms apart during the second second, changed share computed with
   the existing `motionMap` from `visual-diagnostics/diagnostics.cjs`. Threshold 0.5 %.
4. Script-driven motion (canvas, rAF) shows up only in pixel change; that is the reason for measuring pixels too.

## Risks

- A carousel that auto-advances once after more than one second can be missed; the report lists the measured
  window so the reviewer knows what was covered.

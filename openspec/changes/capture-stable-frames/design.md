## Decisions

1. New `skill/scripts/capture-stability.cjs` exports `freezeMotion(page)` and `settle(page, {attempts: 5,
   intervalMs: 100})`. `page-refs-core.cjs`, `capture-composition.cjs` and `capture-web-evidence.cjs` import it;
   the copy in `page-refs-core.cjs` is deleted.
2. Freeze CSS: `animation-play-state: paused`, `transition: none`, `caret-color: transparent`; pause every
   `document.getAnimations()` entry; await `document.fonts.ready`.
3. Settle compares PNG bytes of consecutive viewport screenshots (full-page where the caller already takes
   full-page). Equal bytes means stable; the stable screenshot is the one written.
4. `verify composition` reads `stabilization` from `elements.json` when present; `stable: false` adds a
   `capture-unstable` warning. Absent field means an older capture and adds nothing.

## Risks

- Freezing pauses an entrance animation mid-way when the page has not finished it. Settle runs after
  `networkidle0`, and the screenshot shows the paused state honestly; the warning only fires when the page
  keeps changing after freezing.

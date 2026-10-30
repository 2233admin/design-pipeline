## Decisions

1. New `skill/scripts/capture-stability.cjs` exports `freezeMotion(page)` and `settleScreenshot(page, {attempts: 5,
   intervalMs: 100, fullPage})`, returning `{png, attempts, stable}`. `page-refs-core.cjs` imports `freezeMotion` and
   deletes its copy; its existing `settle(page)` is unrelated and stays.
2. Freeze CSS: `animation-play-state: paused`, `transition: none`, `caret-color: transparent`; pause every
   `document.getAnimations()` entry; await `document.fonts.ready`.
3. Order in `composition capture`: navigate, optional `--seek`, `freezeMotion`, `settleScreenshot`, then read elements.
4. `verify composition` reads `stabilization` from `elements.json` when present; `stable: false` adds a
   `capture-unstable` warning. An absent field means an older capture and adds nothing.
5. `refs.json` `captureMethod` is compared with the current method constant; a lower value is stale.

## Risks

- Freezing pauses an entrance animation mid-way when the page has not finished it. Settling runs after `networkidle0`
  and the screenshot shows the paused state honestly; the warning only fires when the page keeps changing after freezing.

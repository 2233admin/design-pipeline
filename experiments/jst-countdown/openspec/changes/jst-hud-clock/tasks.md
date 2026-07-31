# Tasks — jst-hud-clock

## Tokens / Theme

- [x] Define amber phosphor token set from project `DESIGN.md`
- [x] Define `--u` board unit and derived type scale
- [x] Define font stacks for numeral / JP / tech roles

## Layout

- [x] Stage with fixed perspective and perspective-origin
- [x] Single projected plane; no per-element skew
- [x] Three-register grid with label / mark / readout columns
- [x] Register one oversized and badge-less
- [x] Deliberate bleed on left, right, and bottom edges
- [x] Converging hairlines drawn in plane space

## Components

- [x] `label-block` — open stroked box, leading tick, JP label + Latin gloss
- [x] `mark-badge` — notched cartouche, fixed width per code length
- [x] `readout` — digit pairs, kanji units, superscript Latin units
- [x] `.53` decimal tail at reduced size on the `T+` register
- [x] Emission layer shared across the plane

## States

- [x] `ticking` for live registers
- [x] `cropped` for the bottom register
- [x] `stale` dimming path wired to the clock's own staleness check
- [x] `held` variant available for a frozen register

## Motion

- [x] Single wall-clock-aligned value clock (`setTimeout` chain) owning all registers and the noise
      scalar; the only other timer is the 1Hz staleness watchdog, which writes state only
- [x] Discrete `tick`, no interpolation
- [x] `phosphor` surface noise via `feTurbulence`, composite-only
- [x] `phosphor` opacity driven on the value clock by a seeded noise generator with no cycle
      detectable inside the supported 30-minute / 10Hz observation window, not by a CSS keyframe
      cycle
- [x] Pause surface noise when the document is hidden
- [x] `dim-stale` 240ms ramp

## Motion Spec

- [x] `motion.md` records project `MOTION.md` hash and selected primitive ids
- [x] Provenance recorded as authored, not observed

## Scene / Runtime Spec

- [x] Not required — route is `2.5d` with no persistent engine-owned state (recorded in `reference.md`)

## Accessibility

- [x] Semantic `main` / `section` structure with accessible names
- [x] `<time datetime>` for every live value
- [x] `aria-live="off"` on all ticking values
- [x] Decorative layers and duplicate unit marks `aria-hidden`
- [x] Contrast posture verified against the token table
- [x] Reduced-motion fallback for `phosphor` and `dim-stale`

## Responsive QA

- [x] Rigid scaling via `--u` at desktop
- [x] Camera pull-back below 640px instead of a reflow
- [x] No horizontal or vertical scrollbar at any tested width
- [x] No clipped or overlapping text at 360px

## Browser / Manual QA

- [x] Rendered in a real browser and inspected
- [x] Fixed-advance numerals verified by substituting `8` for every digit
- [ ] Reduced-motion path verified with the emulated media feature — **not run**. `browse` denies
      `Emulation.setEmulatedMedia` under its CDP allowlist (see `qa.md` Validation Gaps)
- [x] Reduced-motion rules read out of the CSSOM as the next-best check — declarations only, which
      is why it missed the resolved-cascade defect recorded in `qa.md`
- [x] Reduced-motion fallback verified by resolved `getComputedStyle` opacity in a browser whose
      `prefers-reduced-motion` was already `reduce`
- [ ] Measured reconstruction gates — **blocked**, source file unavailable (see `qa.md`)
- [ ] Graybox gate — **blocked**, `graybox-missing`: no graybox capture or block was ever produced.
      Unlike the gates above this one needs no source raster, so it is a process gap (see `qa.md`)

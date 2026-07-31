# Change Design — jst-hud-clock

Foundation: project `DESIGN.md` — `JST Mission Clock Board`,
sha256 `eccabd1a28b42adfd439386b0feaad1ff1d8d3a1e62cd9ae15dc9d9436f44063`.
Route: `2.5d`, fixed perspective, locked cinematic frame (see `reference.md`).

## Layout Grid And Projection

The plane is authored flat, then projected once. Nothing is skewed individually.

- Stage: full viewport, `perspective: 1150px`, `perspective-origin: 38% 44%`.
- Plane: `108vw` wide, `128vh` tall, at `top: -7vh; left: -7vw`, bleeding past the left, right, and
  bottom edges.
- Plane transform: `rotateZ(-2.4deg) rotateY(-13deg) rotateX(2.5deg)`, giving the near edge on the
  right, a camera slightly below the plane, and a small roll.
- Board unit `--u`: `clamp(7px, min(3.95vh, 2.62vw), 36px)`. Every size in the board derives from
  it, so the board scales as one rigid object.
- Plane grid: three register rows at `1.5fr / 1fr / 1fr`. Registers two and three use a
  `[label] [mark] [readout]` column set at `minmax(0, 15u) minmax(0, 7u) 1fr`.
- Register one is not a three-column row. Its label sits above and left of a full-width readout so
  the numerals own the whole plane width. It has no badge.
- Gaps: `0.5u` inside a cell, `1.4u` between columns, `1.1u` between registers.

Responsive — the board is always one rigid object; only the camera moves.

- `>=900px` landscape: as above.
- `<900px` landscape: `rotateY(-9deg)`.
- Aspect ratio at or below `13/10` (portrait and near-square): the camera pulls back to
  `perspective: 1900px`, `rotateY(-8deg)`, `rotateZ(-1.6deg)`. `--u` switches to `100vw / 50`
  because the board is about 50u wide, and the plane is vertically centred at `height: 27u` instead
  of bleeding off the bottom. Label and badge columns narrow to `13u` and `6u`. The grid never
  reflows and the plane never becomes a stacked list; the whole board is simply seen from further
  away.

## Color Tokens

Taken from project `DESIGN.md`; no new hue is introduced.

```
--ink-void: #0b0906;   --ink-panel: #171208;   --ink-panel-lit: #241a0b;
--amber-core: #fff8dc; --amber-bright: #ffe9a3; --amber: #f0b03c;
--amber-dim: #c07f24;  --amber-faint: #7a5218;
--glow-warm: rgba(255,190,70,.55); --glow-cool: rgba(255,240,190,.35);
```

Contrast posture: numerals >12:1 on panel; `--amber-dim` glosses held at or above 4.5:1;
`--amber-faint` used only for 1px structure, never for text. Saturation falls as luminance rises.

Token values are approximated by eye from the supplied frame. They are not sampled measurements,
and are recorded as such in `reference.md` section 6.

## Type Scale

| Role | Font var | Size | Applied to |
| --- | --- | --- | --- |
| display | `--font-numeral` | `7.2u` | JST live numerals |
| value | `--font-tech` | `2.25u` | `T+` and GMT values |
| unit | `--font-jp` | `2.4u` | 時 / 分 / 秒 |
| label-jp | `--font-jp` | `1.35u` | boxed Japanese labels |
| label | `--font-tech` | `0.6u` | `Live`, `Countdown`, `GMT` |
| gloss | `--font-tech` | `0.5u` | Latin translations |
| micro | `--font-tech` | `0.85u` | superscript `h`/`m`/`s` |
| tail | `--font-tech` | `1.55u` | trailing `.53` decimal |

These ratios were calibrated against the reference frame by eye across four render passes. They are
tuned proportions, not measurements; see `qa.md` Fidelity.

Every row above is the value carried by the matching `--fs-*` custom property in `index.html`, and
project `DESIGN.md` now records the same set. The calibration originally landed here only, leaving
the foundation on its pre-render values (`value 3.1u`, `unit 2.0u`, `label 0.78u`, `gloss 0.62u`,
`micro 0.52u`, no `tail` step); that contradiction is closed by promoting the calibrated set into
`DESIGN.md`, not by reverting the implementation to numbers no render ever saw.

Two sizes in `index.html` are component-level and are deliberately not scale steps: the `GET` /
`GMT` sub-label at `0.78u` (`.stack .k--dim`) and the badge code at `0.95u` (`.badge`). Neither
table claims them, so neither is a scale contradiction — but they are untokenized, and a future
calibration pass should either fold them into the scale or leave them recorded here as exceptions.

All numerals use `font-variant-numeric: tabular-nums` and a fixed per-digit advance so an `8`
occupies exactly the space of a `1`.

Known gap: the source numeral typeface is not identified and no offline match exists. A system
ultra-heavy stack substitutes. This is the largest single fidelity deviation in the change.

## Component Inventory And States

| Component | States |
| --- | --- |
| `board-plane` | default only (locked camera) |
| `register` | `ticking`, `held`, `cropped`, `stale` |
| `label-block` | default, `stale` |
| `mark-badge` | default (fixed width per code length) |
| `readout` | `ticking`, `stale` |
| `emission` | `live` (animated grain), `reduced` (static grain) |

No hover, focus, pressed, or disabled state exists. The board takes no input, has no focusable
element, and exposes no pointer affordance.

## Motion Rules

Defined in `motion.md`. Summary: `tick` is discrete and instantaneous; `phosphor` is a
sub-threshold surface noise; `dim-stale` is a single 240ms luminance ramp. Under
`prefers-reduced-motion: reduce`, `phosphor` falls back to a static seeded texture and `dim-stale`
loses its ramp. `tick` is retained as an explicit, documented exception.

## Accessibility

- Semantic structure: the board is a `<main>` containing three `<section>` registers, each with an
  accessible name from its Japanese label plus Latin gloss.
- Each live value is a `<time>` element with a machine-readable `datetime`.
- Live regions: JST and GMT registers are `aria-live="off"`. A per-second announcement would be
  hostile to screen-reader users; the current time is available on demand from the `<time>` value.
- The `T+` register is also `aria-live="off"` for the same reason.
- Focus order: no interactive elements, therefore no focus trap and no tab stops to order.
- Decorative layers (grain, scanlines, vignette, bloom) are `aria-hidden="true"`.
- Contrast: numerals and kanji clear 12:1; glosses clear 4.5:1; hairlines are non-text.
- Reduced motion is honoured for all surface motion.
- The superscript unit letters and kanji unit marks are decorative duplicates of information
  already in the accessible name, so they are `aria-hidden` to avoid "zero zero h zero zero m"
  readback noise.

## Asset Strategy

No external assets. Grain is an inline SVG `feTurbulence` filter; bloom is layered `text-shadow`;
scanlines and vignette are CSS gradients. Fonts resolve from system stacks with no webfont fetch.
This satisfies the single-file, no-network constraint in `brief.md`.

## Anti-Template Decisions

Deliberately avoided: centred hero composition with symmetric margins; card stacks with rounded
corners and drop shadows; a second accent hue for status; gradient orbs; per-element skew used to
imitate perspective; odometer digit transitions.

Deliberately retained: a three-column register grid and monospace-style tabular numerals. These
are common patterns because they are correct for a clock board read at distance, and the source
frame uses both.

Product-specific rationale: the composition's signature is the deliberate crop and the single-hue
emissive material. Both come from the source frame rather than from a template family.

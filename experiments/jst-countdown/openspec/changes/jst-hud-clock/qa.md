# QA — jst-hud-clock

Surface: `experiments/jst-countdown/index.html` (single file, no dependencies).
Evidence: `qa-desktop.png` (1280x720), `qa-mobile.png` (375x812), captured with the gstack browse
headless Chromium.

## Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Visual | pass | Single-hue emissive composition, deliberate crop, no card stack, no second accent |
| UX | pass | One job, one glance; no controls to misuse; stale state defined |
| Engineering | pass | No dependency added, no build step, single file |
| Accessibility | pass with note | See below |
| Motion | pass | Only `tick`, `phosphor`, `dim-stale`; all justified in `motion.md` |
| Motion foundation | pass | project `MOTION.md` `ready`, hash `243bf67e…`, primitive `distortion.fractal-noise` exists in the bundled registry |
| Motion spec | pass | `motion.md` records trigger, purpose, timing, easing, choreography, interruption, library, budget, reduced-motion for each motion |
| Design foundation | pass | project `DESIGN.md` `ready`, hash `3d544262…` |
| Reference routing | pass | `reference.md` records four independent decisions and selects `2.5d` with confidence 0.85 |
| Exact reconstruction | **blocked** | see Fidelity below |
| Final fidelity | **blocked** | see Fidelity below |
| Scene/runtime | n/a | Route is `2.5d` with no persistent engine-owned state; no `scene.json` required |
| Responsive | pass | No scrollbar and no clipped text at 1280x720 or 375x812 |
| Manual QA | pass | Rendered and inspected in a real headless browser |
| Anti-slop | pass | Anti-template decisions recorded in `design.md`; no evaluator run (see gaps) |

## Measured Checks

| Check | Command / method | Result |
| --- | --- | --- |
| Console errors | `browse console` | none |
| Desktop overflow | `scrollWidth/clientWidth` | 1280 / 1280, 720 / 720 — no scroll |
| Mobile overflow | `scrollWidth/clientWidth` | 375 / 375, 812 / 812 — no scroll |
| Fixed numeral advance | measured `.digits` width with `00`, `88`, `11` | 224.6318px in all three cases — stable |
| Reduced motion | CSSOM inspection of the `prefers-reduced-motion` block | `.g1/.g2/.g3 { animation: none; opacity: fixed }`, `.register { transition: none }` |

## Scorecard

| Dimension | Score | Note |
| --- | --- | --- |
| Visual taste | 4 / 5 | Composition and material land; numeral face is a substitute |
| UX clarity | 5 / 5 | One job, unambiguous |
| Accessibility | 4 / 5 | Correct semantics; a very low-vision user is not the audience for a distance board |
| Responsiveness | 4 / 5 | Portrait keeps the object rigid but the board is necessarily small on a phone |
| Motion quality | 5 / 5 | Nothing moves that should not |
| Engineering fit | 5 / 5 | One file, zero dependencies, one timer |
| Performance risk | 4 / 5 | Three `feTurbulence` layers are the only real cost; composite-only |

## Fidelity

Requested fidelity is `exact-reconstruction` and has **not** been downgraded.

The measured reconstruction gates cannot run. The source frame exists only inside the conversation
transcript; it has no file path, no dimensions, and no SHA-256. Every artifact those gates require
(`rectified-reference.png`, `front-elevation.svg`, `camera-calibration.json`,
`landmark-overlay.png`, `fidelity-receipt.json`) is derived from source pixels, so none of them can
be produced. `reference-evidence.json` was deliberately **not** written, because its schema requires
a 64-hex source hash and writing a placeholder would make the contract validate while proving
nothing.

Consequence: this implementation is an **unverified reconstruction**. It may not be described as
exact, identical, 1:1, pixel-perfect, or complete. To close the gap the source image must be saved
to disk and its path supplied; the geometry and final gates can then run for real.

Known deviations already visible without measurement:

1. Numeral typeface is a system ultra-heavy substitute, not the source face. Largest single gap.
2. Camera angles (yaw -13°, pitch 2.5°, roll -2.4°, perspective 1150px) were tuned by eye against
   the frame, not solved from landmarks.
3. Colour tokens were estimated by eye, not sampled from the raster.
4. Content below the third register is not recoverable from the supplied crop and was not invented.

## Accessibility Note

All ticking values are `aria-live="off"` by design. A per-second live announcement would make the
page unusable with a screen reader. Current values remain available on demand through `<time
datetime>`. Kanji unit marks and superscript Latin unit letters are `aria-hidden` because they
duplicate information already in each register's accessible name.

## Validation Gaps

| Gap | Why | Next-best check performed |
| --- | --- | --- |
| Exact/final reconstruction gates | source file unavailable | route classification and fidelity invariants recorded in `reference.md` |
| Reduced-motion runtime emulation | `browse` denies `Emulation.setEmulatedMedia` (CDP allowlist) | CSSOM inspection of the resolved `prefers-reduced-motion` rules |
| Independent EvidencePort | `playwright` is not installed, so `capture-web-evidence.cjs` cannot run | screenshots captured through gstack browse and stored with the change |
| Anti-slop evaluator | `evaluate-anti-slop.cjs` needs a rubric-bound report input not produced by this run | anti-template decisions recorded manually in `design.md` |
| Contrast measured numerically | no sampling tool in the loop | token luminance ordering enforced by construction in `DESIGN.md` |

## Companion Skills

`check-deps.cjs` reported `requiredMissing: 52` and `result: FAIL`. That result is a false negative:
it resolves companions under `C:\Users\Administrator\.codex\skills` and does not recognise the
in-repo source layout, so it reports design-pipeline's own files as missing while running from
inside design-pipeline. No design companion skill (`frontend-design`, `design-taste-frontend`,
`ui-ux-pro-max`, `web-design-guidelines`, `emil-design-eng`) was available; their gates were applied
manually through `DESIGN.md`, `design.md`, and this checklist.

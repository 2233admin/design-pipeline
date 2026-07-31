# QA — jst-hud-clock

Surface: `experiments/jst-countdown/index.html` (single file, no dependencies).
Evidence: `qa-desktop.png` (1280x720), `qa-mobile.png` (375x812), captured with the gstack browse
headless Chromium.

Both screenshots predate the phosphor rewrite and the reduced-motion cascade fix. Every layout,
type, and colour measurement they support still holds — none of those changed — but they are not
evidence for the current grain layer, and they are not re-captures. They are labelled stale rather
than re-shot, because a re-shoot with no measurement attached would only look like fresh evidence.

## Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Visual | pass | Single-hue emissive composition, deliberate crop, no card stack, no second accent |
| UX | pass | One job, one glance; no controls to misuse; stale state defined |
| Engineering | pass | No dependency added, no build step, single file |
| Accessibility | pass with note | See below |
| Motion | pass | Only `tick`, `phosphor`, `dim-stale`; all justified in `motion.md`. Previously recorded as a pass while `phosphor` ran a 7.1s keyframe cycle against a contract that forbids one — the pass was asserted from `motion.md` alone and was never checked against the CSS |
| Motion foundation | pass | project `MOTION.md` `ready`, hash `165afdfa…`, primitive `distortion.fractal-noise` exists in the bundled registry |
| Motion spec | pass | `motion.md` records trigger, purpose, timing, easing, choreography, interruption, library, budget, reduced-motion for each motion |
| Design foundation | pass | project `DESIGN.md` `ready`, hash `eccabd1a…` |
| Reference routing | pass | `reference.md` records four independent decisions and selects `2.5d` with confidence 0.85 |
| Graybox | **blocked** | reason `graybox-missing` — see Graybox Gate below |
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
| Reduced-motion declarations | CSSOM inspection of the `prefers-reduced-motion` block | `.grain .g1/.g2/.g3 { opacity: fixed }`, `.register { transition: none }` |
| Reduced-motion resolved value | `getComputedStyle` on each grain layer in a browser already reporting `prefers-reduced-motion: reduce` | `0.3 / 0.18 / 0.22` — the static texture is actually visible |
| Surface noise, no detectable cycle in the supported window | replayed the shipped generator over the supported observation window — 30 minutes of wall clock at 10Hz — and searched every lag from 1s to 15 minutes for a repeat | 0 repeating lags found. This is the whole claim: the generator is finite and deterministic, so a period exists beyond the window and is not asserted either way |
| Surface noise amplitude | same replay, g1 envelope | `0.109–0.330`, inside the authored `0.10–0.34`; unchanged from the keyframe revision |
| Surface noise determinism | same input timestamp sampled twice | identical to the bit |
| `T+` machine-readable value | `#met` tag name and `datetime` attribute after a tick | `TIME`, `datetime="PT90S"` |
| Console errors after the phosphor rewrite | browser console | none |
| Timer inventory | read every scheduler call site in `index.html` rather than trusting the spec | one `setTimeout` chain re-armed at `100 - now % 100` (value clock, ~10Hz, owns all values and the noise scalar), one 1Hz `setInterval` (staleness watchdog, writes only `data-state`), one `visibilitychange` handler. Two timers, not one; `MOTION.md` and `motion.md` were corrected to say so |

The reduced-motion declaration check and the reduced-motion resolved-value check are listed
separately on purpose. The first one passed on the original build and the second one would not
have: the fallback was declared at `.g1` and lost the cascade to `.grain .g { opacity: 0 }`, so
reduced motion removed the texture instead of freezing it. Reading declarations out of the CSSOM
is not the same evidence as reading the value the browser resolved, and this checklist previously
treated it as if it were.

## Scorecard

| Dimension | Score | Note |
| --- | --- | --- |
| Visual taste | 4 / 5 | Composition and material land; numeral face is a substitute |
| UX clarity | 5 / 5 | One job, unambiguous |
| Accessibility | 4 / 5 | Correct semantics; a very low-vision user is not the audience for a distance board |
| Responsiveness | 4 / 5 | Portrait keeps the object rigid but the board is necessarily small on a phone |
| Motion quality | 5 / 5 | Nothing moves that should not |
| Engineering fit | 5 / 5 | One file, zero dependencies, one value clock plus a state-only watchdog |
| Performance risk | 4 / 5 | Three `feTurbulence` layers are the only real cost; composite-only |

## Graybox Gate

Status: **blocked**. Reason: `graybox-missing`.

- `reconstruction check --stage graybox` status: blocked — no `graybox` block exists on any carrier,
  and this change has neither a `reconstruction.json` nor a `reference-evidence.json` to hold one.
- Capture path and captured at: none. `graybox.png` was never produced.
- Declared runtime graybox mode: none. `index.html` exposes no documented mode that disables the
  emissive, optical, and texture layers.
- Suppressed treatments listed: none.
- Comparison mode declared: none. Had one been declared, it could only have been `qualitative`; a
  `measured` claim would be refused with `graybox-comparison-unmeasurable`, because the source is
  not resolved to a raster on disk.
- `fidelityEvidence`: false.
- Region findings: none. No `composition` is recorded anywhere for a comparison to bind to, so a
  region comparison written now would itself block with `graybox-composition-unrecorded`.
- Graybox approval status: none.
- Graybox passed before materials, glow, bloom, depth of field, scanlines, and grading: **no**. All
  six were authored without the gate ever running. Bloom (`text-shadow` stacks), grain, scanlines,
  vignette, and defocus all shipped ahead of a gate that exists to hold them back.
- `geometry` stage status recorded separately: blocked, source raster unavailable — see Fidelity.

This is a **process gap, not an environmental limit**, and it is a different kind of failure from
the one recorded under Fidelity. The measured geometry and final gates cannot run because the source
frame has no file path; that is outside this change's control. The graybox gate is unconditional
across every route including `2.5d`, applies at every fidelity mode, applies to runs whose source is
`pending`, needs no source raster, and costs one screenshot. Nothing prevented it. It was simply not
run, and the layout was never checked against the reference before optical treatment was painted on
top of it.

Consequently the ordering guarantee the gate exists to provide is absent here: no record shows the
composition was correct before bloom and grain made it harder to judge. Closing this needs a
documented graybox runtime mode, one capture, and a recorded structural comparison — none of which
wait on the source file.

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

Verification claim: **unverified**. `stages.graybox`, `stages.geometry`, and `stages.final` are all
blocked, and any one of them alone would produce this claim. Fixing the phosphor generator, the
reduced-motion cascade, the `T+` `<time>` element, and the type-scale contradiction improved the
artifact; none of it is a measurement against the source, so none of it moves this claim. The
reconstruction remains unverified.

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
| Graybox gate | **blocked**, reason `graybox-missing`. No environmental blocker existed; the gate was simply not run, so the block is a process gap rather than an environmental limit | none. There is no next-best check for an ordering gate that was skipped |
| Reduced-motion runtime emulation | `browse` denies `Emulation.setEmulatedMedia` (CDP allowlist) | resolved `getComputedStyle` opacity in a browser already reporting `prefers-reduced-motion: reduce`, plus CSSOM inspection of the declarations |
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

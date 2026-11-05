## Context

Stacked on `public-domain-materials` (#287 / PR #289): materials have a catalog (`materials/licenses.json`),
provenance, lineage and `materials check`. Ported from the scratch study's Python
(`gen_raster.py`: numpy/OpenCV fbm paper, dot tiles, speckle overlays; `kit.cjs`: SVG corridor,
stairs, windows, checker, cut-out shapes) to dependency-free Node on typed arrays, as the rest of the
runtime. Everything below was measured in this environment on 2026-11-05.

## Decisions

1. **Statistic: L* band amplitudes, not a perceptual model.** Texture is compared on CIE L*
   (`texture-stats.cjs`): a Welch-averaged, Hann-windowed power spectrum in octave bands of physical
   period (0.25-64 mm, bands with at least 2.5 px per period and two periods per tile), the RMS in each
   band in L* units; lightness quantiles after removing the local mean (an eighth-tile Gaussian), so
   sheet shading does not widen them; orientation (structure tensor) and a laid-line peak. Distance:
   `spectralDb` = RMS over shared bands of 20·log10 of the amplitude ratio (0.02 L* floor), plus the
   quantile difference. Halftones: screen period/angle from the strongest whitened (×r²) peak,
   coverage from the 3rd/97th percentiles, the 2nd-harmonic ratio and the share of variance off the
   screen lattice above 0.6× the screen frequency (content such as a face lives below it).
   Why: amplitudes in L* map directly to "visible or not" (about 1 L* RMS is where fine texture shows
   on a flat field) and to the issue's "strength" question; band shape answers "like paper or not".
2. **Yardsticks from real scans, held out.** Each profile is fitted on region A of a scan and checked
   on region B of the same sheet; distance(A, B) is the natural variation. `between` is the smallest
   distance between two different real papers (or two flats). `assess` reports
   `within-natural-variation` (≤ 1.5 × natural, at least 1 dB), `within-real-range` (≤ between) or
   `unlike-reference` (exit 2 from `materials measure`). A generated texture is compared with the
   held-out region using only bands its profile was fitted on.
3. **Calibrated synthesis: random-phase noise shaped to the measured spectrum, then histogram matched.**
   White noise → FFT (power-of-two canvas, cropped) → 1/f shape inside each octave times the measured
   orientation → each band rescaled to the profile's amplitude → inverse FFT; a laid line, when the
   profile has one (Caillebotte laid paper: 1.28 mm), is added as a slightly warped cosine and its
   energy taken out of its band. Quantile matching then sets the shape (skew, specks) and the field is
   rescaled back to its spectral RMS (matching the scan's quantiles directly had inflated every band
   by 3 dB). Bands finer than the scan resolved fall 3 dB per octave from the finest measured; coarser
   unmeasured bands stay empty. Measured: a wove-cream sheet generated at the scan's px/mm matches every
   fitted band within 0.5 dB.
4. **Profiles (fetched with `materials fetch`, provenance in the JSON; scans not committed).**

   | Profile | Sample | px/mm | RMS L* | Natural |
   | --- | --- | --- | --- | --- |
   | `laid-cream` | Cleveland 396848, Caillebotte, Arches laid paper, blank areas | 7.14 (47.6 cm sheet / 3400 px) | 4.9 | 3.0 dB |
   | `wove-cream` | Cleveland 109295, cream wove, top margin | 10.56 | 0.94 | 3.2 dB |
   | `wove-toned` | Cleveland 130620, toned wove, top margin | 11.93 | 1.5 | 1.0 dB |
   | `woodblock-indigo` | Cleveland 120225, Hiroshige night sky flat | 10.09 | 6.1 | 0.8 dB |
   | `litho-red` | Cleveland 107215, Toulouse-Lautrec red flat with spatter | 6.46 | 4.9 | 2.2 dB |
   | `autotype-1904` | Rijksmuseum 200104782, 1904 sepia autotype, IIIF region | 31.2 (ruler in the photograph: mm ticks 31.2 px apart) | 160 lpi, 30° | off-lattice 0.43 |

   `between`: papers 3.0 dB, flats 2.2 dB. Rejected samples: Camera Work 157929 (a book cover photo),
   two drawings with no blank area, Commons `Autotypie 1882 Meisenbach` (screen not resolved at
   1210 px), Commons `Old paper1.jpg` (phone photo, no scale). Commons category listing answered 429 on
   the second call, as #287 recorded; nothing was retried around it.
5. **Native-resolution regions extend `materials fetch`.** A halftone needs the master's pixels; a
   1200 px overview averages the screen away. IIIF sources accept `region` [x, y, w, h] (64-4096 px
   per side), kept unscaled and recorded; Cleveland/Met/Commons refuse with a fix (`params.roi`).
   Measured: re-fetching the halftone region through the CLI gave the same sha256 as the profile.
6. **Generated material is an ordinary catalog record.** `license: "generated"`, `commercialUse: true`
   (no third-party input), `source: "procedural"`, `sourceUrl: design-pipeline:procedural/<name>@<version>`,
   plus `generator` {name, version, seed, params (fully resolved), profile {id, origin}} and, for
   textures, `similarity` {reference, metric, value, natural, between,
   level}. Same params + seed + version = same bytes (tested for every generator and effect).
   `materials generate --file` replays without writing. `check`: `material-generator-incomplete`
   (error), `material-generator-version` (warn, file kept), `material-calibration-stale` (error).
   Every project calibration profile a file was made from (its own `profile`, the `paper` it is
   printed on, a woodcut's `grain`) is listed in the record's `calibration` [{id, file, sha256}],
   on generated and processed records alike, so editing an owner profile makes every file that
   used it stale, not only textures generated from it. Built-in profiles change only with the
   generator version. Unknown params are refused (a typo would otherwise be recorded and ignored),
   and effect params are range-checked before any pixel work.
7. **Processed files reuse `derivedFrom`** with `operation: "process"`, effect, version, seed and params;
   the stale finding's fix is the exact `materials process` command. Effects take the same params
   names as the generators (`periodPx`, `angleDeg`, `ink`, `paper`, `pxPerMm`, `seed`).
8. **Papercut by colour, not tone.** Tone quantiles failed on a mostly black shape (the red and white
   spots vanished): every quantile fell on black. k-means in Lab (deterministic farthest-point start)
   finds the inks; the largest cluster is the base sheet cut to the whole silhouette and the others
   are stacked by area so small details sit on top, each cut with a minimum feature size (knife
   cannot follow sub-mm detail), a wobble, its own paper texture, a lit/shaded cut edge and its own
   shadow (premultiplied "over").
9. **Ink flats compensate the paper.** The ink colour is how the flat should look on its paper: the
   per-pixel ink (profile grain in L*) is divided by the paper's mean colour before multiply. Without
   it a woodblock flat on cream paper measured 5 dB under the scan; with it, 0.96 dB (natural 0.82).
   A near-black ink (#0d0b0b) cannot carry the darker half of the grain and measures `unlike-reference`
   (2.5 dB vs between 2.2); recorded, not hidden.
10. **Multiply paper keeps the page tone.** Multiply can only darken: with the white point at the
    99.5th percentile the laid-cream layer's mean L* is 92.2 (7.8 below white) and every ground greys
    visibly. `whiteQuantile` (default 0.6) puts it at the 60th percentile: layer mean 98.0, measured
    paper ground L* 93.8 → 92.2 on the cards and poster.

## Acceptance: 夜想回廊 poster and 14 title cards, before / after (2026-11-05)

Same HTML, same renderer (Chrome, 1×); before = the study's overlays (`overlay-multiply.png` at 0.55,
`speckle-light.png` on black, SVG dot patterns); after = generated laid-cream multiply paper, print
flats as card grounds (black: woodblock-indigo grain, ink #0d0b0b; red: litho-red at strength 0.55;
teal: litho-red) and two generated halftones (10 px / 45° / 0.32, 8 px / 45° / 0.15, transparent)
for the poster's dot patterns. All seven were made with the CLI (`materials generate`, seeds 1-2) in
one catalog: `materials check` passed (7 files, licence `generated`) and `materials generate --file`
reported `reproduced` for each. Measured on the text-free ground render (text hidden): paper
visibility = 0.5-8 mm band RMS of L* in the flattest 256 px blank window of the before render;
text = WCAG contrast of each text colour against its box's mean ground and its worst 5% ground
pixels, and the ground's texture RMS (L* minus an 8 px blur) over the text's L* step.

| Page | Paper visible RMS L* | Min contrast | Worst 5% | Texture / text step |
| --- | --- | --- | --- | --- |
| poster | 0.25 → 1.82 | 4.84 → 4.96 | 4.78 → 4.78 | 0.013 → 0.027 |
| white cards (c02, c05, c08, c14) | 0.23 → 1.86 | ≥ 15.9 both | ≥ 13.8 | ≤ 0.048 |
| red cards (c03, c06, c10) | 0.12-0.13 → 2.46-2.56 | 3.5 → 3.45 (c03, c06), 4.83 → 4.91 | 3.39 → 2.78-2.80, 4.78 → 4.04 | ≤ 0.083 |
| black cards (c01, c04, c07, c09) | 2.57 → 2.15 (speckle → ink grain) | unchanged ±0.14 | 5.30 → 4.69 (c09), 3.5 → 3.14 | ≤ 0.078 |
| teal / split (c11, c13) | 0.17 → 4.15, 0.12 → 0.95 | 4.83 → 4.96 | 4.78 → 4.78 | ≤ 0.027 |

Reading: paper went from invisible (0.12-0.25 L*) to 0.95-4.2 L* on every light and colour
ground, while the mean-ground contrast of every text element moved by at most 0.6 and the texture
under text stays at most 8.3% of the text's lightness step. The cost is on red: the worst-5% contrast
of the 34 px white line on the red flat drops from 3.39 to 2.78 (its mean stays 3.45; it is large
text), and that flat measures `unlike-reference` to `litho-red` (8 dB, strength 0.55 is below the
scan's grain): the record says so. The black flat (#0d0b0b) also measures `unlike-reference`
(2.4 dB vs between 2.2), as decision 9 predicts. Cut-outs: inside a black wing, L* standard deviation 0.01 (SVG + cut filter) → 2.88 (papercut),
with spots on their own sheets and shadows. Creative and visual acceptance: not assessed.

## File ownership

- New: `skill/tools/art-motion/procedural.cjs`, `skill/tools/art-motion/texture-stats.cjs`,
  `skill/references/material-calibration.json`, `skill/references/material-capture.md`,
  `scripts/build-material-calibration.cjs`, `tests/procedural-materials.test.cjs`.
- Extended: `skill/scripts/material-core.cjs` (generate, replay, process, measure, profiles, check,
  fetch region), `skill/scripts/cli-core.cjs` (actions, help, `--generator --seed --reference`),
  `skill/tools/art-motion/assets.cjs` (exports only), `assets-audio.md`, `design-sources.md`,
  `tests/materials.test.cjs` (region), manifests. No migration: existing records read the same.

## Risks

- `--seed` is also a template-bank flag on main; the KNOWN_OPTIONS line may conflict when #289 rebases
  (same value either way).
- The halftone yardstick is wide (0.43): it separates a clean digital screen (0.035) from print, not
  one print from another. Owner screentone scans tighten it (`materials measure --name`).

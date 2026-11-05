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
   quantile difference (`histogramL`, mean absolute difference of the centred L* quantiles).
   Halftones: a screen counts only when its fundamental and the same frequency turned 90° each stand
   at least 20× above the median of their ring (measured: real and generated AM screens 76 to 9e7;
   FM, paper, ink flats, laid lines, white noise and flat fields 0 to 7.6); otherwise the measurement
   says `screen: false`. Screen period/angle from the strongest whitened (×r²) peak,
   coverage from the 3rd/97th percentiles, the 2nd-harmonic ratio and the share of variance off the
   screen lattice above 0.6× the screen frequency (content such as a face lives below it).
   Why: amplitudes in L* map directly to "visible or not" (about 1 L* RMS is where fine texture shows
   on a flat field) and to the issue's "strength" question; band shape answers "like paper or not".
2. **Yardsticks from real scans, held out; a profile grades only when its yardsticks separate.**
   Each profile is fitted on region A of a scan and checked on region B of the same sheet;
   distance(A, B) is the natural variation. `between` is per profile: its distance to the nearest
   other real sample of the same kind, per metric. Both `spectralDb` and `histogramL` are graded and
   the worse decides: `within-natural-variation` (≤ 1.5 × natural, floors 1 dB / 0.25 L*, and ≤
   between), `within-real-range` (≤ between) or `unlike-reference` (exit 2 from `materials measure`).
   A profile whose natural spread is not clearly below its between distance (natural ≥ 0.8 × between
   on either metric) cannot say "like this sheet rather than another" and reports `not-calibrated`,
   with the reason; only a gross miss (beyond both 1.5 × natural and between) is still
   `unlike-reference`. Halftones: no screen → `unlike-reference`; with one halftone sample there is
   no between yardstick, so a screen reports `not-calibrated` until owner screentone scans arrive.
   Measured on the six profiles: graded `laid-cream` (3.0 vs 10.0 dB), `wove-toned` (1.0 vs 3.0),
   `woodblock-indigo` (0.8 vs 2.2); not calibrated `wove-cream` (3.2 vs 3.0), `litho-red` (2.2 vs
   2.2), `autotype-1904`. Its two crops differ by 0.43 off-lattice; a 4×4 grid of crops over the
   fetched detail spread from 0.01 to 0.90 (the screen sits at 5 px, near the JPEG's resolution, and
   the portrait's edges leak above 0.6× the screen frequency), so no region is consistent and none was
   picked. A white-noise (±4 grey) and a flat field are `unlike-reference` against every profile
   (test). A generated texture is compared with the held-out region using only bands its profile was
   fitted on.
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
   | `autotype-1904` | Rijksmuseum 200104782, 1904 sepia autotype, IIIF region | 31.2 (ruler in the photograph: mm ticks 31.2 px apart) | 158 lpi, 30.6° | off-lattice 0.43 (not calibrated) |

   Nearest-other `between`: laid-cream 10.0 dB, wove-cream and wove-toned 3.0 dB, the two flats 2.2 dB. Rejected samples: Camera Work 157929 (a book cover photo),
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
   textures, `similarity` {reference, metric, value, natural, between, histogramL, level, reason}.
   Same params + seed + version = same pixels (tested for every generator and effect).
   `materials generate --file` replays without writing and compares a hash of the decoded RGBA
   (SVG: its text), not the deflate bytes, so a PNG encoder or zlib update does not read as a
   changed generator; an edited file still `differs` through its recorded file hash. `check`: `material-generator-incomplete`
   (error), `material-generator-version` (warn, file kept), `material-calibration-stale` (error).
   Every calibration profile a file was made or graded from (its own `profile`, the `paper` it is
   printed on, a woodcut's `grain`, the `--reference` it was measured against) is listed in the
   record's `calibration` [{id, origin, file, sha256}] on generated and processed records alike:
   project profiles by the hash of their JSON, built-in profiles by the hash of their entry in
   `references/material-calibration.json`. Changing either makes every file that used it
   `material-calibration-stale`. Profile ids must match `^[a-z0-9-]+$` (they name files under
   `materials/calibration/`). Unknown params are refused (a typo would otherwise be recorded and
   ignored), booleans must be booleans and counts whole numbers, and effect params are range-checked
   before any pixel work. Every re-run command in `check` names `--project-root`. The default
   output name carries `-s<seed>` only when the output depends on the seed (not for most motifs or
   the checker, stairs and arcade scenes); the seed is recorded either way.
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
11. **The text-contrast budget lives in the existing composition gate, not in the generator.**
    `composition capture` already resolved each text's background by walking its ancestors and
    returned null at a background image or gradient, and `verify composition` then skipped the text
    silently. Now, when any text has an image-backed ground, capture takes a second screenshot with
    every glyph hidden (`ground.png`) and records, per such text, the ground's mean colour and its
    0-100th luminance percentiles under the text box; the existing `text-contrast` check computes the
    contrast of each percentile against the text colour and fails at the 5th percentile of those
    (the worst 5%), same 4.5:1 / 3:1 thresholds. Text with an unknown background and no sample is
    `contrast-unmeasured` (warn, with the recapture fix), never silent. No new gate, code family or
    schema; `elements.json` items gain an optional `ground`.

## Acceptance: 夜想回廊 poster and 14 title cards, before / after (2026-11-05)

Same HTML, same Chrome; before = the study's overlays (`overlay-multiply.png` at 0.55,
`speckle-light.png` on black, SVG dot patterns); after = generated laid-cream multiply paper, print
flats as card grounds (black: woodblock-indigo grain, ink #0d0b0b; red: litho-red at strength 0.1;
teal: litho-red) and two generated halftones (10 px / 45° / 0.32, 8 px / 45° / 0.15, transparent)
for the poster's dot patterns, all made with `materials generate` in one catalog. Text is judged by
the composition gate itself (`composition capture` + the text checks of `verify composition`), which
now samples the ground under image-backed text (decision 11). Paper visibility = 0.5-8 mm band RMS
of L* in the flattest 256 px window of the before screenshot.

| Page | Paper visible RMS L* | Gate text findings before → after | Worst-5% contrast after (sampled text) |
| --- | --- | --- | --- |
| white cards (c02, c05, c08, c14) | 0.23-0.26 → 1.82-1.86 | none → none | solid grounds |
| red cards (c03, c06, c10) | 0.12-0.16 → 1.21-1.26 | none → none | 3.03 (black on red, large), 4.62 |
| black cards (c01, c04, c07, c09) | 2.54-2.57 → 2.09-2.15 (speckle → ink grain) | none → none | 3.14-4.78 |
| teal (c11) | 0.17 → 4.15 | 2 `text-contrast` (2.60, ancestor colour) → none | 4.60 |
| collide (c12) | 2.23 → 2.10 | 1 `text-contrast` (1.00, ancestor colour) → none | 3.10 |
| split (c13), poster | 0.13 → 0.93, 2.70 → 3.22 | 1 and 3 `text-contrast` (1.00) → unchanged | solid grounds |

Red strength, found with the gate: at the profile's 0.55 the black 门 / 标本 on the red flat measured
2.78-2.80:1 at the worst 5% (3.41:1 at the mean; needs 3:1); 0.35 → 2.88, 0.2 → 2.96, 0.15 → 2.996,
0.1 → 3.03, which passes. Black on #d10e1f is only 3.57:1 flat, so a saturated mid-dark ground
has almost no texture budget under large text; the guide now says to lower `strength` on such
grounds until the gate passes. The red flat then measures `unlike-reference` to `litho-red`
(21 dB): the record says so. The paper layer still shows on red (1.2 L*). The remaining c13 and
poster findings are the gate's existing ancestor-colour rule (solid backgrounds behind positioned
text), identical before and after and outside this change. Generated laid paper: spectrum
`within-natural-variation` (2.8 vs 3.0 dB); its histogram is `within-real-range` (3.1 vs between
4.5: the multiply layer clips the light half by design). Cut-outs: inside a black wing, L* standard
deviation 0.01 (SVG + cut filter) → 2.88 (papercut), with spots on their own sheets and shadows.
Creative and visual acceptance: not assessed.

## File ownership

- New: `skill/tools/art-motion/procedural.cjs`, `skill/tools/art-motion/texture-stats.cjs`,
  `skill/references/material-calibration.json`, `skill/references/material-capture.md`,
  `scripts/build-material-calibration.cjs`, `tests/procedural-materials.test.cjs`,
  `tests/composition-ground.test.cjs`.
- Extended: `skill/scripts/material-core.cjs` (generate, replay, process, measure, profiles, check,
  fetch region), `skill/scripts/cli-core.cjs` (actions, help, `--generator --seed --reference`),
  `skill/tools/art-motion/assets.cjs` (exports only), `assets-audio.md`, `design-sources.md`,
  `tests/materials.test.cjs` (region), `skill/scripts/capture-composition.cjs` (ground sample),
  `skill/scripts/composition-core.cjs` (`text-contrast` on sampled grounds, `contrast-unmeasured`),
  `skill/references/composition-gate.md`, manifests. No migration: existing records read the same.

## Risks

- `--seed` is also a template-bank flag on main; the KNOWN_OPTIONS line may conflict when #289 rebases
  (same value either way).
- Halftone grading is `not-calibrated` until a second halftone sample (an owner screentone scan,
  `materials measure --kind halftone --name`) gives a between yardstick; screen detection still
  rejects noise and flat fields.
- Output names go through #289's `slug`, which folds punctuation, so names that differ only by it
  (`r0.2` and `r0-2`) collide on one file; `OUTPUT_EXISTS` still stops an overwrite. Upstream; left
  as is here.
- Pages that put text over a positioned solid block still get the ancestor background colour (c13,
  poster above); unchanged by this change.

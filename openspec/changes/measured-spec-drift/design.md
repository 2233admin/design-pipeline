# Design: measured spec drift

## Context

`check-spec-reconciliation.cjs` is synchronous and filesystem-only; `reference check` folds it. The
browser work therefore happens in a separate action, `reconciliation measure`, that runs a kernel
process (`capture-built-styles.cjs`) the way `evidence refs` runs `capture-refs.cjs`, and the gate
reads the file it writes.

## Decisions

1. **Where the measurement lives.** Change root `built-styles.json`, schema
   `design-pipeline.built-styles.v1`, with `page` (the `pageDigest` of the project, as `evidence
   refs` binds it), `designFile` (project-relative) and `designSha256`. The gate recomputes both and
   blocks `reconciliation-measurement-stale` on any difference, so evidence about an older page or
   spec is invalidated instead of compared.
2. **Which page and DESIGN.md.** `--project-root` (default `--root`) and `--design-foundation`
   (default `DESIGN.md`), flags already registered and used with this meaning by `foundation` and
   `design`. The standalone script infers the project root from `<project>/openspec/changes/<id>`
   and otherwise uses the change root.
3. **What is measured.** Visible elements only (no `display:none`, `visibility:hidden` or zero
   opacity on any ancestor), up to 6000. Text colour of elements with their own text, weighted by
   characters; background colour weighted by box area, skipped when equal to the backdrop; border
   sides with width and style, weighted by width x length; SVG geometry fill and stroke; and the
   root canvas (html, then body, else white) over the document area. Gradients and images are not
   colours and are not measured. Every colour goes through a 1x1 canvas, so `color()`, `oklch()`
   and named colours come back as the 8-bit sRGB the screen shows, and a translucent colour is
   composited over the nearest opaque ancestor background - what the eye compares with a token.
4. **Fonts.** The first family of each text element's computed stack, weighted by characters. A
   family is `available` when a sample measures differently against at least one generic fallback;
   `rendered` is the first available family of the stack. A token family that the browser cannot
   render is drift even though the stylesheet names it.
5. **Tolerance.** CIEDE2000 2.0 (about two just-noticeable differences): computed styles are exact,
   so the tolerance absorbs only preprocessor rounding and `color-mix()` noise, not a repaint.
   Measured on the fixture, #3a6df0 vs #3366ff is 2.82 and blocks.
6. **Severity.** Share is the larger of the text share (characters) and the paint share (px² over
   surface + border + graphic). At 1% or more the drift is major and blocks; below it is minor and
   warns. Tokens no painted colour or text family matches are minor (a token may describe a state the
   static page does not show). A token value that is not hex (after resolving `{colors.x}` aliases)
   is reported minor, not dropped.
7. **Accounting for drift.** A major drift is covered when a reconciliation row's `Implemented`
   cell names the measured hex (3/6-digit, any case) or family. Prose that does not name the value
   does not cover it. Covered drift stays in the record with `coveredBy`.
8. **Empty baseline.** A DESIGN.md with no hex colour token or no `fontFamily` blocks
   `reconciliation-baseline-empty` in the gate and is refused by `measure`; a measurement that
   recorded nothing is `reconciliation-measurement-malformed`. Neither ever reads as a clean page.
9. **Applicability.** Unchanged: the new reasons go through `report.block`, so on a change without a
   reference they are warnings, as every other reconciliation finding is. A missing measurement is a
   warning (`reconciliation-unmeasured`) only when the change applies, `index.html` exists and
   DESIGN.md has tokens; making it blocking would fail every existing reference-driven change that
   has no built page yet, and the obligation to reconcile already blocks.
10. **CIEDE2000 helper.** PR #251 (reference palette extract) adds `deltaE2000(rgbA, rgbB)` in
    `reference-extract-core.cjs`, not on main yet. This change carries a local implementation with
    the same signature in `built-style-drift-core.cjs`, verified against the Sharma, Wu and Dalal
    reference pairs. Follow-up: whichever lands second moves both callers to one helper.

## File ownership

- New: `skill/scripts/built-style-drift-core.cjs` (tokens, CIEDE2000, comparison, in-page
  measurement, capture), `skill/scripts/capture-built-styles.cjs` (kernel), both listed in
  `package-resources.json`; `tests/measured-spec-drift.test.cjs` and fixtures under
  `tests/fixtures/measured-spec-drift/`.
- Changed: `check-spec-reconciliation.cjs` (measurement review), `cli-core.cjs` (`reconciliation
  measure`, options passed to the gate and the `reference check` fold).
- Read only: `frontMatterGroups` from `design-system-package-core.cjs`; `settle`, `awaitResources`,
  `freezeMotion`, `refsPuppeteer` from `page-refs-core.cjs`; `pageDigest` from `workflows/web.cjs`.

## Compatibility

No path or artifact shape changes. A change without `built-styles.json` gets the same status as
before; the only new output is the `reconciliation-unmeasured` warning and `measured: null`.

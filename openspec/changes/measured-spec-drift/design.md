# Design: measured spec drift

## Context

`check-spec-reconciliation.cjs` is synchronous and filesystem-only; `reference check` folds it. The
browser work therefore happens in a separate action, `reconciliation measure`, that runs a kernel
process (`capture-built-styles.cjs`) the way `evidence refs` runs `capture-refs.cjs`, and the gate
reads the file it writes.

## Decisions

1. **Where the measurement lives.** Change root `built-styles.json`, schema
   `design-pipeline.built-styles.v1`, with `page` (the `pageDigest` of the project, as `evidence
   refs` binds it), `lineage` (project-relative path -> hash of every local file the browser
   requested: CSS, `@import`s, font files, images), `designFile` (project-relative) and
   `designSha256`. `pageDigest` only covers files `index.html` names in `src`/`href`, so a font file
   referenced from CSS was invisible to it; the request log closes that. The gate recomputes all of
   them and blocks `reconciliation-measurement-stale` on any difference, so evidence about an older
   page, font or spec is invalidated instead of compared. A file that changes during the capture
   fails the measurement (`PAGE_MOVED`).
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
   Partial `opacity` is the product along the ancestor chain and is applied in the same composite
   (black text under a 50% ancestor records as `#808080`). The page is measured with
   `prefers-color-scheme: light` emulated.
4. **Fonts.** Each text element records `first` (the first family its computed stack names),
   `available` (whether `first` renders), `rendered` (the first family of the stack the browser can
   render) and `family` (`rendered`, else `first`), weighted by characters. A family is available
   when a sample measures differently against at least one generic fallback. Comparison is by the
   rendered family: `"Zzqx Sans", "Fixture Display", serif` with the token font loaded is on token
   (review finding: comparing `first` reported a false major). A token family named first that does
   not render is still drift, naming the fallback that does; `first` stands in only when nothing in
   the stack could be confirmed.
5. **Tolerance.** CIEDE2000 2.0 (about two just-noticeable differences): computed styles are exact,
   so the tolerance absorbs only preprocessor rounding and `color-mix()` noise, not a repaint.
   Measured on the fixture, #3a6df0 vs #3366ff is 2.82 and blocks.
6. **Severity.** Share is the larger of the text share (characters) and the paint share (px² over
   surface + border + graphic). The root canvas is its own kind and is not in the paint
   denominator: on a long page it diluted every painted colour by the page's length. At 1% or more
   the drift is major and blocks; below it is minor and warns, with one exception, the "loud" rule:
   area under-weighs the drift a reader sees first. A primary CTA at CIEDE2000 38 measured 0.3% of
   the area, and 1px card borders needed 26 cards to reach 1%. So a colour whose nearest token is
   more than CIEDE2000 10 away (an obviously different colour, not a shade; 2-10 can be an
   unrecorded tint and stays share-weighted) blocks regardless of share when it is the page
   background, is on an interactive element or inside one (`button`, `a[href]`, form controls,
   `summary`, `[role=button|link|tab|menuitem]`), or is a surface or border on 3 or more elements.
   The finding carries `loud` with the reason. Tokens no painted colour or text family matches are
   minor (a token may describe a state the static page does not show). A token value that is not
   hex (after resolving `{colors.x}` aliases) is reported minor, not dropped.
7. **Accounting for drift.** A major drift is covered when a reconciliation row's `Implemented`
   cell names the measured hex (normalised: 3/6-digit, any case) or, for a font, when one of the
   cell's comma-separated entries, quotes stripped and lowercased, equals the family. Whole entries
   only: `serif` does not cover `sans-serif` and `Inter` does not cover `Interstate` (review finding:
   the first version matched substrings). Prose that does not name the value does not cover it.
   Covered drift stays in the record with `coveredBy`.
8. **Empty baseline.** A DESIGN.md with no hex colour token or no `fontFamily` blocks
   `reconciliation-baseline-empty` in the gate and is refused by `measure`; a measurement that
   recorded nothing is `reconciliation-measurement-malformed`. Neither ever reads as a clean page.
9. **Applicability.** Unchanged: the new reasons go through `report.block`, so on a change without a
   reference they are warnings, as every other reconciliation finding is. `reconciliation measure`
   runs the gate after writing and reports `applicable`, the gate status and counts, and on a
   change without a reference a `note` saying its drift will only warn and how to fix that. A missing measurement is a
   warning (`reconciliation-unmeasured`) only when the change applies, `index.html` exists and
   DESIGN.md has tokens; making it blocking would fail every existing reference-driven change that
   has no built page yet, and the obligation to reconcile already blocks.
10. **CIEDE2000 helper.** PR #251 (reference palette extract) adds `deltaE2000(rgbA, rgbB)` in
    `reference-extract-core.cjs`, not on main yet. This change carries a local implementation with
    the same signature in `built-style-drift-core.cjs`, verified against the Sharma, Wu and Dalal
    reference pairs. Follow-up: whichever lands second moves both callers to one helper.

## Not measured

One measurement does not see the following; the list is `MEASUREMENT_SCOPE.notMeasured`, recorded
in every `built-styles.json` as `scope` and returned in `specDrift.measured.scope`, so a clean result
is never read as covering more than it measured:

- pixels drawn by `<canvas>`, `<img>`, `<video>`, CSS background images and gradients;
- `text-shadow`, `box-shadow`, `outline`, filters and blend modes;
- `::before` / `::after` content;
- the dark colour scheme: the page is measured with `prefers-color-scheme: light` only;
- per-glyph fallback inside a family: CJK or emoji glyphs a token font lacks render in a fallback
  the family check does not detect (it probes Latin sample text);
- states the static page does not show (hover, focus, open menus) and viewports other than 1440x900;
- translucent backgrounds stacked under a translucent ancestor background (composited over the
  nearest opaque one only).

Partial opacity, the first finding of this kind in review, is measured (decision 3), not declared.

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

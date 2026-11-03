# Design: reference-palette-extract

## Source

The method is ported, as our own CommonJS, from yuvrajangadsingh/brandmd (MIT, Copyright (c) 2026 Yuvraj Angad
Singh), `src/extract.js` and `src/analyze.js`, read at the revision cloned for the 2026-11-03 audit. No file is
vendored and no dependency is added (brandmd uses Playwright and chroma-js; we use puppeteer-core through the
existing resolver and our own colour math). Credit is recorded in `THIRD_PARTY_NOTICES.md`.

Ported decisions:

1. Computed styles over visible elements (`html, body, body *`, non-zero box, not hidden): background colour
   weighted `1 + viewportShare * 25`, gradient stops `1 + viewportShare * 10`, text colour per element that owns
   text, border colour per element with a visible border.
2. `:root`/`html` custom properties read through `document.styleSheets[].cssRules`, recursing into grouping
   rules; cross-origin sheets are counted as unreadable.
3. `document.fonts.ready` raced against 5 s; cookie, consent, GDPR and banner elements that are fixed or sticky,
   and fixed overlays or modals above z-index 100, are removed before measuring (again after the scroll walk).
4. Scroll with `behavior: "instant"`: `page-refs-core.cjs` `settle` already does this, so it is reused.
5. Block-page detection (brandmd `extract.js` lines 16-66): vendor markers decide alone; challenge phrases
   count only with a Cloudflare footprint; otherwise two of block title, HTTP 401/403/429, under 200 characters
   of text, captcha widget, bare page (at most two backgrounds and only fallback fonts). A JavaScript challenge
   is polled for up to 15 s before it is refused. brandmd only warns on a likely block page; we refuse.
6. Colours closer than CIEDE2000 15 merge, heaviest first. Tiers by share within its group (background, text,
   border): >= 25% dominant, >= 5% accent, else incidental; HSL saturation above 0.5 is never below accent.
7. Font sizes, line heights and spacing cluster to 0.5 px; spacing keeps px scalars in (0, 200]; a base grid of
   8 then 4 px is claimed only at >= 80% coverage.
8. `(low confidence)` instead of guessing: a font needs two elements, the primary colour needs a saturated,
   mid-light measured colour, a role the page lacks is not invented.

Our differences: translucent colours are composited over the page background before clustering (the schema
needs six-digit hex); text colours count only elements with their own text; a per-size font family needs two
elements of that size; a grid needs at least three spacing values.

## Outputs and ownership

`--output` is any directory inside `--root` (for website cloning, `targets/<id>/research`). The command owns
three files there and refuses to overwrite them without `--replace`:

| File | Content |
| --- | --- |
| `extraction.json` | `design-pipeline.reference-extraction.v1`: url, final url, HTTP status, browser, viewport, method constants, clustered palette, roles, type scale, spacing, custom properties, low-confidence list |
| `palette-evidence.json` | `design-pipeline.palette-evidence.v1`, `status: pending`, DOM source `ready` with `evidencePaths: ["extraction.json"]`, raster source `pending` |
| `design-md-draft.md` | DESIGN.md front matter (`colors`, `typography`, `spacing`) and the low-confidence list |

Roles drafted: `background`, `surface`, `text`, `text-muted`, `border`, `primary`, each mapped to `--color-<role>`.
Coverage is the role's share of its own group. The evidence stays `pending` because the raster-media source is
not measured here and the roles need the agent's judgement; `palette-foundation-core.cjs` keeps blocking until
the agent completes it. No schema change.

`targetId` defaults to the hostname slug; `sourceUrl` is the `--url` string as given, so it can equal the
website-cloning target URL exactly.

## Relation to replicate-measured-extraction

That pending change reserves `reference extract` and `extraction.json` and plans vendored design-extract
extractors, motion, radii, shadows, DTCG output and `token-not-measured` matching. This change implements the
same action for palette, type scale and spacing without vendoring; that change should extend this action and
file rather than add a second extractor.

## Exit codes

0 extracted; 1 usage, unreachable page (`REFERENCE_UNREACHABLE`), refused block page (`REFERENCE_BLOCKED`),
missing browser or puppeteer-core. `runKernel` keeps these two codes from the kernel instead of `KERNEL_FAILED`.

## Risks

- Canvas, WebGL and image-baked colour are invisible to computed styles: the raster-media source exists for
  them and stays the agent's job.
- A legitimate thin page behind a 403 is refused; that is intended, a 403 is not the reference.

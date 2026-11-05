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
3. `document.fonts.ready` raced against 5 s. Overlays are removed before measuring (again after the scroll walk)
   by geometry first: any `position: fixed` element covering 60% of the viewport or more that is what the
   viewport shows at three of five sample points (`elementFromPoint`). brandmd's name rules stay as an extra:
   fixed or sticky cookie, consent, GDPR and banner elements, and fixed overlays or modals above z-index 100.
   Sticky elements are never removed by geometry, because a full-height sticky section is usually content.
4. Scroll with `behavior: "instant"`: `page-refs-core.cjs` `settle` already does this, so it is reused.
5. Block-page detection (brandmd `extract.js` lines 16-66), narrowed after review so that a real page is never
   refused for what it loads or what it talks about:
   - Decides alone: an element whose id or class only a vendor's challenge or block page renders (`cf-chl-*`,
     `challenge-form`, `cf-browser-verification`, `cf-challenge-running`, `cf-error-details`, `px-captcha`),
     read from attributes, never from text or script URLs; or vendor block text (`Cloudflare Ray ID`,
     `Incapsula incident ID`) on a page with under 300 characters of visible text.
   - A challenge phrase ("just a moment", "verifying you are human", ...) counts only in the title, or in a
     body under 300 characters, and only with a challenge footprint (`/cdn-cgi/challenge-platform/`,
     `_cf_chl_opt`, `captcha-delivery.com`, ...) or a captcha widget container (`cf-turnstile`,
     `g-recaptcha`, `h-captcha`). A footprint alone never blocks: Cloudflare injects `challenge-platform`
     into ordinary pages, and a `cdnjs.cloudflare.com` asset is no footprint at all.
   - Otherwise a block title (anchored at the start: "Access Denied", "Forbidden", "403", ...) plus one of
     HTTP 401/403/429, under 200 characters of text, or a bare page (at most two backgrounds, only fallback
     fonts).
   A JavaScript challenge is polled for up to 15 s before it is refused. brandmd only warns on a likely block
   page; we refuse.
6a. HTTP status: `reference extract` tracks the latest main-document response (a challenge that clears
   navigates again) and refuses 4xx/5xx with `REFERENCE_HTTP_STATUS`, a designed error page included; the
   status is in the result.
6b. Client-rendered pages: before the block check and the walk, the page must show visible text or media
   and keep the same text length, media count and node count for 500 ms; a page that shows nothing within
   15 s fails with `REFERENCE_EMPTY`.
6. Colours closer than CIEDE2000 15 merge, heaviest first. Tiers by share within its group (background, text,
   border): >= 25% dominant, >= 5% accent, else incidental; HSL saturation above 0.5 is never below accent.
7. Font sizes, line heights and spacing cluster to 0.5 px; spacing keeps px scalars in (0, 200]; a base grid of
   8 then 4 px is claimed only at >= 80% coverage.
8. `(low confidence)` instead of guessing: a font needs two elements, the primary colour needs a saturated,
   mid-light measured colour, a role the page lacks is not invented.

Root painters: the canvas, `html` and `body` backgrounds are weighted `1 + 25 * min(uncoveredArea / viewport, 1)`,
where the uncovered area is measured on a 32 px grid over the document after marking every box with an opaque
background colour or a background image. A full-bleed gradient or photo hero is therefore not outvoted by a
white canvas nobody sees; `uncoveredShare` is recorded in `extraction.json`.

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

That pending change planned `reference extract` and `extraction.json` with vendored design-extract extractors.
This change implements the action for palette, type scale and spacing; that change is edited in the same pull
request so its items are MODIFIED extensions of this action (more fields in the same files, `--path`, a DTCG
file, `token-not-measured`), with this collector as the only page walk. Archive this change first.

## Exit codes

0 extracted; 1 usage, unreachable page (`REFERENCE_UNREACHABLE`), refused block page (`REFERENCE_BLOCKED`),
HTTP 4xx/5xx (`REFERENCE_HTTP_STATUS`), nothing rendered (`REFERENCE_EMPTY`), missing browser or puppeteer-core.
`runKernel` keeps these four codes from the kernel instead of `KERNEL_FAILED`.

## Known limitation: near surfaces merge

Clustering below CIEDE2000 15 (brandmd's constant) merges designed surface steps on dark or tinted sites: a
`#16161d` card on a `#0b0b0f` page is CIEDE2000 4.1 apart and becomes one colour. The constant is kept, so the
tiers stay comparable with the source method, but every background merge from 3 up to 15 is recorded as
`nearMerges` on the cluster and listed under `(low confidence)` naming both colours; anti-aliasing and sub-pixel
noise stays under 2. The agent reads the raw members before dropping a step.

## Risks

- Canvas, WebGL and image-baked colour are invisible to computed styles: the raster-media source exists for
  them and stays the agent's job.
- A legitimate thin page behind a 403 is refused; that is intended, a 403 is not the reference.

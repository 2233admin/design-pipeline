## Context

Ported from the SHAFT-style study in a scratch directory (Python: `fetch_collage.py`, `cut.py`, numpy/OpenCV) and
generalised. Runtime scripts here are Node CommonJS with no image dependency, so the cutting is re-implemented on
typed arrays and the existing PNG codec; JPEG downloads are converted by ffmpeg, already required for film work.

## Decisions

1. **Records: extend film-edit's `licenses.json`, not a new schema.** The issue asks for reuse of an existing
   source/asset record. The only per-file licence record in the package is `sources/licenses.json` for film-edit
   footage. Materials use the same file name and shape under `materials/`, keyed by path relative to that
   directory, with optional provenance fields: `kind`, `source`, `sourceId`, `title`, `author`, `date`,
   `sourceUrl`, `fileUrl`, `licenseEvidence`, `retrieved`, `use`, `sha256`, `width`, `height`, `derivedFrom`.
   `material-core.cjs` owns the reader; `edit-project-core.cjs` now calls `readRecords` + `licenseOf` instead of
   its inline reader, so footage behaviour is unchanged (unrecorded → `unrecorded`, non-commercial).
2. **Open licences only for automated fetch.** `fetch` accepts `CC0`, `PDM` (public domain mark) and
   `public-domain`, read from each source's own field (Cleveland `share_license_status`, Met `isPublicDomain`,
   Rijksmuseum the image's rights statement, Commons `LicenseShortName`). The Met's search filter
   `isPublicDomain=true` still returns non-PD objects (measured: object 14548), so the object record decides.
   Anything else is `refused` with the evidence; `add` can record any licence string an owner gives.
3. **Reachability is data with a date.** The registry stores what was measured on 2026-11-05 with the HTTP
   evidence. `materials probe` re-measures and classifies: 2xx → reachable (unless the body is a Cloudflare or
   Incapsula challenge → blocked), 429 → rate-limited, 401 or a missing-API-key body → needs-key, 403 → blocked,
   410 → retired, 404 on the API with a reachable site → html-only. Commons is marked `intermittent` so a single
   probe answering 200 or 429 is not drift. Updating the registry is a reviewed edit, not something probe writes.
4. **Measured on 2026-11-05 (this environment):**

   | Source | Result |
   | --- | --- |
   | Cleveland | search 200 (q=key: 89 CC0); CDN 200 |
   | Met | v1.1 search 200; object 200; images 200; v1 search 410 "retired on 2026-10-01" |
   | Rijksmuseum | new Linked Art search 200 without key; object 200; iiif.micr.io 200; old keyed API 410 |
   | Wikimedia | list=search 429 on 3 of 6 calls within 10 s, independent of User-Agent; imageinfo by title 200; Special:FilePath 302 → 200 |
   | NYPL | API 401 token; site 200 Incapsula challenge |
   | Old Book Illustrations | site 200; wp-json 404 |
   | Smithsonian | 403 API_KEY_MISSING; DEMO_KEY 429 |
   | BHL | api3 401; site 403 Cloudflare |
   | Art Institute of Chicago | API and IIIF 403 Cloudflare |

   The study's note that the new Rijksmuseum API needs a key no longer holds; the Linked Art search is keyless.
5. **Network in a kernel.** The CLI is synchronous; `probe`, `search` and `fetch` run in
   `fetch-materials.cjs` like `sources fetch` runs `fetch-sources.cjs`. Exit 2 for blocked, refused or drift.
   Adapters take an injected `fetch` so tests use recorded response shapes, not the network.
6. **Download size.** `fetch` keeps at most `--width` (default 1200) px on the long side, picks the smallest
   published size that covers it (Cleveland web/print; IIIF asks for the width directly; Commons thumb width),
   and deletes the transient download. 1200 px is enough for stickers on a 1920 canvas and keeps a project's
   materials small (six study images: 9.3 MB of PNG).
7. **Cutting extends `assets.cjs`.** New `cutCollage` beside `keyedImage`/`splitSprites`, same PNG-bytes input and
   pixel budget. Mattes: `border` (median border colour, Lab distance), `paper` (quadratic surface fitted to the
   backdrop, refitted on cells that match it, then smoothed; replaces the study's single-reference estimate,
   which failed on studio gradients), `white-matte`, `none`. Clean-up uses an exact Euclidean distance transform
   for close/open and fills only small enclosed holes (keeps a key bow's opening). Components are 8-connected;
   the `keep` largest above `minFraction` become pieces. Finishes: `cut`, `sticker` (dilated, rounded edge in
   paper colour, offset blurred shadow), `ink` (alpha from the sheet's own paper/ink L percentiles), `plate`
   (seeded jittered polygon). Deterministic for a seed.
8. **Dirty-matte flags are warnings with a fix, not a gate.** `matte-uneven-background` (90th percentile of the
   border's distance from its reference above 0.6 × threshold), `matte-touches-frame`, `matte-empty` (error),
   `ink-low-contrast`. A "soft halo" fraction was tried and dropped: it fired on every engraving because light
   hatching sits near the paper tone. Cast shadows on plain grounds are documented as not detected.
9. **Lineage.** Each piece's record holds `derivedFrom` {file, sha256, finish, placement, mode, params} and
   inherits the source licence. `check` reports `material-derived-stale` when the source hash moved,
   `material-derived-orphan` when the source is gone, `material-changed` when a recorded source was edited, and
   `cut` refuses a source whose bytes no longer match its record (`SOURCE_CHANGED`). Pieces go to
   `materials/cut/<stem>/`; a second source with the same stem is refused instead of overwriting them.

## File ownership

- New: `skill/scripts/material-core.cjs`, `skill/scripts/fetch-materials.cjs`,
  `skill/references/material-sources.json`, `tests/materials.test.cjs`.
- Extended: `skill/tools/art-motion/assets.cjs` (+ guide), `skill/tools/design-sources.md`, `cli-core.cjs`
  (command table, help, flags `--use --name --license --finish --commercial-use`), `edit-project-core.cjs`
  (reader only). No migration: existing `sources/licenses.json` files read the same.

## Acceptance run (2026-11-05)

Style query `key,pocket watch,butterfly,engraving`, limit 3: 33 candidates from Cleveland, Met and Rijksmuseum,
3 Met candidates marked not public domain. Fetched: Cleveland key 130217 (bronze key on a studio gradient),
Met pocket watch 199408, Rijksmuseum "Drie vlinders" 200140255 (PDM), Cleveland Hollar insects 164600, Cleveland
Dürer "Melencolia I" 108501, Commons `File:Haeckel_Tineida.jpg`. Refused: Met 14548 (isPublicDomain=false).
Blocked: NYPL (needs-key, with fix). Cuts: watch `border` clean (spread 0.38); key `border` flagged
`matte-uneven-background` (spread 28.57) and `matte-touches-frame`, then `paper` clean (spread 1.48, piece
415×994); butterflies `paper` 3 pieces (two faint ones partial); Hollar `paper` 4 pieces + ink + plate, one piece
flagged touching the roi; Haeckel and Dürer ink + plate. `materials check`: passed, 30 files, licences CC0, PDM,
public-domain. Pieces were inspected on a red ground; visual acceptance is not claimed.

## Risks

- Source APIs change (two retirements in the last two months). Probe reports drift; adapters fail with the HTTP
  evidence rather than guessing.
- Full-text search relevance is poor (q=key returns people named Key); candidates are picked by looking.

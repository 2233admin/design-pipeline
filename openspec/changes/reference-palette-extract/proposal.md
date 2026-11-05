# Deterministic reference palette, type scale and spacing

## Why

Closes #236. In replicate mode (EXTRACT) and website cloning (Stage B) the agent reads a reference page and
writes the palette, type scale and spacing itself. `palette-foundation-core.cjs` only checks the palette
evidence the agent wrote (`palette-evidence.schema.json`); nothing measures it. The values are estimates, a
near-miss grey or an accent picked by eye, and a bot-challenge or WAF page that a capture loaded is measured as
if it were the reference.

## What Changes

- New action `reference extract --url <http(s) page> --output <dir> [--target-id <id>] [--width --height]
  [--replace]` on the existing `reference` family. It opens the page with the existing browser resolver and
  puppeteer-core discovery, dismisses cookie banners and fixed overlays, walks the page with the instant-scroll
  settle that `evidence refs` uses, waits for fonts, and reads computed styles and `:root` custom properties.
  No model is involved.
- It writes `extraction.json` (clustered colours with share, tier, count, largest element and matching custom
  properties; the type scale; spacing; method constants), `palette-evidence.json` conforming to the existing
  `design-pipeline.palette-evidence.v1` (DOM source `ready`, raster-media source and evidence `pending`, drafted
  roles, coverage, luminance hierarchy, saturation and temperature posture, target tokens) and
  `design-md-draft.md` (draft DESIGN.md front-matter tokens). Unsupported values are `(low confidence)`.
- Block-page detection: a challenge, WAF or captcha page is refused with `REFERENCE_BLOCKED` (exit 1, a
  contract error) by `reference extract`, by `evidence capture` (from the adapter's saved DOM) and by
  `evidence refs` (vendor markers only, so a project's designed 403 page is not refused).
- Replicate's EXTRACT instruction and `website-cloning.md` Stage B tell the agent to run it first, then judge.

## Capabilities

- `design-pipeline`: ADDED `Reference pages are measured before they are judged` and `Block pages are refused
  as reference evidence`.

## Reuse

- The palette evidence schema and `palette-foundation-core.cjs` stay the single schema and checker; the
  extraction writes a `pending` document that the checker already reads.
- `browser-locate.cjs` (`resolveBrowser`, `browserIdentity`), `film-capture-core.cjs` `resolvePuppeteer`,
  `page-refs-core.cjs` `settle`, the CLI kernel pattern of `evidence refs` and `runKernel`.
- The `reference extract` action name and `extraction.json` file name reserved by the pending change
  `replicate-measured-extraction`; this change implements its palette, type and spacing part (see design.md).

## Impact

- New action, one new flag (`--target-id`), one new error code (`REFERENCE_BLOCKED`) and
  `REFERENCE_UNREACHABLE` for a page that does not load. Existing captures of real pages are unchanged.

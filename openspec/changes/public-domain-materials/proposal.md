## Why

In the SHAFT-style material study (夜想回廊, 2026-11) material was the largest single lift: CC0 engravings and
plates from the Cleveland Museum of Art and object photos from the Met (keys, a watch, butterflies), cut out as
paper stickers, made the first pass read as finished where the previous round's code-drawn objects did not. More
material helped more than further rounds of polishing. The skill today cannot do that by itself: it does not know
which public-domain / CC0 sources exist, which of them answer from this environment, how each states its licence,
or how to record where a file came from, and its keying helper only handles chroma and white mattes on a single
image. The study had to discover all of it by hand (several sources are blocked, rate-limited or need keys; the
Met's v1 search and Rijksmuseum's old API are retired).

## What Changes

- A source registry `skill/references/material-sources.json`: per source the query route, the licence field that
  decides reuse, the reachability measured from this environment (status, date, evidence) and, when it is not
  usable, what to do instead. Cleveland, Met and Rijksmuseum have adapters; Wikimedia Commons is fetched by exact
  file name only (its search answers 429 about half the time); NYPL, Smithsonian, BHL, Old Book Illustrations and
  the Art Institute of Chicago are recorded as keyed, html-only or blocked, without workarounds.
- CLI `materials sources|probe|search|fetch|add|cut|check`:
  - `probe` re-measures reachability and reports drift from the registry (exit 2).
  - `search` queries the reachable adapters for comma-separated terms and returns candidates with their licence
    field; unavailable sources say why.
  - `fetch` downloads one CC0 / public-domain object (others are refused with the licence evidence), converts it
    to PNG at a bounded size and records provenance.
  - `add` registers owner-supplied fonts, scans and photos with their licence in the same records.
  - `cut` produces cut-outs, paper-edge stickers, ink-only layers and hand-cut plates, and flags likely dirty
    mattes (gradient backdrop, piece running into the frame) with a fix.
  - `check` requires every material file to be recorded with licence and provenance, and reports cut pieces whose
    source changed or disappeared.
- Provenance reuses the film-edit `licenses.json` record (`{"<file>": {license, commercialUse}}`), extended with
  provenance fields; film-edit reads it through the same reader.
- Cutting extends `skill/tools/art-motion/assets.cjs` (the existing matte/sprite helper) instead of adding a tool.

## Capabilities

- `design-pipeline`: ADDED `Public-domain materials carry measured source reachability and recorded provenance`,
  ADDED `Collage cutting flags dirty mattes and keeps lineage to its source`.

## Reuse

- `licenses.json` record shape from film-edit footage; `assets.cjs` keying/crop helpers, the PNG codec and the
  existing `--params`, `--mode`, `--width`, `--replace`, `--by`, `--url`, `--kind`, `--title` flags; the
  kernel-process pattern of `sources fetch` for network calls; ffmpeg for image conversion.
- No new gate, receipt schema or resolver. `materials check` is a standalone check like `film-edit check`, not a
  workflow stage.

## Not taken

- Wikimedia full-text search, retries against rate limits, or anything that gets past a bot challenge.
- Font catalogue and glyph coverage (#286); `add --kind font` only records a supplied font's licence.
- Attribution-required licences (CC BY, CC BY-SA): refused by `fetch`; an owner can still record such a file with
  `add` and its exact licence.

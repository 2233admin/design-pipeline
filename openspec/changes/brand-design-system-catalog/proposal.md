# Brand design systems in designmd search

## Why

Closes #253. Agents learn design from real systems, but the only offline DESIGN.md material is four
dimabraven examples. Two public catalogs hold 198 complete design systems "inspired by" real products
and styles (Airbnb, Linear, Stripe, iOS apps, brutalism, bento ...), each with DESIGN.md prose, a
`tokens.css` in one shared token schema and, for most, a component fixture and a token report. The
owner accepted the trademark and licensing risk of brand inspired-by catalogs and decided to absorb
them as learning material, with provenance and licence recorded per bundle.

## What Changes

- A new pinned bundle, `brand-design-systems`, built from `nexu-io/open-design` (Apache-2.0, 152
  systems) and `feimacode/open-design-agent-kit` (MIT, 46 systems plus correction overlays for 57
  open-design systems), deduplicated by system id. English files only.
- The package carries only `skill/vendor/brand-design-systems/manifest.json` (two sources, per-file
  size, Git blob id and SHA-256, the system index) and the licence and attribution texts (four files).
  The 1,144 system files (9.3 MB) are fetched by `sources fetch --bundle brand-design-systems`;
  `doctor` lists the download.
- `designmd search` also returns the systems once fetched: name, category, description, a palette
  signature and the paths to read. `--kind design-system` narrows to them and fails `TOOL_MISSING`
  naming the fetch command before the fetch. `designmd inspect --id design-md:design-system:<id>`
  adds the tokens normalised to Google DESIGN.md front matter. Every system is reference-only.
- `scripts/import-brand-design-systems.cjs` builds the bundle from clean checkouts of the reviewed
  revisions; `npm run sources:import:brand-design-systems`.
- `THIRD_PARTY_NOTICES.md`, `skill/references/design-md.md`, one `SKILL.md` route row, the vendor
  README, installation notes, `docs/features.md`, the component source catalog (two source records)
  and `CHANGELOG.md`.

## Reuse

The partial-bundle download of `skill/scripts/vendor-cache.cjs` (raw files at the pinned revision,
size, blob id and SHA-256 checks, all-or-nothing cache install), its pack mapping from iart, the tree
verifier of `design-direction-library-core.cjs`, `scripts/git-tree-snapshot.cjs`, `doctor`
`downloads`, the existing `designmd search` and `inspect` commands and their `--kind` option, the
`sources:import:*` and `sources:check` conventions. No new command, flag, gate, receipt, resolver or
policy digest.

## Impact

Affects `design-pipeline` (source bundles, DesignMD search, doctor). The package grows by about
390 KB. No command is removed or renamed; `sources fetch` accepts one more bundle id and
`designmd search --kind` one more value. Existing installs fetch the systems only if they ask.

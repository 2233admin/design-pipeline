# Design

## File ownership

- `skill/vendor/brand-design-systems/manifest.json` (new). Schema
  `design-pipeline.brand-design-systems-source.v1`, `bundle: brand-design-systems`. `packs[]` records
  each source (repository, revision, Git tree, commit date, licence, review date); `snapshot` (shipped,
  four files) and `fetched` (1,144 files) hold `objects[]` with `path`, `mode`, `oid`, `size`, `sha256`
  plus `fileCount`, `byteCount` and a canonical `treeSha256`. Object paths start with the pack id, as
  in iart, so one bundle fetches from two repositories. `systems[]` is the index: id, name, category,
  description, origin, pack, folder, file list, and `corrections` (overlay folder, files and the kit's
  recorded colour/type decision). `dedupe` states the rule; `boundary` keeps every system
  `reference-only` with `productDesignMd: false`.
- `skill/vendor/brand-design-systems/upstream/`: the open-design Apache-2.0 LICENSE and its
  `design-systems/README.md` attribution, the kit's MIT LICENSE and its awesome-ios-design-md notice.
- `scripts/import-brand-design-systems.cjs` (new) owns the import: reviewed revisions, Git trees and
  content hashes are constants; the command line refuses anything else. `build()` takes the pins as an
  argument so tests check determinism on fixture repositories.
- `skill/scripts/brand-design-systems-core.cjs` (new) loads and verifies the manifest (shipped and
  fetched trees through `verifyTree`), normalises tokens, and searches and inspects systems.
- `skill/scripts/vendor-cache.cjs`: partial bundles are found by a list of schemas;
  `partialBundles()` also returns the schema; a partial manifest with `packs` maps objects to packs.
  `design-direction-library-core.cjs` finds its manifest by schema instead of taking the first.
- `skill/scripts/fetch-sources.cjs` verifies each partial bundle with its own verifier.
- `skill/scripts/design-md-source-core.cjs`: `search` merges catalog hits and reports `catalogs`;
  `inspect` routes `design-md:design-system:` ids to the catalog. `cli-core.cjs` `doctor` gains
  `brandDesignSystems` and a `downloads` entry.

## Decisions

- Ship the index, fetch the text. All 9.3 MB is text, so the direction-library split (ship text,
  fetch binaries) would add 9.3 MB to a package already above the Skills CLI defaults (#169). The
  manifest is written with one object and one system per line (370 KB). Search needs the fetched
  DESIGN.md and tokens anyway, so nothing else ships.
- English only, and only the agent-facing files: `manifest.json`, `DESIGN.md`, `USAGE.md`,
  `tokens.css`, `components.html`, `source/token-contract.report.json`. Translations (16 languages
  for 23 systems), preview pages, `system/` artifact pages and derived exports (`design-tokens.json`,
  `tailwind-v4.css`, `components.manifest.json`) stay upstream.
- Dedupe by id. The kit's own packages never share an id with open-design at these revisions; the
  importer would keep the package with more recorded files and record the other. The kit's overlays
  are attached to the system they correct, and `tokens.override.css` wins when tokens are normalised
  (it replaces placeholder accents such as `#2563eb`). The kit's `claude-design-systems/` export
  repeats all 198 systems in another format; the importer checks each maps to a chosen system and
  skips it.
- Normalised front matter is computed at inspect time from the fetched `tokens.css` (+ overlay), not
  stored: it costs nothing to ship and cannot drift from the pinned bytes. All 198 tokens files share
  one schema, so the mapping is fixed: `--accent` -> `primary`, `--bg` -> `background`, `--fg` ->
  `on-surface`, `--border` -> `outline` ..., eight type styles from the font and size tokens,
  `rounded` from radii, `spacing` from `--space-*`, section, container and gutter. `var()`,
  `color-mix(in oklab|srgb)`, `oklch()` and `rgb()` become hex; anything else is listed in
  `omittedTokens`. Two upstream DESIGN.md files already have front matter; the entry says so.
- Extend `designmd search`, not a new command. Without `--kind` it returns examples and systems
  ranked together (dimabraven scoring plus weight for name, category and description); before the
  fetch it returns the examples and a `catalogs` entry with the fetch command, so existing searches
  never fail. `--kind design-system` and `inspect` of a system fail `TOOL_MISSING` before the fetch.
  A cache that no longer verifies is refused (`SOURCE_CHANGED`, naming the folder to remove).
- Two records in the component source catalog (`downloaded-implementation`, guide `design-md.md`)
  keep every vendored source discoverable.

## Compatibility and migration

Additive. No existing manifest, command, receipt or result field changes; search results gain
`catalogs`. `BUNDLES` lists one more fetchable bundle; `WHOLE_BUNDLES` and packaging are unchanged
because the bundle is partial.

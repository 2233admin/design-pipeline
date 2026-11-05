## Why

The bundled Astryx snapshot (`skill/references/astryx-design-system-snapshot.json`) was frozen at
`@astryxdesign/cli` 0.2.0 JSON output while upstream reached 0.7.7. Regenerating it meant running the
Astryx CLI, which is upstream code the update job must not execute, so `sources.lock.json` held the
`astryx` entry (#263). Users searching components, hooks, templates or tokens through the bundled
snapshot saw a five-minor-old surface: 17 components, 19 hooks, about 120 docs topics and 80
templates were missing, and 18 token values had changed.

## What Changes

- `scripts/generate-astryx-snapshot.cjs` is rewritten to build the snapshot statically from the
  `@astryxdesign/core` and `@astryxdesign/cli` npm tarballs: it reads them in memory, parses every
  `*.doc.mjs` with `@babel/parser` and evaluates literal values only. A non-literal value fails the
  run with its file and line; four CLI topics that the CLI computes at run time are skipped by name.
  It follows the CLI's discovery, `docsZh`/`docsDense` lens overlay, token-ref inlining and template
  listing rules, checks both packages are the same release under MIT, and records each tarball's
  sha512 integrity in the snapshot provenance.
- A `docsZh` or `docsDense` lens is stored only where it reads differently from the entry. The lenses
  stay because the doc files carry them; the snapshot schema stays `v1`.
- `sources.lock.json`: the `astryx` npm entry names the generator as its importer and is no longer
  held. `scripts/sources-update.cjs` runs an npm entry's importer with the release tarballs fetched by
  `npm pack --ignore-scripts` (`{pack:<package>}`, `{revision}`); a failing importer restores its
  outputs and leaves the lock. `scripts/sources-lock.cjs` validates the importer form.
- The snapshot is regenerated at 0.7.7 by that path. The token projection now types a `-color`
  suffix as a color and a CSS border-style keyword under a `-style` name as a `strokeStyle`, so the
  two new focus-outline tokens project and the bundled projection stays `ready`.
- Tests read the version and revision from the lock instead of literals; `@babel/parser` becomes a
  root dev dependency.

## Capabilities

### Modified Capabilities

- `design-pipeline`: bundled Astryx snapshot provenance and regeneration; token type inference;
  sources:update for release-derived npm data.

## Impact

- Files: `scripts/generate-astryx-snapshot.cjs`, `scripts/sources-update.cjs`,
  `scripts/sources-lock.cjs`, `sources.lock.json`, `skill/references/astryx-design-system-snapshot.json`,
  `skill/scripts/design-system-decision-core.cjs`, `skill/references/component-source-catalog.json`,
  `THIRD_PARTY_NOTICES.md`, docs and tests.
- Public commands and the snapshot schema are unchanged. Consumers already treat a missing lens as
  absent (`design-system-catalog-core.cjs` search text).

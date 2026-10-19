# Vendor the design direction library

## Why

Closes #171. The pipeline has no library of design directions to choose from or judge against: no
catalog of styles with rendered specimens, no method for producing directions that differ in
structure, no brand-asset protocol, no critique guide. An MIT-licensed reference project has all of
them. The owner decided to bring it in as a pinned source bundle first and adopt its methods
through follow-up issues (#155 direction sources, #154 appearance ledger, #156 brand and facts,
#157 critique). The package is already above the Skills CLI defaults (#169), so the binaries (images,
music) must not ship.

## What Changes

- `skill/vendor/<upstream>/` holds a byte-preserved snapshot of the pinned commit's text: license,
  READMEs, the upstream `SKILL.md` (stored as `UPSTREAM-SKILL.md`), `references/**`, the 84 HTML
  style specimens, small text assets and `scripts/**` as inert reference material. `manifest.json`
  records the source, the Git tree and, per file, mode, blob id, size and SHA-256.
- The other files (specimen JPGs and sheets, music and sound effects, showcase and demo pages and
  images, repository metadata) are listed in the manifest's `fetched` section with the same fields
  and are downloaded on demand by `sources fetch --bundle design-direction-library`, pinned to the
  commit. `doctor` reports them under `downloads`.
- `scripts/import-design-direction-library.cjs` imports from a clean local checkout at the reviewed
  revision; `npm run sources:import:direction-library`.
- QA's former-name rule allows the upstream name only in the vendored folder,
  `THIRD_PARTY_NOTICES.md` and the importer; every other tracked path or content still fails.
- `skill/references/design-direction-library.md` (neutral name) describes the bundle and is routed
  from `SKILL.md`. `THIRD_PARTY_NOTICES.md` gains the MIT notice. No stage, gate or `next` action
  changes.

## Reuse

`scripts/git-tree-snapshot.cjs` (checkout inspection, copy, hashing), `skill/scripts/upstream-path.cjs`
(`SKILL.md` stored as `UPSTREAM-SKILL.md`), `skill/scripts/vendor-cache.cjs` and `fetch-sources.cjs`
(the MengTo and iart download path: raw files at the pinned revision, size and blob id checks, an
all-or-nothing cache install), `gitTreeId`, `inspectDoctor` `downloads`, the `sources:check` and
`sources:import:*` conventions. No parallel downloader, gate, receipt, resolver or policy digest.

## Impact

Affects `design-pipeline` (source bundles, doctor, QA publication hygiene). The package grows by the
shipped text only: 181 files, 1.6 MB. No public command is removed or renamed; `sources fetch`
accepts one more bundle id.

## Why

A skill-creator review (`quick_validate`) rejects the packaged skill: `skill/` holds 259 files
named `SKILL.md`. One is the pipeline's own entry; 258 are upstream skills kept byte-for-byte under
`skill/vendor/` (mengto 176, iart 50, taste 13, interface-discipline 8, one each in 11 more).
claude.ai and the Skills API accept exactly one `SKILL.md` per skill, and Claude Code's filesystem
loader treats nested ones as extra skills. Issue #118.

## What Changes

- Upstream files named `SKILL.md` are stored as `UPSTREAM-SKILL.md`. Bytes do not change.
- Manifests do not change. Object paths, Git blob ids, `gitTree`, `treeSha256`, file counts and
  catalog `path` fields keep describing the upstream tree.
- One shared mapping (`skill/scripts/upstream-path.cjs`) converts an upstream path to its stored
  path and back. Verifiers, catalog search results, `film methods` preparation, importers, the
  snapshot helper and tests use it wherever they read, hash, write or return a vendor file.
- Importers write the stored name and refuse an upstream that already contains a file named
  `UPSTREAM-SKILL.md`, so the mapping stays reversible.
- Guides, `package-resources.json` and tests point at the stored name.
- Repository QA fails when the built package contains more than one `SKILL.md`.

Owner decision (2026-10-14): rename in the repository, not only at packaging time. The follow-up
#119 (download vendor bundles on demand) stores fetched bundles with the same mapping.

## Capabilities

- `design-pipeline`: ADDED `The package holds one SKILL.md and upstream skills keep their bytes`.

## Reuse

- The existing manifests, verifiers and `scripts/git-tree-snapshot.cjs` (copy and canonical tree).
- Existing source-integrity tests (`sources:check`) and package QA.

## Impact

- The release package passes the one-`SKILL.md` rule. Its size is unchanged until #119.
- Agents reading a bundled upstream skill open `UPSTREAM-SKILL.md`; catalog commands return that
  path.

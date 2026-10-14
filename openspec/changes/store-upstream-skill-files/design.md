# Design: store upstream SKILL.md files under another name

## Context

`skill/vendor/<bundle>/upstream/` holds pinned upstream trees. Manifests record each file's
upstream path, Git blob id and size, the upstream `gitTree`, and a `treeSha256` over
`path\0sha256\n` lines. Verifiers walk the directory and compare it with the manifest; catalog
searches (mengto, iart) return a path to an upstream `SKILL.md` for the agent to read;
`film methods` preparation verifies a named entry file.

## Decisions

- **Stored name:** `UPSTREAM-SKILL.md`. Any path whose last segment is `SKILL.md` is stored with
  that segment replaced; nothing else changes.
- **Manifests keep upstream paths.** Git blob ids and `gitTree` are computed from upstream names, so
  rewriting manifest paths would break provenance checks against the upstream repository. The
  mapping is applied at the filesystem boundary instead:
  - `storedPath(upstream)` when opening, writing or returning a file;
  - `upstreamPath(stored)` when a directory walk turns a found file into a manifest path.
  `upstreamPath` refuses a stored `SKILL.md`, so a file that escaped the rename is reported.
- **One helper,** `skill/scripts/upstream-path.cjs`, Node built-ins only. Repository scripts
  (`scripts/import-*.cjs`, `scripts/git-tree-snapshot.cjs`) and tests require it from there.
- **Importers** write through `storedPath` (`copyTrackedFiles`, the mengto writer) and fail when an
  upstream tree already has an `UPSTREAM-SKILL.md`. `canonicalTree` reads through `storedPath`, so
  a re-import reproduces the same `treeSha256`.
- **Catalog output:** mengto and iart results return the stored file path. The instruction text
  says "the returned skill file" rather than naming `SKILL.md`.
- **Package check:** QA counts entries named `SKILL.md` in the built archive and requires exactly
  `design-pipeline/SKILL.md`.

## Migration

`git mv` of the 258 files; no manifest edits. Agents and docs that linked a vendor `SKILL.md` use
the stored name. No compatibility alias is kept.

## Not in this change

Package size (#119).

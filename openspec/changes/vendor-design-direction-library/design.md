# Design

## File ownership

- `skill/vendor/<upstream>/manifest.json` and `upstream/` (new): the shipped snapshot. Schema
  `design-pipeline.direction-library-source.v1`; `bundle` is the neutral fetch id
  `design-direction-library`; `snapshot` (shipped) and `fetched` hold `objects[]` with `path`,
  `mode`, `oid`, `size`, `sha256`, plus `fileCount`, `byteCount` and a canonical `treeSha256`.
  Together the two sections rebuild `source.gitTree` exactly (389 files: 181 shipped, 208 fetched).
- `scripts/import-design-direction-library.cjs` (new) owns the import. It is the one source file
  that names the upstream repository.
- `skill/scripts/vendor-cache.cjs` owns the download. A bundle whose manifest has `fetched` is
  partial: its fetch id is `manifest.bundle`, it is found by manifest schema (the code names no
  upstream), the downloaded tree lives in the cache keyed by `fetched.treeSha256`, and each file is
  also checked against `sha256` when recorded. `WHOLE_BUNDLES` replaces `BUNDLES` in packaging,
  where only whole-tree bundles are omitted.
- `skill/scripts/design-direction-library-core.cjs` (new) verifies both parts and returns
  `ready`, `missing` (text verified, binaries not downloaded; names the fetch command) or `blocked`.
  `doctor` calls it and lists a `missing` result under `downloads`, never under `missing`.
- `scripts/reference-name-scope.cjs` (new) owns the former-name rule that `scripts/qa.cjs` runs.
- `skill/references/design-direction-library.md` and the `SKILL.md` route row describe the bundle
  without the upstream name. Vendor paths are not written in any file outside the allowed places;
  the guide points at `doctor --json` (`directionLibrary.shipped.root` / `.fetched.root`) instead.

## Decisions

- Partial bundle in the existing mechanism, not a second downloader: MengTo and iart fetch a whole
  tree by blob id; this adds a manifest section and a SHA-256 check and keeps the download loop,
  the partial directory, the all-or-nothing rename and the cache layout.
- Scope: reference text, the 84 specimens, small text assets and `scripts/**` ship when they are
  UTF-8 text (a PNG test fixture among the scripts is fetched). Everything else is fetched,
  including the 24 showcase and 21 demo pages, to keep the package change to 1.6 MB. The specimens
  need no local file: their only external references are web fonts loaded from their own hosts.
- The shipped scripts are stored without the executable bit; the manifest keeps the upstream mode.
  Nothing in the repository or package invokes them, and `manifest.boundary` states that.
- `package-resources.json` lists the guide and the core script but not the vendored files: its
  paths would carry the upstream name, which the QA rule confines to the vendored folder. The
  files are covered by `doctor` (shipped verification blocks on any difference) and by the tests.
- The component source catalog does not index the library: its record would carry the upstream
  repository URL, which the QA rule confines to the vendored folder. `tests/component-source-completeness.test.cjs`
  skips manifests of the library's schema, and the library's own test covers its provenance.
- The QA exception is a path prefix (`skill/vendor/<upstream>/`) plus two exact files; look-alike
  paths and every other file still fail. The prefix is assembled from parts in the checker so the
  checker is outside the rule.

## Compatibility and migration

Additive. No existing manifest, command or receipt changes. `BUNDLES` still lists every fetchable
bundle (now three); `doctor` gains `directionLibrary`; the doctor text label for libraries names
the third source. Existing installs fetch the new binaries only if they ask.

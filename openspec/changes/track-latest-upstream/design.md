## Context

Owner decision (#259): every upstream follows its latest state; green tests on the bump PR are the
review. This change replaces the reviewed-revision policy with a lock, an updater and a weekly PR.

## Decisions

1. **The lock lives at the repository root** (`sources.lock.json`) and is maintenance data, not
   packaged. Run-time fetches (`sources fetch --bundle`) read the revision from the shipped vendor
   manifests, which the importer writes, so the package needs nothing from the lock. The lock may
   name the direction library's upstream (`scripts/reference-name-scope.cjs` allows it beside the
   notices and that importer).
2. **One entry per source, one revision per repository.** Kinds: `vendored` (bytes ship),
   `fetched-on-demand` (manifest ships, bytes download), `adapted-reference` (a guide written from
   hashed upstream files), `catalog-reference` (links and records), `npm` (latest npm release, with
   the release tag's commit when a repository is cited) and `release` (latest semver tag; reflex-dev/xy
   is a Python library). Entries sharing a repository always move together. Bundle entries carry the
   snapshot `treeSha256` (and `fetchedTreeSha256`), so rehashing a manifest over edited bytes is a
   visible lock change, which keeps the old anti-rehash property.
3. **Derived pins are rewritten, then checked.** The updater collects every pin of a repository
   (GitHub blob/tree/commit links, JSON objects pairing a GitHub URL with `revision` /
   `reviewedRevision` / `commit`, frontmatter `url` + `reviewedRevision`), maps each old revision,
   Git tree, snapshot hash and adapted content hash to its new value and replaces those hex strings
   (40/64 hex digits are unique; short link prefixes keep their length). A review date written right
   after a rewritten revision moves with it. A source whose revision, version and hashes are
   unchanged writes nothing, not even a review date, so a quiet week is no diff; freshness is the
   weekly comparison with upstream, not a date. npm and release versions are written through declared
   sites (JSON path or a `{version}` pattern); a pattern that also matches a different version
   is ambiguous and stops that entry rather than rewriting the wrong text. An exhaustive per-file `package-resources.json`
   listing is regenerated; a partial one names load-bearing files and stays. `derive` scripts
   regenerate projections (the MengTo catalog). `checkAgreement` then requires every pin to equal
   the lock, every bundle manifest to carry the lock's repository, revision and hashes, and the
   notices to name every bundle revision.
4. **Pin scope** is `skill/`, `tests/`, `docs/`, `.github/`, `THIRD_PARTY_NOTICES.md` and
   `README.md`, excluding vendored upstream bytes. `scripts/` is out of scope so the updater never
   writes code (the answer-me-with-html constant has its own test). Research notes (`docs/research/`, `docs/archive/`),
   change records, `CHANGELOG.md`, examples (adapted code records the commit it came from) and eval
   case fixtures are history, not dependencies, and keep their citations. Derivation commits in the
   notices ("concepts rewritten at", "adapted from") stay for the same reason.
5. **Upstream is data.** Repositories are fetched with `--depth 1 --filter=blob:none` into a
   temporary directory, hooks, fsmonitor and credential helpers off, LFS smudge off. Importers read
   blobs through `git cat-file`; symlinks and unusual modes are refused by the existing copy helper.
   No upstream script, package manager hook or build runs (`npm install --package-lock-only
   --ignore-scripts` for lockfile updates). The weekly workflow records the patch before the browser
   install and QA, and refuses a patch that touches `.github/`, `scripts/` or any `package.json`
   field other than dependency versions. QA, which reads vendored files, runs with a read-only token;
   a second job with write access only applies the patch and opens the pull request. Green means
   every source moved, the scope held and specs and QA passed; an open PR that stops being green is
   converted to draft (GraphQL `convertPullRequestToDraft`). The standing branch is force-pushed only
   when every commit on it is the bot's; otherwise the update goes to a dated branch and PR and the
   old PR gets a comment. Upstream names in the PR body are code spans.
6. **Restructure fails loudly, per source.** Before import: every path a pin cites must exist at the
   new revision, every cited license file must have the same blob, the root `LICENSE*`, `LICENCE*`,
   `COPYING*` and `NOTICE*` files must be unchanged whether cited or not, and every companion capability
   marker of the source's skills must still match upstream text. During import: the importer's
   structural checks (entry files, skill names, license text). After import: a removed bundle file
   still cited by its vendored path or its last two path segments restores the previous bundle. A
   failure leaves that source, its pins and its lock entry unchanged and the run exits 1; other
   sources still move.
7. **Importers keep structure, lose pins.** Revision, Git tree, tree hash and inventory constants
   are removed from the taste, good-css, gepa, film, UI craft and direction library importers; the
   iart, MengTo and DESIGN.md importers never had them. `scripts/import-scoped-snapshot.cjs`
   re-imports the five bundles that had no importer (interface discipline, Prism, deepclonewebsite,
   shadcnio, Holosticker) from the scope and hash layout their manifest already records and keeps
   their hand-maintained fields; at their locked revisions it reproduces the existing hashes.
   `import-answer-me-with-html.cjs` keeps its revision constant because the renderer build pins the
   importer's bytes; the lock test checks the two agree, and a new revision needs
   `npm run answer-html:build` (the updater fails loudly until then).
8. **Held, never silently old.** `held: { reason, issue }` keeps an entry at its revision; the updater
   reports it and `sources:check --upstream` lists it as held behind. First run: HyperFrames as the
   target-project runtime (0.8.137; 0.9 retires the routed workflow skills and changes check rules and
   render bytes, which is `hyperframes-0-8-221`, #262), the Astryx snapshot (regeneration runs the
   upstream CLI, #263) and `12-principles-of-animation` (upstream deleted the skill, #264). The golden
   case workspace's `hyperframes` dev dependency is its own entry and tracks latest, so until #262
   lands the scaffold pins 0.8.137 while the golden cases render with 0.9.x; this split is accepted.
9. **Releases for libraries.** Three.js, Phaser, anime.js, HyperFrames and Astryx are cited as
   releases, so their repository pins follow the latest release tag (`r{minor}`, `v{version}`), not
   HEAD; prose names the version through a site pattern.
10. **Tests read the lock.** Source tests compare manifests with `lockedSource(id)` instead of
    literal revisions, inventories and counts; they still verify every byte, blob id and hash.
    Rejections of "unreviewed" revisions become the opposite: an importer records whatever clean
    checkout it is given.
11. `refresh-upstream-snapshots` is superseded and removed: interface-discipline, good-css, Cinetic
    and Impeccable moved to HEAD here with their guides; its 12-principles freeze and HyperFrames
    unification are #264 and #262.

## Migration

`npm run sources:update` replaces `sources:import:*` for routine moves; the per-source import
commands remain for a single local checkout. Removed paths: none in `skill/`; the importers' pinned
constants and the superseded change directory.

## Risks

- Prose that paraphrases an upstream can drift without a test noticing. Mitigation: the updater
  rewrites citations and dates only; content changes still surface as failing source tests,
  companion marker checks or the PR diff, which the owner reads before merging.
- A new upstream file in an exhaustively listed bundle grows the package automatically. That is the
  policy; the PR lists it.

## 1. Change

- [x] 1.1 Restore nine iart GIFs and four holosticker files from upstream at the recorded revisions;
  update manifests and the holosticker catalog content hash.
- [x] 1.2 `.gitattributes`: `skill/vendor/**/upstream/** -text`; source-governance test.
- [x] 1.3 iart verification checks every pack's Git tree; drift regression test.
- [x] 1.4 `sources:check`, `npm run specs:check`; CI green on the PR (local: visual-craft browser test needs a non-root browser here).

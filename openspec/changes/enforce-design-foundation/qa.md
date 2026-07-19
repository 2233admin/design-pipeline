# QA

## Local verification

- `node scripts/qa.cjs`: passed, 67/67 repository tests.
- `node skill/scripts/check-design-foundation.cjs --project-root . --json`: `ready`.
- `node scripts/install-local.cjs`: installed the current skill package.
- `node skill/scripts/check-deps.cjs`: `Result: OK`, including 22/22 bundled resources and the project foundation surface.
- `node --test tests/design-synthesis.test.cjs tests/website-cloning-init.test.cjs`: passed, 35/35 targeted tests.
- `sentrux gate .`: passed at `7067 -> 6934` after the shared-core boundary cleanup.
- The first committed-tree Code Intel run correctly blocked at `6746`; its surgery plan identified
  `validateOptions`. The function was decomposed without behavior changes and the foundation CLI was
  reduced to a thin adapter. A clean rerun remains pending.

## Pending publication verification

- Code Intel on the committed tree.
- GitHub CI and automated review.
- Release artifact and installed-release verification.

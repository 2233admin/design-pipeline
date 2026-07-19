# QA

## Local verification

- `node scripts/qa.cjs`: passed, 67/67 repository tests.
- `node skill/scripts/check-design-foundation.cjs --project-root . --json`: `ready`.
- `node scripts/install-local.cjs`: installed the current skill package.
- `node skill/scripts/check-deps.cjs`: `Result: OK`, including 22/22 bundled resources and the project foundation surface.
- `sentrux gate .`: passed with no structural-quality degradation.

## Pending publication verification

- Code Intel on the committed tree.
- GitHub CI and automated review.
- Release artifact and installed-release verification.

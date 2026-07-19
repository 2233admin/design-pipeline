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
  reduced to a thin adapter.
- Code Intel snapshot `20260719-144512`: passed 7/7 executed stages, Sentrux check/gate passed,
  no blocking debt, quality `7067 -> 6934`.
- GitHub review follow-up: frontmatter name extraction now returns the value from the validated
  frontmatter block, and website-clone URL lists default safely at the option boundary.
- CodeRabbit follow-up: adopted/rejected markers are now required inside the Source Decisions
  section, `--design-file` errors name the correct flag, and the long-lived spec covers `invalid`.
- GitHub CI: passed `qa-and-package`.
- Automated review: CodeRabbit and GitGuardian passed; all actionable review findings were
  addressed.

## Pending publication verification

- Release artifact and installed-release verification.

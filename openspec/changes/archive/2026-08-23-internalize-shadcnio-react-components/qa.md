# QA

- `node --test tests/shadcnio-react-components.test.cjs tests/designer-pipeline-cli.test.cjs
  tests/install-local.test.cjs tests/package-release.test.cjs`: 22 passing tests.
- `node scripts/qa.cjs`: 44 test files and 380 tests passed. The QA script also verified static
  resources and syntax, reproducible `.tgz`, `.zip`, and checksum artifacts, isolated archive
  installation, installed-package `doctor`, and installed `shadcnio verify/search`.
- `designer-pipeline doctor --root . --json`: ready. The source snapshot verified revision
  `2dc66e0e7b159fa92e761c84f3c5325c9700c415`, 2 files, 20,889 bytes, 75 entries
  (`ai: 16`, `button: 15`, `hook: 34`, `text: 10`), and tree SHA-256
  `7a8b6f8798efb8bb7895fa1f4297afe1bcf39f8246d6d6fdf12bc7b370c4e1a8`.

# QA

## Contract tests

- `node --test tests/reference-evidence.test.cjs tests/reconstruction.test.cjs`: passed.
- Silent downgrade, missing rectification/overlay evidence, clustered landmarks, camera mismatch,
  pending final evidence, threshold success, render-hash tampering, exact-mode masks, and public CLI
  routing are covered.

## Repository QA

- `node scripts/qa.cjs`: passed.
- 189 repository tests passed.
- Package resources and JSON schemas passed.
- Reproducible tgz/zip/checksum builds passed.
- Isolated package installation and installed-package CLI smoke passed.

## Installed skill

- Replaced `C:\Users\Administrator\.codex\skills\design-pipeline` from the local canonical skill.
- Installed `designer-pipeline doctor` reports `ready` with no missing resources.

## Architecture

- Sentrux initially rejected a new god file.
- The implementation was split into intent, geometry contract, fidelity contract, and execution
  modules; the CLI spatial checks were consolidated.
- Final native Sentrux gate: quality `8870 -> 8870`, coupling `0 -> 0`, cycles `0 -> 0`, god files
  `7 -> 7`, no degradation.
- Final Code Intel normal run passed:
  `C:\Users\Administrator\AppData\Local\code-intel\artifacts\design-pipeline\1785478278877-72788-core\run-complete.json`.

## Feedback loop

- Recorded local redacted pipeline-bug observation `dpf-1b2fa97dbc163881`.
- The draft was not published remotely.

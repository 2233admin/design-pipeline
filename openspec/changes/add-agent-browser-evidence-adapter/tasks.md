# Tasks

- [x] Add `skill/adapters/agent-browser.cjs` with the capture sequence and artifact shapes in `design.md`.
- [x] Accept and forward `--agent-browser` and `--chrome` in `capture-web-evidence.cjs` and `evidence capture`; register `--agent-browser` in `KNOWN_OPTIONS`.
- [x] Add hermetic contract tests with a fake agent-browser and register them in `scripts/test-manifest.json`.
- [x] List the adapter in `skill/references/package-resources.json`.
- [x] Update `skill/references/web-evidence-adapter.md`, `skill/references/pipeline-reference.md` and `CHANGELOG.md`.
- [x] Capture a real target with agent-browser and pass `evidence check --require-files`.
- [x] Run `node scripts/qa.cjs`.

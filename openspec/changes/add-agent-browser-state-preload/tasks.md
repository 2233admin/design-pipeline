# Tasks

- [x] Accept `--agent-browser-state` in `capture-web-evidence.cjs` and `evidence capture`, register it in `KNOWN_OPTIONS`, and refuse it outside the project, with another adapter, or without `--agent-browser`.
- [x] Pass the state to agent-browser as `--state` and name the file and sha256 in the probe message.
- [x] Read the state once into a private copy that the adapter loads and the host removes, so the hash names the loaded bytes (PR #84 review).
- [x] Add hermetic contract tests: preload, file rewritten during capture, copy removed on failure, outside the project, another adapter, without agent-browser, CLI forwarding.
- [x] Update `skill/references/web-evidence-adapter.md` and `CHANGELOG.md`.
- [x] Capture a real stateful target (KatanaConsole) and pass `evidence check --require-files`.
- [x] Run `npm test` and `npm run specs:check`.

# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta; tracked in 2233admin/design-pipeline#198.
- [ ] 1.2 `npm exec -- openspec validate fix-capture-puppeteer-guidance --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `film-core` / `film-capture-core.cjs` and `capture-composition.cjs`: error text names both fixes; HyperFrames hint only when a HyperFrames marker is present.
- [ ] 2.2 `workflows/directions.cjs` concepts instruction and `directions-core.cjs` failure hints: capture commands carry `--puppeteer-module` from `doctor`.
- [ ] 2.3 `doctor`: one `puppeteer-core` line with resolved path or `missing`.

## 3. Tests and docs

- [ ] 3.1 Focused tests for the three scenarios per requirement; register each new test file in `scripts/test-manifest.json`.
- [ ] 3.2 Confirm the docs from `docs: say when composition capture needs --puppeteer-module` still match the new message text.

## 4. Verification

- [ ] 4.1 Real run in a scratch project with no `puppeteer-core`: error text and `doctor` line as specified.
- [ ] 4.2 `npm test` green.

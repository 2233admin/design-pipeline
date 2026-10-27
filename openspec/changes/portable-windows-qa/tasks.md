## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate portable-windows-qa --strict` and `npm run specs:check` pass.

## 2. Behaviour and tests

- [x] 2.1 Verification issues use `/` in `mengto-skills-core.cjs`.
- [x] 2.2 Four package tests pass the archive as a relative name with `cwd`.
- [x] 2.3 `reference-name-scope.test.cjs` skips the look-alike case on a case-insensitive filesystem.
- [ ] 2.4 Browser launch test under parallel QA: record the cause and the fix, or the reason it stays host-specific.

## 3. Verification

- [ ] 3.1 The six touched test files pass; `npm test` exit code and remaining failures reported.

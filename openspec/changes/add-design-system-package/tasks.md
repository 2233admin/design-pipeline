## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta (ADDED requirements only); GitHub #147.
- [x] 1.2 `npm exec -- openspec validate add-design-system-package --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `design-system-package-core.cjs`: package check (tokens, usage, aliases, contrast per
  theme, README sections, components, cover), DESIGN.md drift, tokens.css and preview compile,
  DESIGN.md token generation.
- [x] 2.2 `cli-core.cjs`: `foundation check --kind system`, `--kind all` includes a present package,
  `design-system check | compile | design-md-tokens`, `--system-dir`.
- [x] 2.3 Synthesis Stage 4 and the ui/web standard work instruction write the package.

## 3. Tests and docs

- [x] 3.1 `tests/design-system-package.test.cjs` registered in `scripts/test-manifest.json`.
- [x] 3.2 `references/design-system-package.md`, `design-synthesis.md`, package resources,
  CHANGELOG `[Unreleased]`.

## 4. Verification

- [x] 4.1 The Shinka Research package (2233admin/ShinkaEvolve `research/ui`) passes
  `foundation check --kind all`; its regenerated `DESIGN.md` passes the Google lint; compiled
  previews render with `composition capture`.
- [ ] 4.2 `npm test` green locally and in CI.

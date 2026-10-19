# Tasks

## 1. Registry

- [x] 1.1 Add the `svg-d3` probe, plan, invoke and verify lifecycle
  (`skill/references/adapter-registry.json`).

## 2. Tests and documents

- [x] 2.1 Add the React + `svg-d3` resolve and probe regression to
  `tests/toolchain-routing.test.cjs` and the `svg-d3` lifecycle assertion to
  `tests/adapter-registry.test.cjs`; both fail before 1.1.
- [x] 2.2 Add `## SVG D3 Project Lifecycle` to `skill/references/graphics-runtime-routing.md` and a
  `CHANGELOG.md` entry.

## 3. Verification

- [x] 3.1 Run `node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs
  tests/graphics-runtime-catalog.test.cjs tests/designer-pipeline-cli.test.cjs`.
- [x] 3.2 Probe a real pnpm-installed `d3` 7.9.0 project and resolve its toolchain request.
- [x] 3.3 Run `npm test` and `npm run specs:check` and record them in `verification.md`.

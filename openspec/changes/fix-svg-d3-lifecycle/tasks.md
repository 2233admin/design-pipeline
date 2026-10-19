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

## 3. Nested project root

- [x] 3.1 Add `--project-root` to `toolchain probe` in `skill/scripts/cli-core.cjs`, contained
  inside `--root` and required to be a directory; the default stays `--root`.
- [x] 3.2 Add the nested-package and escape regression to `tests/designer-pipeline-cli.test.cjs`;
  it fails before 3.1.
- [x] 3.3 Document the option in the CLI help, `docs/cli-and-reference-providers.md`,
  `skill/references/stages.md`, `## SVG D3 Project Lifecycle` and `CHANGELOG.md`.

## 4. Verification

- [x] 4.1 Run `node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs
  tests/graphics-runtime-catalog.test.cjs tests/designer-pipeline-cli.test.cjs`.
- [x] 4.2 Probe a real pnpm-installed `d3` 7.9.0 project and resolve its toolchain request.
- [x] 4.3 Run `npm test` and `npm run specs:check` and record them in `verification.md`.
- [x] 4.4 Probe the real nested workbench through the CLI with `--project-root app`.

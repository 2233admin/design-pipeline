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

## 3. Target package directory

- [x] 3.1 Add optional `targetRoot` to the toolchain request and required `targetRoot` to the plan
  (`skill/references/toolchain-request.schema.json`, `toolchain-plan.schema.json`,
  `skill/scripts/toolchain-core.cjs`), with one path normaliser shared with `jobPlanPath`;
  `validateRequest` returns the canonical request and `resolveToolchain` uses it.
- [x] 3.2 Resolve `plan.targetRoot` inside `--root` for `toolchain resolve` and `toolchain probe`
  with a containment and directory check, probe there, name the directory in failed probe
  messages, and reject `--project-root` on both commands.
- [x] 3.3 Add the canonicalisation, hash, rejection and nested-package regressions to
  `tests/toolchain-routing.test.cjs` and `tests/designer-pipeline-cli.test.cjs`; they fail before
  3.1 and 3.2.
- [x] 3.4 Document `targetRoot` in the CLI help, `docs/cli-and-reference-providers.md`,
  `skill/references/stages.md`, `## SVG D3 Project Lifecycle` and `CHANGELOG.md`.
- [x] 3.5 Derive the probe directory only in `skill/scripts/toolchain-core.cjs`:
  `targetDirectory(root, targetRoot)` resolves and checks `plan.targetRoot`;
  `probeToolchain(plan, { root, runner })` rejects any other option, including `projectRoot`, and
  runs only there; `toolchain resolve` checks the directory before writing and `toolchain probe`
  passes only `--root`. The regression in `tests/toolchain-routing.test.cjs` fails on the
  `27d2a27` core and passes after.

## 4. Verification

- [x] 4.1 Run `node --test tests/adapter-registry.test.cjs tests/toolchain-routing.test.cjs
  tests/graphics-runtime-catalog.test.cjs tests/designer-pipeline-cli.test.cjs`.
- [x] 4.2 Probe a real pnpm-installed `d3` 7.9.0 project and resolve its toolchain request.
- [x] 4.3 Run `node scripts/qa.cjs` and `openspec validate --all --strict` and record them in
  `verification.md`.
- [x] 4.4 Run `toolchain request`, `toolchain resolve --write` and `toolchain probe` through the
  CLI on a temporary pipeline root whose stack input sets `targetRoot` to `app`.
- [x] 4.5 Run the same three commands on the real workbench pipeline root
  (`ShinkaEvolve/shinka/research/webui`, change `award-redesign`, `targetRoot` `app`).

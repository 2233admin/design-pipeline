# Proposal: Fix SVG/D3 Lifecycle

## Problem

`svg-d3` is the native `vector-data` adapter for every non-Reflex chart surface, but its registry
entry has no `lifecycle`. `toolchain resolve` therefore reports `blocked` with
`svg-d3 has no probe/plan/invoke/verify lifecycle` for every React + D3 project, whatever the
project has installed. A real React 19 + Vite workbench with `d3` 7.9.0 pinned and installed hit
this blocker on its `award-redesign` change. Three.js had the same defect and gained a
project-owned lifecycle in `evaluate-design-model-progress`; `svg-d3` was left without one.

With the lifecycle in place, the same workbench still could not be probed: its pipeline root
(`webui`, holding `.design-pipeline/` and `openspec/`) is not its package directory (`webui/app`,
holding `package.json` and `node_modules`). `toolchain probe` runs probes in `--root`, so it read
the absent `webui/package.json` and stayed blocked, and `--root` cannot move to `webui/app`
because the request and job plan must stay contained under it.

## Scope

- Give `svg-d3` a probe, plan, invoke and verify in the existing lifecycle contract. The probe
  reads only the target project's `package.json` and `node_modules/d3`: it requires an exact
  declared `d3` version equal to the installed one and a nonempty `scripts.dev`, imports that local
  package and requires its `select` export. It never installs, searches global modules, uses the
  network or starts the server.
- Invoke `npm run dev`, owned by the target project. Verify lists the adapter's declared DOM,
  screenshot and accessibility evidence for `design-pipeline.toolchain-receipt.v1`.
- Document the lifecycle in `graphics-runtime-routing.md`.
- Add `--project-root <dir>` to `toolchain probe`: the probe runs in that directory, which must
  resolve to an existing directory inside `--root`; artifacts and `--write` output stay under
  `--root`. Without the option the probe runs in `--root` as before.
- Out of scope: lifecycles for other native adapters without one, automatic detection of a nested
  `package.json`, `--project-root` for `toolchain resolve` (which runs no probe),
  package-manager detection, new receipt schemas or dependencies.

## Reuse

- The existing lifecycle shape, validator and probe runner (`adapter-core.cjs`,
  `toolchain-core.cjs`), and the Three.js project lifecycle as the pattern.
- The `--project-root` option and `contained()` containment check other commands in `cli-core.cjs`
  already use.

## Affected Capabilities

`toolchain-routing`: SVG/D3 has a project-owned executable lifecycle, and `toolchain probe` can
run in a project root nested inside `--root`.

## Success Criteria

- A React request selecting `svg-d3` resolves `ready` without the lifecycle blocker; the new
  regression in `tests/toolchain-routing.test.cjs` and the registry assertion in
  `tests/adapter-registry.test.cjs` fail before the change and pass after.
- The probe reports `d3=<version>` for a pinned installation and stays blocked with the concrete
  cause for a missing `package.json`, missing package, version range, mismatch, missing dev script,
  wrong package, missing `select` export or import failure.
- `toolchain probe --project-root app` on a pipeline root without `package.json` reports
  `d3=<version>` from `app`, and `..`, outside absolute, escaping junction, missing and file
  project roots are rejected; the CLI regression in `tests/designer-pipeline-cli.test.cjs` fails
  before the option and passes after.

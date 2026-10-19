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
because the request and job plan must stay contained under it. The plan, which every probe result
and receipt binds by `planSha256`, did not say where target-project commands run at all.

## Scope

- Give `svg-d3` a probe, plan, invoke and verify in the existing lifecycle contract. The probe
  reads only the target project's `package.json` and `node_modules/d3`: it requires an exact
  declared `d3` version equal to the installed one and a nonempty `scripts.dev`, imports that local
  package and requires its `select` export. It never installs, searches global modules, uses the
  network or starts the server.
- Invoke `npm run dev`, owned by the target project. Verify lists the adapter's declared DOM,
  screenshot and accessibility evidence for `design-pipeline.toolchain-receipt.v1`.
- Document the lifecycle in `graphics-runtime-routing.md`.
- Add `targetRoot`, the target package directory relative to `--root`, to the toolchain contract:
  optional in the request (set from the stack input), required in the plan (`.` when omitted).
  One path normaliser in `toolchain-core.cjs` canonicalises it and the existing `jobPlanPath`
  (`\` to `/`, POSIX-normalised, no trailing `/`) and rejects empty values, absolute paths, `:`
  and `..` segments. `toolchain resolve` and `toolchain probe` require it to resolve to an
  existing directory inside `--root`; `toolchain probe` runs its command probes there.
  `probeToolchain` derives that directory itself from `--root` and the plan and accepts no
  caller-supplied directory. A failed command probe names the directory it ran in. Both commands
  reject `--project-root` and name `targetRoot`.
- Out of scope: lifecycles for other native adapters without one, automatic detection of a nested
  `package.json`, per-entry working directories on probes, invocations or verification entries,
  a `cwd` field in receipts and receipt cross-checks of the tool and command against the plan,
  per-command option allow-lists, execution-route root handling, package-manager detection, new
  receipt schemas, schema version bumps or dependencies.

## Reuse

- The existing lifecycle shape, validator and probe runner (`adapter-core.cjs`,
  `toolchain-core.cjs`), and the Three.js project lifecycle as the pattern.
- The `resolveInside()` realpath containment check in `contract-utils.cjs` (the check behind the
  CLI's `contained()`), the existing `jobPlanPath` check (now the shared normaliser) and the
  existing per-command option rejection in `dispatch`.

## Affected Capabilities

`toolchain-routing`: SVG/D3 has a project-owned executable lifecycle, and the toolchain plan names
the contained target package directory where `toolchain probe` runs.

## Success Criteria

- A React request selecting `svg-d3` resolves `ready` without the lifecycle blocker; the new
  regression in `tests/toolchain-routing.test.cjs` and the registry assertion in
  `tests/adapter-registry.test.cjs` fail before the change and pass after.
- The probe reports `d3=<version>` for a pinned installation and stays blocked with the concrete
  cause for a missing `package.json`, missing package, version range, mismatch, missing dev script,
  wrong package, missing `select` export or import failure.
- A request built from a stack input with `targetRoot: "app"` yields a plan with
  `targetRoot: "app"`, and `toolchain probe` without any directory option reports `d3=<version>`
  from `app` on a pipeline root without `package.json`; an omitted `targetRoot` yields `.` and
  probes `--root` as before. `app/`, `./app` and `app\` give the same request and plan bytes as
  `app`, and changing `targetRoot` changes the plan hash.
- `..`, absolute, drive-letter or `:` and empty values fail request validation; a missing
  directory, a file and a junction resolving outside `--root` fail `toolchain resolve` and
  `toolchain probe` without writing output; `--project-root` on either command fails with
  `UNKNOWN_OPTION` naming `targetRoot`. The regressions in `tests/toolchain-routing.test.cjs` and
  `tests/designer-pipeline-cli.test.cjs` fail before the change and pass after.
- `probeToolchain(plan, { root, runner })` runs command probes only in `root` plus the plan's
  `targetRoot` and names that directory in failures; `projectRoot` or a missing `root` fails. The
  regression fails on the `27d2a27` core, where the probe ran in the caller's directory while
  naming the plan's, and passes after.

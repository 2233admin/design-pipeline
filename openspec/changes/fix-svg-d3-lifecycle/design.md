# Design: Fix SVG/D3 Lifecycle

## Context

`selectGraphics` in `skill/scripts/toolchain-core.cjs` blocks any selected adapter without a
`lifecycle`. `validateLifecycle` in `skill/scripts/adapter-core.cjs` and
`adapter-registry.schema.json` fix its shape: a `command` probe with a 100..30000 ms timeout, a plan
guide with dependencies and requirements, an invocation and a verification receipt schema with
evidence types. `probeToolchain` runs the probe with its `projectRoot` option as working directory
and a bounded environment; the CLI passed `--root`. Exit 0 reports stdout as the version, any
other exit blocks with the last stderr line.
`toolchain resolve` does not run probes. The toolchain plan, bound by `planSha256` in the probe
result and every toolchain receipt, did not record which directory target-project commands run in.

The registry declares `svg-d3` as `native`, `project-installed-only`, `project-pinned`, network
`none-required`, with evidence `dom`, `screenshot` and `accessibility` and degradation to a static
SVG or semantic table. The lifecycle must express exactly these facts.

## Decisions

1. **Mirror the Three.js project lifecycle.** The probe is a `node -e` command that reads
   `package.json`, requires an exact semver `d3` pin in `dependencies` or `devDependencies`, reads
   `node_modules/d3/package.json`, requires `name` `d3` and the declared version, and requires a
   nonempty `scripts.dev`. The same exact-pin rule as Three.js keeps `project-pinned` meaningful;
   a lockfile alone is not inspected.
2. **Strictly local package.** The package facts come from `<root>/node_modules/d3` only, as for
   Three.js, so a parent or workspace-root install does not satisfy `project-installed-only`.
3. **Import the ESM entry, not a CommonJS `require`.** D3 7 is ESM-only and its `exports` map
   (`umd`, `default`) does not export `./package.json`. The probe resolves the entry with
   `createRequire(<root>/package.json).resolve("d3")`, takes its real path (pnpm installs
   `node_modules/d3` as a link into `.pnpm`), requires it to stay inside the real
   `node_modules/d3`, imports it through a file URL and requires a `select` function. Import
   failures and rejected promises set exit code 1 and print one cause line.
4. **Invoke and verify as declared.** The invocation is `npm run dev` with entrypoint
   `package.json#scripts.dev`, owned by the target project; npm runs that script in npm, pnpm and
   Yarn projects alike. Verification uses the adapter's own evidence types for the existing
   toolchain receipt. Package import proves availability only, not chart rendering, accessibility
   or visual acceptance.
5. **The plan names the target package directory as `targetRoot`.** The field follows the
   component-first `target.root` naming; `projectRoot` already means the workflow root for CLI
   `--project-root`, an absolute Git root in `execution-target-core.cjs` and an absolute cwd in
   `probeToolchain`. The request may carry `targetRoot` (from the stack input, passed through by
   `buildToolchainRequest` like other choices); the plan always does, `.` when omitted, so
   `planSha256` binds the probe result and every receipt to that directory. There is no per-entry
   `cwd` on probes, invocations or verification entries, no new probe-result field and no schema
   version bump.
   One normaliser in `toolchain-core.cjs` handles `targetRoot` and the existing `jobPlanPath`: it
   converts `\` to `/`, rejects any `:` (drive letters), absolute paths and any `..` segment
   (checked before normalising, so `a/../b` is rejected rather than silently becoming `b`),
   POSIX-normalises and strips a trailing `/`. `targetRoot` allows `.`; `jobPlanPath` does not.
   `validateRequest` returns the canonical request, and both `buildToolchainRequest` and
   `resolveToolchain` use it, so `app`, `app/`, `./app` and `app\` give the same request and plan
   bytes. The lexical check runs on hand-edited requests too, because they reach `resolve` and
   `probe` without the builder.
   The CLI resolves `plan.targetRoot` against `--root` for both `toolchain resolve` and
   `toolchain probe` with the existing `contained()` realpath check plus a directory check, so
   `resolve --write` never emits a plan for a missing directory, a file, or a path that escapes
   `--root` through a symlink or junction. `probe` passes the resolved directory to
   `probeToolchain` as its `projectRoot`; the probe command and `probeToolchain`'s signature are
   unchanged. A failed command probe appends `(probed in <targetRoot>)` to its message so a
   forgotten `targetRoot` explains itself. The request, job plan and `--write` output still
   resolve against `--root`. Containment is deliberate: a pipeline run probes only packages it
   owns. Nothing detects a nested `package.json` automatically; the stack input names it.
   `--project-root` stays a global known option for other commands, so `dispatch` rejects it
   explicitly for `toolchain resolve` and `toolchain probe` with `UNKNOWN_OPTION` and a message
   pointing to `targetRoot`, next to the existing per-command action rejection.

## Risks

- A project that keeps `d3` in a version range is blocked until it pins an exact version, as
  Three.js projects are.
- A package outside the pipeline root (for example a sibling directory) cannot be probed from that
  root; its pipeline root must contain it.
- Any `..` segment in `jobPlanPath` is now rejected, including `a/../job-plan.json`, which the
  previous check normalised and accepted. The CLI always derives `jobPlanPath` from a contained
  file with `path.relative`, which never produces such a segment, so only hand-built calls change.
- Receipts bind the plan, and so `targetRoot`, only through `planSha256`; they do not record their
  own working directory, and `receipt-check` does not cross-check the tool or command against the
  plan. Those are separate follow-ups.

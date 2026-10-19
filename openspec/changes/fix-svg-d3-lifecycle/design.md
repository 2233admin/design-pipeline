# Design: Fix SVG/D3 Lifecycle

## Context

`selectGraphics` in `skill/scripts/toolchain-core.cjs` blocks any selected adapter without a
`lifecycle`. `validateLifecycle` in `skill/scripts/adapter-core.cjs` and
`adapter-registry.schema.json` fix its shape: a `command` probe with a 100..30000 ms timeout, a plan
guide with dependencies and requirements, an invocation and a verification receipt schema with
evidence types. `probeToolchain` runs the probe in the `--root` directory with a bounded
environment; exit 0 reports stdout as the version, any other exit blocks with the last stderr line.
`toolchain resolve` does not run probes.

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

## Risks

- A project that keeps `d3` in a version range is blocked until it pins an exact version, as
  Three.js projects are.
- `toolchain probe` uses `--root` both for the request artifacts and as the probe directory, so a
  project whose `package.json` sits below the OpenSpec root must be probed from that directory.

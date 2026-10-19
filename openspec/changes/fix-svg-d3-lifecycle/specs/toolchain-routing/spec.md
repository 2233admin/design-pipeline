## ADDED Requirements

### Requirement: SVG/D3 has a project-owned executable lifecycle

The existing svg-d3 adapter SHALL define probe, plan, invoke and verify using the existing toolchain contract, so a framework request that selects it is not blocked for a missing lifecycle. The probe SHALL inspect only the target project's package.json and node_modules/d3: an exact declared d3 version equal to the installed package version, a nonempty dev script, and an importable local package exporting select. It SHALL NOT install dependencies, fall back to parent or global modules, use the network, start the server or claim chart, accessibility or visual verification from package import.

#### Scenario: React project with a pinned D3 runtime

- **WHEN** a React toolchain request selects svg-d3 and the target declares an exact d3 version matching node_modules/d3 with a project-owned scripts.dev
- **THEN** the existing resolver SHALL report ready without a lifecycle blocker and supply the SVG/D3 guide and the npm run dev invocation
- **AND** the probe SHALL report the actual installed d3 version
- **AND** the plan SHALL list DOM, screenshot and accessibility evidence for the existing toolchain receipt without creating a receipt

#### Scenario: Missing or unpinned target D3 runtime

- **WHEN** the target lacks package.json or node_modules/d3, declares a version range or a mismatched version, lacks scripts.dev, or its local package is not d3, lacks select or fails to import
- **THEN** the existing toolchain probe SHALL remain blocked with the concrete cause
- **AND** it SHALL NOT install, start a service or modify the target package.json

### Requirement: Toolchain plan names a contained target package directory

The toolchain request MAY carry `targetRoot`, the target package directory relative to `--root`, from the stack input, and the toolchain plan SHALL always carry it, as `.` when the request omits it. Request validation SHALL canonicalise it (backslashes become `/`, POSIX normalisation, no trailing `/`) so equivalent spellings produce identical request and plan bytes, and SHALL reject empty values, absolute paths, any `:` and any `..` segment. Because the plan hash covers `targetRoot`, the probe result and every receipt bound by `planSha256` SHALL be bound to that directory. `toolchain resolve` and `toolchain probe` SHALL require `targetRoot` to resolve to an existing directory inside `--root` after following symlinks and junctions, and otherwise SHALL fail without writing output or running a probe. `toolchain probe` SHALL run its command probes in that directory without any directory option, and a failed command probe SHALL name the directory relative to `--root`. The request, job plan and any `--write` output SHALL stay contained under `--root`, and the probe SHALL stay read-only. `toolchain resolve` and `toolchain probe` SHALL reject `--project-root` with `UNKNOWN_OPTION` and a message naming `targetRoot`.

#### Scenario: Package nested below the pipeline root

- **WHEN** the pipeline root holds the job plan but no package.json, the pinned d3 package lives in its `app` directory, and the stack input sets `targetRoot` to `app`
- **THEN** `toolchain request` and `toolchain resolve` SHALL produce a request and plan with `targetRoot` `app`
- **AND** `toolchain probe --root <pipeline root> --artifact <request>` SHALL report ready with `d3=<installed version>`
- **AND** `app/`, `./app` and `app\` SHALL produce the same request and plan bytes and the same plan hash as `app`

#### Scenario: Target package is the pipeline root

- **WHEN** the stack input omits `targetRoot`
- **THEN** the plan SHALL carry `targetRoot` `.` and the probe SHALL run in `--root`
- **AND** on a pipeline root without package.json the d3 probe SHALL remain blocked with a message naming `(probed in .)`

#### Scenario: Target root outside the pipeline root

- **WHEN** `targetRoot` is empty, absolute, contains `:` or a `..` segment, or names a missing path, a file, or a symlink or junction resolving outside `--root`
- **THEN** request validation, `toolchain resolve` or `toolchain probe` SHALL fail with a distinct path error and SHALL NOT write output or run a probe in that location

#### Scenario: Stale directory option

- **WHEN** `toolchain resolve` or `toolchain probe` is given `--project-root`
- **THEN** the command SHALL fail with `UNKNOWN_OPTION` and a message telling the user to set `targetRoot` in the stack input

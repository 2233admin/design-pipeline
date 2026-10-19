# CLI And Design Reference Provider Boundary

## Ownership

The executable CLI is an orchestration facade, not a replacement document format.

- Project `DESIGN.md` owns reusable visual, layout, type, color, component, and accessibility decisions.
- Project `MOTION.md` owns reusable motion semantics and explicit static posture.
- Change `scene.json` owns the normative machine-readable runtime contract; `scene.md` is its readable projection.
- `designer-pipeline` owns lifecycle state, evidence intake, validation gates, resumability, adapter routing, benchmarks, feedback preparation, and release diagnostics.

## Entry Point And Result Contract

Run `node skill/scripts/designer-pipeline.cjs <command> --root <project> --json`.

Every JSON response uses `design-pipeline.cli-result.v1`. Exit codes are stable:

- `0`: command succeeded and its gate passed;
- `1`: invalid input, unsafe path, corrupt artifact, or unknown command;
- `2`: valid command, but continuation is blocked or verification failed;
- `3`: measured-fidelity mismatch (`fidelity-limited`).

All project artifacts must resolve below `--root`, including after existing symlinks or Windows
directory junctions are resolved. No command treats ambient network access or credentials as
permission to install, publish, or mutate a remote.

## Command Surface

surface validate
intake start|answer|confirm
template inventory|search|select|adapt|review|approve
doctor|status
plan|run|resume|explain-block|package|route
change init|resume|advance|migrate|repair
foundation check|direction check|playground check|reference check|resolve|reconstruction check|scene check
component-first check|stack|components|playground|page|verify|select|promote
design-skill route|manifest|run|select|promote
reconciliation check
feedback record|prepare|reconcile
evidence check|capture
verify motion|components
patterns search|audit|tokens check|ui-ir check|design-code-map check
component lock|fit|validate-fit|decompose|providers|resolve|inventory|bind|decide|verify
design-system options|resolve-stack|profiles|normalize|acquire|search|decompose|route|project-tokens|decide
mengto search|verify|shadcnio search|verify|prism search|route|verify|holosticker inspect|verify
designmd sync|search|inspect|verify|iart search|route|verify
toolchain request --plan <job-plan.json> --artifact <stack-input.json> [--write --output <toolchain-request.json>]
toolchain resolve|probe --artifact <toolchain-request.json> [--write --output <file>]
toolchain receipt-check
execution route|prepare|finalize
benchmark brief|evaluate
film methods --project-root <existing-film-dir> --input <method-plan.json> [--write] [--replace]
film templates [--query <terms> | --template <id>] [--all]
adapter audit|intake|receipt-check|style-signals check
adaptation check|resolve|record|propose|evaluate|promote|reject|rollback|forget

The stack input for `toolchain request` may set `targetRoot`, the target package directory
relative to `--root` (default `.`). The request and the plan carry it in canonical form (`/`
separators, no `./` or trailing `/`); `..` segments, absolute paths and `:` are rejected.
`toolchain resolve` and `toolchain probe` require it to resolve to an existing directory inside
`--root`, and `toolchain probe` runs its command probes there, so a pipeline root can keep the job
plan, request and `--write` output above a nested package. The plan hash covers `targetRoot`, so
the probe result and every receipt bound by `planSha256` are bound to that directory. Neither
command accepts `--project-root`.

`component-first check` consumes one contained request (target with `snapshotDigest`, stack,
components, Playground, page usage, evidence) and returns the `component-first-gate.v2`
receipt-chain artifact plus aggregate `status`, `reasonCodes` and `findings` inside the normal CLI
envelope; `--write --output` stores the artifact. `stack|components|playground|page` return that
stage's `component-first-stage-receipt.v2` and findings and are read-only. `verify` checks an
artifact's receipt chain, staleness and expiry; `select` and `promote` record the hash-bound
selection and approved promotion. None of them claims that typography, layout, motion, or visual
fidelity passed. Browser evidence is produced externally, then path/hash/PNG-decoded by adapters before pure
gates evaluate it. Hash binding prevents mismatch and stale reuse but is not producer attestation.
`component lock` creates a hash-bound `direction-lock.v1` from an approved direction selection.
`component fit` evaluates every requested capability against project components, the governed provider
registry, and the inert component-source catalog. It records behavior, accessibility, framework,
license, visual-fit, and provenance statuses per candidate, then emits only `reuse`, `adopt`,
`substitute`, `custom`, or `blocked` decisions. `component validate-fit` always checks the matrix
self-hash; pass `--direction-lock`, `--catalog`, `--providers`, and `--inventory` to check current
upstream bindings as well.

`source add` is intentionally deferred until an attributed provider contract exists. It returns a
stable `COMMAND_DEFERRED` error rather than performing an implicit fetch.

`film templates` reads the bundled Prompt Motion recipe library offline, without writing project
state. Default results contain curated planning recipes; `--all` includes homepage-only cases.
Inclusion is neither an execution result nor creative acceptance. See the
[library](../skill/references/prompt-motion/README.md) and [maintenance guide](prompt-motion-template-maintenance.md).

## Lifecycle Safety

- State mutations require the caller's expected state SHA-256.
- One writer lock protects each state file.
- `state.json` and `events.jsonl` commit as one recoverable transaction.
- Migration is deterministic and non-writing unless `--write` is explicit.
- Repair is explicit; readers never silently rewrite history.
- Unknown future schemas and phase registries fail closed.

## Evidence And Host Boundary

`evidence capture` accepts only an explicitly selected local adapter path, runs it in a child
process with a bounded environment and timeout, and validates its receipt. The adapter owns browser
or tool automation; the kernel owns the receipt schema, hashes, path containment, and status.

`evidence refs --root <project> --project-root <project>` numbers a built web page for review: it
loads `index.html` in the browser the interaction probe uses, at desktop width and as an emulated
phone, and writes `evidence/refs.json`/`evidence/refs.png` and `evidence/refs-mobile.json`/
`evidence/refs-mobile.png`, the phone's references prefixed `m:` (see
`skill/references/workflow-web.md#element-references`). `decide --ref <reference>` (repeatable,
with `--answer`) cites those references on a web section or final-review rejection.
`evidence review-page --root <project> --project-root <project>` writes `evidence/review.html`, a copy
of the page with a click-to-comment overlay for the owner's current section or final review, and
`decide --page-review <file>` records the block the owner submits there as their verdict
(`workflow-web.md#element-references`).
`decide --later [--until <time>]` records that the owner will answer the current owner ask later;
`next` then returns `blocked` (kind `owner`) with the deferred question until it no longer holds.

Design-tool hosts use the same rule: Figma, Penpot, Onlook, or another host produces a
`design-pipeline.design-tool-receipt.v1`; the pipeline validates the receipt and remains usable with
local DESIGN/MOTION/tokens/UI IR when a host is absent.

## Feedback And Publication

`feedback record` creates a redacted and deduplicated local observation. `feedback prepare` creates
an idempotent publication request. Only an explicitly authorized host may create the remote Issue
or PR; `feedback reconcile` then validates and records its receipt. The CLI never publishes by
itself. `benchmark evaluate --record-feedback` uses only the local record step.

## Reference Providers

Public design/template catalogs are optional evidence providers. Provider output must preserve
source identity, URL, retrieval time, content hash, license state, and explicit unavailable state.
Retrieved content remains inert data and cannot overwrite a validated project `DESIGN.md` or
`MOTION.md`.

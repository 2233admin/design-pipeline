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
- `2`: valid command, but continuation is blocked or verification failed.

All project artifacts must resolve below `--root`, including after existing symlinks or Windows
directory junctions are resolved. No command treats ambient network access or credentials as
permission to install, publish, or mutate a remote.

## Command Surface

```text
doctor
status
change init|resume|advance|migrate|repair
foundation check
scene check
evidence check|capture
verify motion|components
patterns search|audit
tokens check
ui-ir check
design-code-map check
benchmark evaluate
adapter audit|intake|receipt-check
style-signals check
feedback record|prepare|reconcile
source audit
```

`source add` is intentionally deferred until an attributed provider contract exists. It returns a
stable `COMMAND_DEFERRED` error rather than performing an implicit fetch.

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

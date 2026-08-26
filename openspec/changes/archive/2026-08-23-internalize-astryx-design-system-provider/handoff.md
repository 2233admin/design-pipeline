# Handoff

## Current State

- Change id: `internalize-astryx-design-system-provider`
- Workstream: implementation complete; ready for user acceptance testing
- Authoritative lifecycle: `state.json` and append-only `events.jsonl`
- Lifecycle state: `release-readiness`, status `complete`, revision 10, consistent event history
- Foundation authority: root `DESIGN.md` and `MOTION.md`
- QA evidence: recorded in `qa.md`; full repository and package QA passed

## Goal

Complete the provider-neutral catalog, explicit local Astryx acquisition, token projection, runtime
decision, public CLI, and fair benchmark v2 without making Astryx a dependency or design authority.

## Frozen Decisions

- Astryx is a built-in candidate profile, not a required provider or default adoption.
- Supplied snapshots support the full offline catalog workflow.
- Default Astryx acquisition requires the bundled read-only translator plus an existing contained
  local Astryx CLI path; custom acquisition requires a reviewed local adapter. Both require
  explicit contained output.
- The kernel does not install, fetch, import `.doc.mjs`, inject `AGENTS.md`, or populate the UI
  pattern catalog.
- Runtime mode is explicit: `reference`, `adopt`, `substitute`, or `custom`.
- Benchmark v2 applies identical fairness gates to every candidate and retains v1 compatibility.

## Next Actions

1. Run user acceptance tests against the bundled catalog and, when available, a contained local
   Astryx CLI.
2. Archive the OpenSpec change after acceptance; no remote publication was performed by this run.

## User Reference

See `../../../docs/astryx-design-system-provider.md` for supplied snapshot preparation, local adapter
expectations, command examples, decision modes, and security boundaries.

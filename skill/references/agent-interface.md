# Agent Interface v2

Every active change exposes `state.json`, `events.jsonl`, and `handoff.md`. Together they let a new
agent inspect, resume, verify, or archive a run without the conversation transcript.

## Authority And Schemas

- `state.json` is the current machine state and uses `design-pipeline.state.v2`.
- `events.jsonl` is append-only history; each line uses `design-pipeline.event.v2`.
- `handoff.md` is a readable projection and never overrides state/events.
- `references/pipeline-phases.json` is the versioned phase and transition registry.
- `references/pipeline-state.schema.json` and `pipeline-event.schema.json` are the public shapes.

The current writable registry is `design-pipeline.phases.v2`:

```text
repo-read -> brief -> directions -> design-spec -> motion-spec -> tasks
tasks -> implementation -> gate-review -> verification -> release-readiness -> archive
gate-review/verification -> implementation (repair loop)
```

## Required State Semantics

`state.json` records the registry version, change identity, status, phase, revision, last event
sequence, timestamp, blockers, next actions, foundation references, optional scene runtime,
evidence, migration metadata, and extensions. State changes increment `revision`; committed events
increment `lastEventSeq` and form a hash-linked chain.

Allowed v2 statuses are `initialized`, `planning`, `ready`, `implementing`, `verifying`, `complete`,
and `blocked`. A future schema or unknown registry is not guessed and must fail closed.

## Writer Protocol

Use the unified CLI rather than editing state/events independently:

```powershell
node skill/scripts/designer-pipeline.cjs status --root . --change-root <change> --json
node skill/scripts/designer-pipeline.cjs change advance --root . --change-root <change> `
  --expected-sha256 <current-state-sha256> --phase gate-review `
  --summary "Implementation complete" --timestamp <iso-date> --json
```

Every mutating command requires the expected SHA-256 of the current state. The writer lock prevents
concurrent mutation. State and event writes use a staged, crash-safe transaction with rollback;
callers may retry only after reading the current state again.

## Migration And Repair

Both historical `design-pipeline.state.v1`/`phase` and `design-pipeline-state.v1`/`stage` are
readable. Migration to v2 is deterministic, preserves unknown legacy fields in `extensions`, and
does not write without `--write` plus the expected source hash.

```powershell
node skill/scripts/designer-pipeline.cjs change migrate --root . --change-root <change> --json
node skill/scripts/designer-pipeline.cjs change migrate --root . --change-root <change> `
  --write --expected-sha256 <legacy-state-sha256> --json
node skill/scripts/designer-pipeline.cjs change repair --root . --change-root <change> `
  --legacy-events --expected-sha256 <v2-state-sha256> --timestamp <iso-date> --json
```

Readers never auto-repair. A missing/mismatched event chain, stale lock, or interrupted transaction
must produce explicit diagnostics and an explicit repair event with evidence.

## Handoff Projection

`handoff.md` records current state, goal, artifact links, decisions, capability fallbacks, evidence,
blockers, and next actions. Its phase, status, and next actions must agree with `state.json`; evidence
paths must exist.

## Resume Protocol

1. Run `status` and require a consistent v2 state/event pair.
2. Read the tail of `events.jsonl` and then `handoff.md`.
3. Read artifacts named by current phase and `nextActions`.
4. Revalidate referenced foundations/evidence before implementation or release.
5. Continue from the recorded phase; do not restart discovery unless evidence is stale or contradictory.

## Secret Boundary

State, events, handoff, and feedback never contain tokens, cookies, raw credentials, authenticated
headers, or proprietary payloads. Use repo-relative evidence references and the feedback recorder's
redaction path. Remote publication always requires separate explicit authority and a receipt.

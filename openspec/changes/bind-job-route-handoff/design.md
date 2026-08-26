# Design: bind job route handoff

## Context

Two identifiers already exist and must stay distinct:

| Identifier | Owner | Example |
| --- | --- | --- |
| Job id | `job-registry.json` / `route` | `website-clone` |
| Toolchain `primaryRouteId` | frontend-stack registry | `design-pipeline/website-cloning` |

`route` returns `next` plus `registrySha256`. That envelope is overwritten on stdout by
`design-pipeline.cli-result.v1`. Nothing persists a job plan, and toolchain/execution do not
read the job id. Admission on `primaryKnowledge` is informational.

BMAD Epic 4 story 4.1 (unique primary job) shipped. Stories 4.2 (owner/hash bind) and 4.3
(Skill → CLI handoff) are this change. Stories that need Figma receipts or a normalized Design
Artifact stay in Epic 2/3.

## Goals / Non-Goals

**Goals:**

- A ready route can be written as a hash-bound job plan.
- Toolchain and execution can consume that plan and must refuse drift.
- Catalog admission on the plan cannot be upgraded by being selected.
- Stage 0 documents one public entry: `route --write`.

**Non-Goals:**

- Spawning MengTo/Prism/DesignMD from the dispatcher.
- Replacing `primaryRouteId` with the job id.
- Requiring a job plan on every existing toolchain call (compatibility).
- Importing Figma/Penpot or synthesizing DESIGN.md from catalogs.

## Decisions

### D1 — Persist through `route --write`, no new verb

`route` stays a top-level command with no action. `--write --output <file>` writes
`design-pipeline.job-plan.v1`. A new `handoff` or `route plan` action would add another Stage 0
door, which is the failure mode the dispatcher was built to stop.

`needs-clarification` and `blocked` routes refuse `--write`.

### D2 — Job plan is a new artifact, not a mutation of the toolchain plan

The job plan records query, job id, registry hash, route hash, primary knowledge, secondaries,
admission, kernel, next, and `planSha256`. Toolchain plan gains optional `jobId` and
`jobPlanSha256`. Execution request gains optional `jobPlanSha256`.

When those optional fields are present, they are validated. When absent, current toolchain and
execution behavior is unchanged.

### D3 — Binding is verify-on-consume, not an orchestrator

This slice does not run `foundation check` or `toolchain resolve` for the agent. Stage 0 already
has those commands. The defect is that they can run against a different job than `route` selected.
The plan is the join key.

SKILL.md makes the plan mandatory for pipeline runs. The CLI keeps it optional so existing
callers and tests do not break.

### D4 — Admission is frozen on the plan

The plan copies `primaryKnowledge.admission` from the registry at classify time. Consumers MUST
NOT treat plan presence as executable ready. `inert` / `reference-only` / `review` stay those
statuses. A later registry edit that changes admission is a hash mismatch, not a silent upgrade.

### Data flow

```text
brief
  → route --query
      → job-route.v1 (classify)
      → --write job-plan.v1 { jobId, registrySha256, routeSha256, planSha256, next, admission }
  → toolchain resolve --artifact toolchain-request.json
      request may include jobPlanSha256
      plan records jobId + jobPlanSha256 when supplied
  → execution route
      request may include jobPlanSha256
      must match toolchain plan's jobPlanSha256 when either side has one
```

### Failure modes

| Input | Result |
| --- | --- |
| `--write` on `needs-clarification` | invalid, exit 1, no file |
| job plan schema/hash mismatch | toolchain/execution blocked or invalid |
| request.jobId ≠ plan.job | fail closed |
| request.jobPlanSha256 ≠ file hash | fail closed |
| toolchain has jobPlanSha256, execution omits it | fail closed |
| execution jobPlanSha256 ≠ toolchain jobPlanSha256 | fail closed |
| primary admission `inert`, agent treats as ready | spec forbids; SKILL instruction + plan field |

## Risks / Trade-offs

- [Optional CLI field ignored by agents] → SKILL.md Stage 0 and skill-cli-handoff tests require
  `--write` and a consumed plan, same as other front doors.
- [Two route ids confuse implementers] → docs name them; never alias job id to `primaryRouteId`.
- [Stale plan reused after registry edit] → `registrySha256` / `planSha256` mismatch blocks.

## Migration Plan

Additive schemas. No rollback beyond deleting unused job-plan files. Existing artifacts without
`jobPlanSha256` remain valid.

## Decisions (locked)

Review 2026-08-26:

- Slice is bind-only. Do not auto-run kernel or catalog `next` steps.
- Job plan is optional on the CLI, mandatory in SKILL.md Stage 0.
- Persist with `route --write --output`, not a new verb.

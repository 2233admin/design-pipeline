# Proposal: bind job route handoff

> Status: DRAFT — decisions locked 2026-08-26. No implementation until apply is requested.

## Why

`designer-pipeline route` already classifies one primary job. That result is advice.
Toolchain already binds `primaryRouteId` (a frontend-stack tool route such as
`design-pipeline/website-cloning`) and execution already binds `routeId` / slice owner to that
plan hash. The job id is a different identifier. Nothing ties them together, so an agent can
classify `website-clone` and then open every catalog or hand a mismatched toolchain plan downstream.

This is BMAD Epic 4 / FR-8 stories 4.2 and 4.3, on top of the shipped dispatcher (story 4.1).
Do it now because the extension point exists and is still unenforceable.

## What Changes

- Persist a ready `route` as `design-pipeline.job-plan.v1` via `--write --output`.
- Bind that plan into toolchain resolve and execution route through `jobPlanSha256` and `jobId`.
- Fail closed on hash, job, query, registry, or admission drift. Never upgrade `inert` /
  `reference-only` / `review` to executable `ready` because a plan exists.
- Point SKILL.md Stage 0 at: classify → write plan → consume plan. Catalog CLIs stay escape hatches.
- **Not breaking** for existing toolchain/execution callers that omit the job plan.

## Capabilities

### New Capabilities

- None. This extends the existing `design-pipeline` capability.

### Modified Capabilities

- `design-pipeline`: a ready job route SHALL become a hash-bound plan that toolchain and
  execution consume, or the handoff SHALL block.

## Non-Goals

- Epic 2 (Figma/Penpot import) and Epic 3 (normalization to Design Artifact).
- Auto-running MengTo / Prism / DesignMD / Astryx searches from the dispatcher.
- A new orchestrator that spawns the whole Stage 0 checklist.
- Merging catalogs, MCP, auto-install, or making DesignMD executable-ready.
- Replacing toolchain `primaryRouteId` with the job id. They are different identifiers.

## Impact

- `skill/scripts/job-route-core.cjs`, `cli-core.cjs`, `toolchain-core.cjs`, `execution-target-core.cjs`
- New job-plan schema; optional fields on toolchain request/plan and execution request
- SKILL.md Stage 0, public help, package-resources, tests
- No new runtime dependencies

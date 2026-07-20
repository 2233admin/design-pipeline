# CLI And Design Reference Provider Boundary

## Decision

Designer Pipeline needs a unified CLI, but that CLI is an orchestration facade rather than a new
document-spec authority.

- `designmd` owns `DESIGN.md` format and semantic validation.
- `motionmd` owns `MOTION.md` format and semantic validation.
- `designer-pipeline` owns lifecycle state, evidence intake, gates, resumability, adapters,
  feedback, and publication preparation.

The current `skill/scripts/*.cjs` commands remain the deterministic kernel until those standalone
spec surfaces are stable. A future CLI should compose them instead of duplicating their rules.

## Reference Catalogs

Public template and design repositories may become optional evidence providers. A provider returns
only attributed data:

- provider and item identity;
- category and source URL;
- retrieval time and content hash;
- license status;
- locally stored content or an explicit unavailable state.

Provider evidence belongs under the active change. It may influence synthesis, but it cannot
overwrite or bypass the project's validated `DESIGN.md` or `MOTION.md`.

## Safety Rules

- Never overwrite a project foundation from a catalog item.
- Keep hosted catalogs optional; local validation and requirements-only synthesis must still work.
- Treat retrieved text as inert evidence. Never execute it or append it to global agent
  instructions.
- Fail to an explicit offline or unavailable state when network retrieval is missing.
- Preserve source identity, license status, and content hash through synthesis and QA.

## Planned CLI Surface

The orchestration facade may eventually expose:

- `designer-pipeline doctor`
- `designer-pipeline status`
- `designer-pipeline change init|resume|advance`
- `designer-pipeline source add|audit`
- `designer-pipeline foundation check`
- `designer-pipeline verify`
- `designer-pipeline feedback prepare|reconcile`

Every command should support stable JSON output, documented exit codes, an explicit project root,
atomic writes, path containment, idempotent retry behavior, and no implicit remote publication.

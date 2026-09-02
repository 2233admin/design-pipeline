# Component Fit Governance

**Status:** Approved for implementation from the preserved worktree slice
**Scope:** `design-pipeline` CLI, component-fit contracts, Design Skill prototype gate
**Effective date:** 2026-09-02
**Decision record:** Existing component-first governance and the merged guided multi-surface pipeline remain authoritative; this spec closes the component-fit slice without changing unrelated routes.

## Context

Design agents and maintainers need a deterministic way to turn an approved visual direction into component decisions without silently selecting one global library. The 0.10.0 release contains the component-fit kernel, CLI wiring, Design Skill preview integration, documentation, and regression suite described here. Main contains the guided multi-surface pipeline that this slice extends.

The verified current kernel is `skill/scripts/component-fit-core.cjs`. It defines `direction-lock.v1`, `component-fit-matrix.v1`, six fit dimensions, five decision actions, provider/catalog/project hash bindings, and validation functions. The current CLI changes are in `skill/scripts/cli-core.cjs`; prototype preview enforcement is in `skill/scripts/design-skill-core.cjs`.

## Stakeholders

- **Design and implementation agents:** need per-capability decisions, rejection reasons, and explicit evidence gates.
- **Project maintainers:** need reproducible hashes and fail-closed validation before dependencies or source are adopted.
- **End users:** benefit indirectly from consistent behavior, accessibility, framework compatibility, and visual direction across the shipped interface.

## Current State

| Surface | Verified state | Remaining action |
|---|---|---|
| Component-fit kernel | `skill/scripts/component-fit-core.cjs` is shipped and emits/validates direction locks and fit matrices | Maintain contract coverage |
| Public CLI | `component lock`, `component fit`, and `component validate-fit` are wired in `skill/scripts/cli-core.cjs` | Keep commands and exit behavior covered |
| Design Skill prototype | `design.prototype` reads and validates a project-contained direction preview before producing isolated directions | Preserve fail-closed behavior |
| Documentation | README, `skill/SKILL.md`, and `skill/references/stages.md` describe the component-fit flow | Keep public contract synchronized |
| Regression tests | `tests/component-fit-matrix.test.cjs` is included and passes with the focused Design Skill tests | Keep as the contract suite and add no unrelated cases |

Focused verification on 2026-09-02: `node --test tests/component-fit-matrix.test.cjs tests/design-skill-layer.test.cjs` produced 15 passing tests, 0 failures, 0 skips.

## Proposed Change

The component-fit slice is delivered as one coherent contract:

1. Create a hash-bound direction lock from an approved selection receipt and direction preview artifact.
2. Evaluate every requested capability against every governed catalog/provider/project candidate.
3. Record the six dimensions `behavior`, `accessibility`, `framework`, `license`, `visualFit`, and `provenance` for every candidate.
4. Emit exactly one decision per capability using `reuse`, `adopt`, `substitute`, `custom`, or `blocked`.
5. Keep reference-only sources available as evidence but prevent them from becoming direct dependencies.
6. Reject stale, malformed, contradictory, or out-of-scope inputs before writing a successful artifact.
7. Require a verified, applicable direction preview before `design.prototype` can produce isolated prototype directions.

## Contract

### Direction lock

`createDirectionLock(input)` MUST accept:

```json
{
  "directionId": "string",
  "selectionReceiptHash": "64 lowercase hex characters",
  "previewArtifactSha256": "64 lowercase hex characters",
  "constraints": "object",
  "foundationId": "string, optional",
  "preferredSources": ["string, optional"],
  "rejectedSources": ["string, optional"],
  "visualKeywords": ["string, optional"],
  "visualFit": {"source-id": "pass | review | fail, or object"}
}
```

It MUST emit `design-pipeline.direction-lock.v1` with `status: locked` and a deterministic `directionLockHash`. `validateDirectionLock` MUST reject stale hashes, missing identity, invalid hashes, and malformed constraints.

### Fit matrix

`buildComponentFitMatrix(input)` MUST require:

```json
{
  "framework": "string",
  "platform": "string, optional",
  "capabilities": ["unique non-empty strings"],
  "directionLock": "validated direction-lock.v1",
  "catalog": "normalized component catalog",
  "providers": "governed provider registry, optional",
  "project": "project component inventory, optional"
}
```

Each emitted row MUST cover one capability and contain more than one candidate whenever the source set provides more than one candidate. Each candidate MUST include a role, status, and all six dimension statuses. Each row and the top-level `decisions` array MUST agree exactly.

A matrix MUST include hash bindings for the direction lock, catalog, provider registry when supplied, and project inventory when supplied. `validateComponentFitMatrix` MUST recompute the matrix hash and reject drift in any supplied binding.

### Decisions and foundation coherence

- `reuse`, `adopt`, and `substitute` MUST reference an existing candidate in the same row.
- `custom` and `blocked` MUST have `candidate: null`.
- A `reference-only` candidate MUST NOT be emitted as a direct `adopt` decision.
- More than one ready foundation candidate spanning the requested capabilities MUST block until a single foundation is explicitly locked.
- A review status in any hard dimension MUST prevent an `adopt` decision unless the existing contract explicitly permits another action.

### CLI

The public CLI MUST expose:

```text
component lock --artifact <request> [--write --output <path>] --json
component fit --artifact <request> [--catalog <path>] [--providers <path>] [--inventory <path>] [--write --output <path>] --json
component validate-fit --artifact <matrix> [--direction-lock <path>] [--catalog <path>] [--providers <path>] [--inventory <path>] --json
```

Successful validation MUST return exit code `0` and status `valid`. Malformed or stale artifacts MUST fail closed with a non-zero exit code and no false success envelope.

### Design Skill preview gate

`design.prototype` MUST resolve `changeRoot` inside the project root, validate `direction-preview.json` or the requested artifact through the existing direction-preview checker, and bind the emitted prototype set to the preview artifact SHA-256. Missing, malformed, waived, or inapplicable previews MUST return `blocked`; they MUST NOT return an empty `awaiting-selection` set. Prototype execution MUST NOT grant `target-write`.

## Acceptance Criteria

1. `component lock` emits a deterministic, hash-valid `design-pipeline.direction-lock.v1` from valid input.
2. `component fit` evaluates every requested capability against the governed catalog and optional provider/project candidates, preserving all six dimension statuses and rejection reasons.
3. `component validate-fit` rejects matrix hash drift and every supplied direction-lock, catalog, provider, or project binding drift.
4. Reference-only, unverified, inaccessible, incompatible, unlicensed, or visually unapproved candidates cannot become direct adoption decisions.
5. Split ready foundation candidates block rather than silently choosing a global library.
6. All three public component commands are available through the existing JSON CLI envelope with deterministic exit codes.
7. `design.prototype` blocks before preview evidence exists, rejects path escape, and binds successful prototype output to the verified preview artifact.
8. Documentation and package/test-manifest entries describe and include the same public contract.
9. The focused component-fit and Design Skill suites pass with zero failures, skips, or todos.
10. The repository test manifest passes without changing unrelated behavior.

## Testing Plan

| Layer | Coverage | Count |
|---|---|---:|
| Unit | Direction lock hashing, matrix shape, dimensions, decision invariants, foundation coherence, binding drift | 8 existing tests |
| Integration | Public CLI lock → fit → validate-fit with catalog, providers, and project inventory | 1 existing test |
| Integration | Design Skill prototype preview success, missing preview, waiver, selection hash binding | 7 existing tests |
| Regression | Full repository `node --test tests/*.test.cjs` and manifest coverage | 1 full run |

## Rollback Plan

Revert the component-fit commit and its merge commit. The merged guided multi-surface pipeline remains usable without the component-fit extension, but component-fit-aware adaptation must remain unavailable until the slice is restored. Do not delete or reset unrelated dirty worktree changes.

## Files Reference

| File | Required role |
|---|---|
| `skill/scripts/component-fit-core.cjs` | Direction-lock and matrix kernel |
| `skill/scripts/cli-core.cjs` | Public component command routing and JSON envelopes |
| `skill/scripts/design-skill-core.cjs` | Preview-bound prototype gate |
| `skill/references/component-providers.json` | Governed provider input |
| `skill/references/component-source-catalog.json` | Governed catalog input |
| `skill/references/package-resources.json` | Package resource registry |
| `skill/references/stages.md` | Stage and adoption rules |
| `skill/SKILL.md` | Agent-facing command contract |
| `README.md` | User-facing CLI documentation |
| `tests/component-fit-matrix.test.cjs` | Component-fit contract suite |
| `tests/design-skill-layer.test.cjs` | Preview/prototype regression suite |
| `scripts/test-manifest.json` | Repository test inclusion |

## Out of Scope

- New component libraries, package installation, or remote fetching.
- Screenshot OCR, visual embedding, URL crawling, or browser execution.
- Replacing the existing component capability, route, or design-system kernels.
- Changes to the already merged guided intake, region-template, selection-receipt, or adaptation-plan contracts except where they consume the component-fit kernel.
- Automatic task creation, production target writes, or silent direction selection.

## Assumptions Used For Autonomous Execution

- The primary users are internal design and implementation agents plus maintainers; no public API consumer depends on the new CLI yet.
- The release branch is the source of truth for the component-fit slice; unrelated dirty changes remain outside scope.
- The existing direction-preview and component-first contracts are the governing upstream inputs.

# Design: Evidence-Driven Design Compiler and Verification Runtime

## Decision

Add a thin control layer above the existing pipeline state and gate modules. The controller compiles a
normalized manifest into a deterministic phase DAG, validates phase prerequisites, records artifact
lineage, and routes failures to the phase that owns the repair. It does not become a second renderer,
receipt system, or browser runner.

The existing `state.json` and `events.jsonl` remain the durable execution ledger. The controller stores
its additional state in `state.extensions.control` so the current v2 state schema and migration path
remain compatible. The control projection has two independent values:

- `phaseStatus`: `not_started | running | ready | blocked | synthesis_required | inconclusive | stale`
- `outcome`: `complete | blocked | fidelity_limited | null`

The existing top-level v2 status continues to serve compatibility callers. New commands use the
control projection and never infer a successful outcome from a phase that is merely present.

## Components

### `plan-core.cjs`

Compiles a manifest into `design-pipeline.design-plan.v1`:

```json
{
  "schema": "design-pipeline.design-plan.v1",
  "schema_version": 1,
  "plan_id": "...",
  "input_hash": "sha256:...",
  "mode": "greenfield | rebuild | clone",
  "fidelity": "exact | adaptive",
  "phases": [
    {
      "id": "structure",
      "depends_on": [],
      "inputs": ["manifest.json"],
      "outputs": ["structure/screen-inventory.json", "structure/state-matrix.json"],
      "gates": ["structure", "state-coverage"]
    }
  ]
}
```

Compilation sorts object keys, preserves declared list order only where order is semantic, and hashes
canonical JSON. A plan with missing target platform, primary task, or target screen is invalid and
cannot be run. Missing brand preference is recorded as an assumption.

The first registry contains the stable control phases:

`intent`, `structure`, `evidence`, `direction-synthesis`, `direction-lock`, `foundations`,
`component-routing`, `anchor-screen`, `critical-flows`, `interaction-states`, `implementation`,
`runtime-verification`, `package`.

The phase registry is declarative. It records dependencies, required outputs, gate names, and
invalidation scope; it does not embed tool-specific execution code.

### `artifact-core.cjs`

Defines `design-pipeline.artifact.v1` metadata:

```json
{
  "schema": "design-pipeline.artifact.v1",
  "schema_version": 1,
  "path": "structure/state-matrix.json",
  "producer": "structure",
  "input_hashes": {"manifest.json": "sha256:..."},
  "artifact_hash": "sha256:...",
  "dependencies": [],
  "created_at": "2026-09-01T00:00:00.000Z",
  "status": "ready"
}
```

Artifact paths and metadata stay under the declared change root. Hash drift produces `stale`; a
missing required artifact is `blocked`; an undecidable validator result is `inconclusive`.

### `invalidation-core.cjs`

Builds the reverse dependency closure from the plan. A changed artifact invalidates only its declared
dependents. The default routing is:

- token/foundation change → anchor screen and downstream implementation/verification;
- component API change → anchor screen and all downstream phases;
- structure/IA change → component routing, anchor screen, flows, states, implementation, verification;
- newly added reference evidence → no invalidation until direction synthesis changes;
- direction lock change → foundations and all downstream phases.

Invalidation is deterministic and idempotent. It never deletes evidence or receipts; it marks affected
artifacts `stale` and records the cause.

### `gate-core.cjs`

Provides controller-level preflight and state coverage validation. Existing specialized gates remain
the owners of palette, motion, component conformance, visual acceptance, and receipt validity.

The interaction-state contract requires every core interaction entry to declare `default` and every
applicable non-default state from this set:

`loading`, `empty`, `partial`, `error`, `offline`, `permission-denied`, `disabled`, `overflow`,
`long-content`, `responsive-collapse`, `focus`, `pressed`, and `reduced-motion`.

Applicability is explicit per entry. A state is never silently skipped; an inapplicable state requires
an explicit reason. At minimum, every core interaction must cover one input path and both mobile and
desktop viewports, while keyboard/focus and reduced-motion coverage are mandatory for interactive
controls. A matrix with only the static default state is `blocked`.

### Runtime and CLI integration

`cli-core.cjs` adds command routes while retaining the existing JSON envelope:

```text
designer-pipeline plan --manifest <file> --output <file>
designer-pipeline run --plan <file> --to <phase>
designer-pipeline resume --change-root <dir>
designer-pipeline verify --gate <gate> --artifact <file>
designer-pipeline status --change-root <dir>
designer-pipeline explain-block --change-root <dir>
designer-pipeline package --change-root <dir> --output <file>
```

`run` only advances phases whose dependencies and gates are ready. It does not fabricate missing
artifacts or invoke an unavailable external tool. `verify` returns `0` for passed, `2` for blocked,
`3` for measured fidelity mismatch, and `1` for invalid input, matching the existing contract.
`package` emits a manifest of included artifacts and their hashes; it refuses stale, blocked, or
inconclusive required artifacts.

## Failure and Recovery

- Missing mandatory intent/structure inputs: `blocked`, with a machine-readable reason and unlock
  action.
- Evidence exists but no direction decision is bound: `synthesis_required`.
- Validator cannot determine pass/fail: `inconclusive`, never `ready`.
- Upstream hash changed: downstream artifacts become `stale`; rerun starts at the earliest stale phase.
- Catalog unavailable: `catalog_unavailable`, distinct from `no_match`, and blocks component routing.
- A failed phase does not regenerate unrelated phases. `explain-block` reports the owning phase,
  reason code, evidence paths, and the next permitted action.

## Touched Assets

| asset_id | relation | scope | risk | verify | rollback |
|---|---|---|---|---|---|
| `skill/scripts/cli-core.cjs` | Registers new control commands | CLI dispatch and envelopes | Existing command routing regression | CLI routing tests and `scripts/qa.cjs` | Revert command entries |
| `skill/scripts/pipeline-state-core.cjs` | Persists control projection in extensions | Existing state ledger | Migration or CAS regression | Pipeline state tests | Ignore/remove control extension; retain v2 state |
| `skill/references/pipeline-phases.json` | Declares control DAG | Phase transition and invalidation policy | Invalid plan progression | Registry and plan tests | Restore previous registry |
| `skill/scripts/check-component-states.cjs` and `motion-evidence-core.cjs` | Enforces interaction coverage | Existing state validation | Existing matrices rejected unexpectedly | Compatibility fixtures plus new negative cases | Retain v1 matrix mode behind explicit schema compatibility |

## Alternatives Considered

### Rewrite the current pipeline

Rejected because it would duplicate or invalidate existing receipt and gate contracts.

### Implement only a larger component-state list

Rejected because it would improve one validator while leaving plan compilation, lifecycle state, and
freshness propagation ungoverned.

### Store a second authoritative controller state file

Rejected because it would create two competing sources of truth. The existing extension boundary is
sufficient for this incremental control layer.

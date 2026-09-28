## ADDED Requirements

### Requirement: Animation jobs use an authored-time, renderer-neutral MotionGraph

The pipeline SHALL represent reusable animation behavior as a project-owned `design-pipeline.animation-job.v1` contract containing a `design-pipeline.motion-graph.v1`, explicit mechanism/skin separation, deterministic seed/input/viewport/DPR/reduced-motion fields, and bounded declarative tracks/responses. Authored time SHALL be the state authority; wall-clock time, unseeded randomness, network state, and uncontrolled render loops SHALL not determine a sampled state.
The graph SHALL accept only an explicit supported easing set; unknown easing names SHALL fail closed rather than silently degrading to linear.

#### Scenario: A valid job is sampled and replayed

- **WHEN** the same Animation Job is sampled with the same authored time and deterministic inputs
- **THEN** it SHALL return the same graph state
- **AND** the graph SHALL remain renderer-neutral and preserve its mechanism/skin boundary

#### Scenario: Job lifecycle operations are reusable

- **WHEN** a job is initialized, sought, settled, reset, and disposed
- **THEN** `seek` SHALL update/render the authored sample, `settle` SHALL reach the graph duration, `reset` SHALL return to authored time zero, and `dispose` SHALL be idempotent
- **AND** calling an operation after disposal SHALL fail closed

#### Scenario: Reduced motion resolves authored resting state

- **WHEN** deterministic reduced motion is enabled
- **THEN** sampling SHALL resolve to the graph's authored resting/discrete endpoint rather than running an uncontrolled loop
- **AND** the reported authored time SHALL remain the requested time (including zero after reset), while the rendered state MAY use the terminal resting endpoint

### Requirement: Renderer lifecycle adapters own resources and cleanup

The pipeline SHALL validate a `design-pipeline.animation-lifecycle-adapter.v1` contract for DOM, SVG, Canvas2D, WebGL, and 3D-capable renderer kinds. The contract SHALL name `init`, `resize`, `update`, `render`, and `dispose` operations, resource ownership, containment, and observable cleanup checks.

#### Scenario: Lifecycle contract is incomplete

- **WHEN** an adapter omits an operation, resource owner, containment boundary, or observable cleanup check
- **THEN** validation SHALL fail closed

#### Scenario: 3D capability is declared without a renderer dependency

- **WHEN** a job selects the 3D-capable renderer kind
- **THEN** the project SHALL validate the same lifecycle contract
- **AND** this change SHALL not install or claim to implement a 3D renderer

### Requirement: Performance budgets fail closed

Every Animation Job SHALL declare one structured budget shape containing object.max, particle.max, texture.maxCount/maxBytes, and frame.maxMs, maxLongFrames, maxInputLatencyMs, and maxCpuMs. Applicable frame budgets SHALL require finite, non-negative values for these limits and finite targetFps >= 1. Applicable limits and observations SHALL be finite and non-negative; observed object/particle/texture/frame values SHALL not exceed their corresponding max/maxCount/maxBytes/maxMs, maxInputLatencyMs, or maxCpuMs limits. Unknown flat or parallel budget keys SHALL fail closed.

#### Scenario: Observed performance exceeds a limit

- **WHEN** an observed budget value exceeds its declared limit
- **THEN** validation SHALL fail rather than reporting ready

#### Scenario: Required frame budget field is missing

- **WHEN** an applicable frame budget omits maxMs, maxLongFrames, maxInputLatencyMs, or maxCpuMs, or declares targetFps below 1
- **THEN** validation SHALL fail closed rather than inventing a default

### Requirement: Existing motion evidence can bind animation contracts

The existing `design-pipeline.motion-verification.v1` receipt MAY include validated Animation Job, MotionGraph, deterministic input, lifecycle adapter, performance budget, and monotonic authored sample bindings. Existing receipt statuses and gate authorities SHALL remain authoritative.

#### Scenario: Evidence binding is inconsistent

- **WHEN** evidence binds a job and graph with different identities, a sample outside graph duration, or non-monotonic authored sample times
- **THEN** motion evidence validation SHALL fail closed

## ADDED Requirements

### Requirement: Scene renderer factories compose the existing lifecycle contract

The project SHALL provide a dependency-free implementation factory for `webgl` and `3d` scene renderer kinds. The factory SHALL compose `createLifecycleAdapter` and SHALL expose the established `design-pipeline.animation-lifecycle-adapter.v1` contract without defining a parallel lifecycle schema or validator.

#### Scenario: A scene job uses a WebGL or 3D factory

- **WHEN** an Animation Job is created with renderer kind `webgl` or `3d` and the factory's contract
- **THEN** the job SHALL initialize and route authored-time seek, settle, and reset frames through update and render
- **AND** the factory SHALL not require a DOM or runtime renderer dependency

### Requirement: Scene state and resources are explicit and contained

The factory SHALL require a camera, positive viewport, positive DPR, root containment id, and explicit arrays for buffers, textures, programs, framebuffers, render loops, observers, and listeners. Resize SHALL use the authored viewport/DPR and an injectable minimal GL-like context when supplied.

#### Scenario: Scene lifecycle is resized deterministically

- **WHEN** resize receives a valid viewport and DPR
- **THEN** the scene contract SHALL reflect those values
- **AND** an injected context viewport operation MAY receive the DPR-scaled dimensions

### Requirement: Existing budgets and cleanup fail closed

The factory SHALL validate the existing structured performance budgets and reject over-budget object, particle, or texture resources and frame metrics. Dispose SHALL release every registered resource at most once and SHALL expose `cleanupStatus()` compatible with `probeLifecycle`.

#### Scenario: Resource cleanup fails

- **WHEN** a registered resource refuses or throws during disposal
- **THEN** cleanup status SHALL be blocked and SHALL report that resource as unreleased
- **AND** repeated dispose SHALL not retry or report a ready state

#### Scenario: Context loss or fallback is declared

- **WHEN** the injected context reports loss or the factory receives a fallback/blocked status
- **THEN** lifecycle status SHALL be blocked
- **AND** the adapter SHALL never claim readiness or silently substitute another renderer

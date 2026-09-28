## ADDED Requirements

### Requirement: Complete Stage 0 toolchain binding
Public toolchain resolve and probe requests MUST include jobId, jobPlanSha256, jobPlanPath, and deliverableForm. The CLI MUST read the referenced plan inside the declared root. The resolver MUST validate plan contents, the actual canonical plan hash, and job identity before producing a ready plan or probing tools.

#### Scenario: Missing or partial binding
- **WHEN** a toolchain request omits any required binding field
- **THEN** resolution MUST fail with a missing Stage 0 binding error and MUST NOT report ready

#### Scenario: Missing file or stale identity
- **WHEN** the plan file cannot be read, its content/hash is invalid, or jobId/hash differs from the request
- **THEN** resolve and probe MUST reject the request before capability execution

#### Scenario: Valid binding retains lineage
- **WHEN** a valid plan and matching request are resolved
- **THEN** the toolchain plan MUST retain that jobId, jobPlanSha256, and deliverableForm, without substituting jobId for primaryRouteId
- **AND** execution MUST continue using the same jobPlanSha256

### Requirement: Query-bound deliverable form
Route results and job plans MUST contain a deterministic deliverableForm from product-launch-video, motion-graphics-video, scrollytelling-page, interactive-page, or ui-motion. Job plans MUST preserve the original query and include query/form in their canonical hash. The toolchain request form and independently classified brief MUST match the plan form.

#### Scenario: Video rewritten as a page
- **GIVEN** a controller-generated product-launch-video plan
- **WHEN** an English or Chinese toolchain brief requests a scrollytelling or interactive page
- **THEN** resolution MUST fail with a deliverable-form conflict and MUST NOT report ready

#### Scenario: Query or form tampering
- **WHEN** a job plan query or form changes without updating its hash
- **THEN** plan validation MUST reject hash drift
- **AND** a rehashed plan whose query and form disagree MUST also be rejected

### Requirement: Generic product-promotion routing
English and Chinese HTML product launch/showcase video requests MUST select the existing motion-graphics job and include the HyperFrames frontend route using its existing product-launch-video contract. Routing MUST NOT depend on a project name.

#### Scenario: Product promotion in either language
- **WHEN** an English or Chinese HTML product-promotion video brief is routed
- **THEN** Stage 0 MUST select motion-graphics and frontend tool routes MUST include heygen-com/hyperframes

#### Scenario: Ordinary hover animation
- **WHEN** a dashboard requests a subtle hover animation without a video deliverable
- **THEN** it MUST remain on ordinary UI motion and MUST NOT activate HyperFrames

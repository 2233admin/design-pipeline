## ADDED Requirements

### Requirement: Graphics tasks require an explicit graphics selection

The existing toolchain resolver SHALL NOT report ready for a job whose primary knowledge is graphics-runtime when neither graphics nor existing.graphics selects a graphics family or adapter. It SHALL report the missing selection as an actionable blocker without guessing a library. Ordinary frontend jobs SHALL preserve their optional graphics behavior.

#### Scenario: Graphics task omits its runtime

- GIVEN a valid bound graphics-runtime job plan and otherwise valid toolchain request without graphics or existing.graphics
- WHEN the existing resolver or probe resolves the request
- THEN the plan remains blocked and requests an explicit graphics family or adapter
- AND it does not claim runtime or visual readiness

### Requirement: Toolchain requests have an executable job-plan handoff

The existing toolchain CLI SHALL prepare the existing toolchain-request.v1 from a contained validated persisted job plan and explicit frontend/graphics choices. It SHALL preserve the plan query and Stage 0 bindings, reject conflicts and missing framework, and use the existing request validators. Preparing a request SHALL NOT install, invoke, verify, or approve a runtime.

#### Scenario: Prepare and resolve a bound graphics request

- GIVEN a real persisted job plan and explicit compatible framework and graphics choices
- WHEN the request handoff is prepared and resolved through the existing CLI
- THEN the request contains the original job id, plan hash, contained plan path and deliverable form
- AND the original resolver supplies the selected runtime guide and lifecycle
- AND plan drift, binding conflict or output path escape prevents preparation

### Requirement: Three.js has a project-owned executable lifecycle

The existing threejs and threejs-fixed-camera adapters SHALL define probe, plan, invoke and verify using the existing toolchain contract. The probe SHALL inspect only the target project's explicit Three.js package installation, exact version declaration and nonempty dev script. It SHALL NOT install dependencies, fall back to global modules or claim shader/visual verification from package import.

#### Scenario: Target project with a pinned Three.js runtime

- GIVEN an exact declared Three.js version matching target node_modules and a project-owned scripts.dev
- WHEN the existing toolchain resolver and probe are called
- THEN the plan supplies the graphics guide and npm run dev invocation
- AND the probe reports the actual installed package version
- AND the plan lists scene, screenshot and performance evidence for the existing toolchain receipt
- AND an availability probe does not create a verification receipt or validate visual quality

#### Scenario: Missing or unpinned target runtime

- GIVEN the target lacks Three.js, uses a version range or mismatched version, or lacks scripts.dev
- WHEN the existing toolchain probe is called
- THEN it remains blocked with the concrete cause
- AND it does not install, start a service or create a complete verification receipt

## ADDED Requirements

### Requirement: Workflow next preserves actionable check context

Project-root next SHALL return recovery context for its existing pending verification gate, identifying missing, unbound or changed files when evaluating a recorded pass with checked-file bindings and retaining available prior verifier findings, fixes and recovery instructions. Diagnostics SHALL NOT change pass criteria, grant acceptance or write state. Older gate records without diagnostics SHALL remain readable and resume through the existing action.

#### Scenario: A failed check is resumed in another command

- **WHEN** a public verifier records a failed check and next is called again
- **THEN** next SHALL retain that gate's actionable findings and fixes with its existing check command

#### Scenario: Checked bytes change

- **WHEN** a current pending gate's checked input changes after a pass
- **THEN** next SHALL name the changed input and require a fresh check without writing state

#### Scenario: A pass measured another input

- **WHEN** an existing pass lacks a required input binding
- **THEN** next SHALL identify that input and explain how to verify it rather than treating the old pass as current

#### Scenario: Required files are missing or unavailable

- **WHEN** a recorded pass with checked-file bindings references required inputs that cannot be read inside the project
- **THEN** next SHALL name the affected path and recovery action without advancing or exposing external file contents

### Requirement: Workflow review points to checked output files

Shared project-root review SHALL show the actual contained checked web page or film/edit video rather than generic placeholders. Supplemental evidence SHALL be listed only when it exists inside the project, and its existence SHALL NOT establish freshness, conformance or owner Visual Acceptance. Review decisions SHALL keep their existing snapshot bindings.

#### Scenario: Web draft awaits its owner

- **WHEN** the current web draft passes its check and awaits review
- **THEN** next SHALL show its actual checked page and request inspection of the affected interactions

#### Scenario: Multiple film renders exist

- **WHEN** a checked film draft awaits review with multiple render files present
- **THEN** next SHALL show the render bound to that current check

#### Scenario: Supplemental evidence is missing or escaping

- **WHEN** an optional review evidence file is missing or resolves outside the project
- **THEN** it SHALL NOT be listed as an available review file

### Requirement: Engineering guidance uses runnable vertical verification

Packaged QA guidance SHALL teach one observable behavior per implementation step, public-interface regression checks with independent expectations, observed failure before a fix, focused reruns and root-cause diagnosis before repeated retries. Existing user authorization and established project interfaces SHALL be reused; deterministic tests SHALL NOT substitute for visual acceptance.

#### Scenario: Agent changes a runtime behavior

- **WHEN** an agent fixes or extends a deterministic tool behavior
- **THEN** it SHALL exercise the relevant established public interface and complete one observed failing-check-to-fix cycle before adding another behavior

#### Scenario: A check repeats without progress

- **WHEN** the same command completes but the workflow remains blocked
- **THEN** the agent SHALL inspect returned recovery context and test a concrete cause before retrying unchanged inputs

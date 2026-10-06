# Spec Delta

## ADDED Requirements

### Requirement: Locally distributed video inspection candidates
Video sampling SHALL retain candidate context from locally prominent pixel changes across the requested interval, within the existing frame budget. Candidate times SHALL remain inspection hints, not confirmed shots. Omitted context SHALL be reported rather than silently treated as observed.

#### Scenario: Fast opening masks a later transition
- **WHEN** an opening has sustained large pixel changes and a later interval has a locally prominent transition
- **THEN** the later transition SHALL remain eligible for contextual sampling despite the global opening baseline.

#### Scenario: Frame budget cannot retain context
- **WHEN** candidate context exceeds the requested frame budget
- **THEN** sampling SHALL retain provenance and report omissions; it SHALL NOT assert complete production readiness.

### Requirement: Confirmed video production inventory
Production readiness for a video reference SHALL require confirmed shots covering the analyzed interval and an explicit inventory of applicable target properties. Every declared property SHALL have observed, local frame evidence. Historical reports SHALL remain readable, but coarse window observations alone SHALL NOT satisfy current production readiness.

#### Scenario: One observation hides another object
- **WHEN** a shot declares text geometry and camera motion but only text geometry is observed
- **THEN** production readiness SHALL remain pending and identify the missing camera property.

#### Scenario: A static graphic has no material animation
- **WHEN** a shot declares only the visible geometry properties of a static graphic and those properties have local evidence
- **THEN** the checker SHALL NOT invent a requirement for material, lighting or motion observations.

#### Scenario: Historical report starts new production
- **WHEN** a valid historical video report has no confirmed shot inventory
- **THEN** inspection SHALL remain available and production callers SHALL request decomposition instead of proceeding.

### Requirement: Evidence bound video visual tasks
Visual tasks referencing a video analysis SHALL bind a confirmed shot and observation IDs in the existing design plan. Dispatch and completion SHALL verify matching target, atomic property, time range and frame evidence. Declared guides, source report, source media and selected frames SHALL participate in existing input hashes and downstream invalidation.

#### Scenario: A task binds the wrong observation
- **WHEN** a task's observation belongs to another target, property or shot
- **THEN** dispatch and completion SHALL block with a concrete binding error.

#### Scenario: Method or source evidence changes
- **WHEN** a bound guide, source report or frame changes after technical completion
- **THEN** the existing receipt chain SHALL invalidate that completion and affected downstream work.

#### Scenario: A rebuilt asset is still unavailable
- **WHEN** a task declares an absent asset input or an unfinished dependency output
- **THEN** existing input checks SHALL block dispatch; a placeholder SHALL NOT count as the final asset.

#### Scenario: Structurally complete production evidence
- **WHEN** all required properties and task bindings pass their structural checks
- **THEN** the result SHALL keep semantic and visual acceptance unassessed until human review.

### Requirement: Usable preserved method entries
Declared bundled method paths and required packaging resources SHALL resolve to the current preserved source topology. License copies SHALL retain the same pinned bytes; repairing paths SHALL NOT alter upstream implementations or weaken provenance checks.

#### Scenario: Preserved upstream engine directory changes
- **WHEN** a preserved method is present under its current engine directory but an existing package requirement or method link names an obsolete directory
- **THEN** the existing requirement and link SHALL be updated to the preserved file while its source hash remains verified.

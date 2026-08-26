## ADDED Requirements

### Requirement: Layered adaptation preserves frozen methodology and explicit authority

The pipeline SHALL keep the Methodology Kernel frozen during layered adaptation. The Kernel SHALL
remain the authority for durable method, quality gates, and safety boundaries. Task Session Policy
SHALL be ephemeral. Project Adaptation Skill and User Collaboration Skill SHALL be external,
versioned, inspectable artifacts. Effective compatible guidance SHALL resolve in the order current
task > project > user > defaults, with mutually exclusive values keyed by collaboration dimension
rather than caller-defined rule id. Project constraints and quality gates SHALL NOT be weakened,
suppressed, or bypassed by any adaptation layer.

#### Scenario: Conflicting scoped guidance is resolved

- **WHEN** a current task, project skill, user skill, and defaults offer conflicting compatible
  workflow choices
- **THEN** the resolver SHALL select the current-task value before project, user, and defaults
- **AND** it SHALL preserve every applicable project constraint and Kernel quality gate
- **AND** it SHALL record dropped invalid or unsafe guidance in an inspectable receipt.

#### Scenario: Task guidance expires

- **WHEN** a task ends
- **THEN** its Task Session Policy SHALL cease to be effective
- **AND** it SHALL NOT become durable evidence or external-skill guidance without a separately
  evaluated candidate lifecycle.

### Requirement: Adaptation candidates are bounded, independently evaluated, and strictly promoted

Experience-derived adaptation SHALL create only bounded `add`, `replace`, or `delete` candidates
against an exact external-skill path, version, and incumbent content hash. Candidate guidance SHALL
select from a finite contract of collaboration dimensions and SHALL NOT contain free-form behavioral
instructions. The pipeline SHALL evaluate every candidate independently
on a held-out set and replay set against the incumbent using a pinned common manifest. It SHALL
promote only if all required gates pass, evidence is complete, and the predeclared primary metric is
strictly improved in its declared direction against the incumbent in every required comparison. The pipeline SHALL reject, revert,
expire, or forget candidates that do not qualify.

#### Scenario: A candidate ties or lacks evidence

- **WHEN** either held-out or replay evaluation ties the incumbent, has partial/unknown evidence,
  fails a required gate, or shows a required regression
- **THEN** the candidate SHALL NOT promote
- **AND** the incumbent SHALL remain effective
- **AND** the receipt SHALL state the disposition and preserve a rollback/rejection audit record.

#### Scenario: A candidate strictly improves independently

- **WHEN** a bounded candidate passes every required gate and shows strict primary-metric
  improvement over the incumbent on both independently evaluated held-out and replay sets
- **THEN** the pipeline MAY create a new immutable external-skill version linked to the evidence
  receipt
- **AND** the prior version SHALL remain available for rollback
- **AND** an interrupted promotion or rollback SHALL deterministically recover from its durable
  prepare record without exposing mixed ledger and skill state
- **AND** a live process owner SHALL exclude competing recovery or mutation, while a dead owner's
  journal SHALL be safely recoverable.

### Requirement: Adaptation is transparent, user-controlled, and non-RL

The pipeline SHALL default to shadow learning: candidates may be recorded and evaluated but SHALL
NOT change live task behavior. Users SHALL be able to inspect candidate diffs, scope, evidence,
decision, and rollback target; reject candidates; and request scoped forgetting. The pipeline SHALL
NOT use reinforcement learning, model-weight training, hidden profiles, inferred personal traits, or
silent adaptation.

#### Scenario: A candidate is proposed under default settings

- **WHEN** task experience yields an adaptation candidate and the user has not explicitly enabled a
  reviewed version
- **THEN** the candidate SHALL remain shadow-only
- **AND** the current task's effective policy SHALL remain unchanged
- **AND** the user SHALL be able to review or reject it before any promotion or use.

#### Scenario: A user requests forgetting

- **WHEN** a user requests forgetting for a declared project or user scope
- **THEN** the pipeline SHALL remove the candidate or version from usable guidance, revoke its live
  selection, and retain only the minimum non-sensitive tombstone required for audit and prevention
  of accidental reinstatement
- **AND** if successor snapshots still contain that guidance, it SHALL require their safe rollback
  before scrubbing every rolled-back dependent snapshot
- **AND** it SHALL NOT alter the Methodology Kernel, project constraints, or shipped artifacts.

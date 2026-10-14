## ADDED Requirements

### Requirement: Checkpoints declare their delegation

The workflow state SHALL record, for every checkpoint of the deliverable and tier, whether the owner or the agent decides it. Defaults SHALL come from the deliverable and tier, and from `--director` for visual picks. The standard and full intake playback SHALL show what the agent will decide. The owner MAY change entries with `--delegate` and `--keep` on the intake record. An unknown checkpoint id SHALL fail as a usage error.

#### Scenario: Defaults are shown before work starts

- **WHEN** standard web work reaches the intake playback
- **THEN** the playback instruction SHALL name the checkpoints delegated to the agent
- **AND** `state.delegation` SHALL hold an entry for every checkpoint with `set: "default"`

#### Scenario: The owner hands a checkpoint to the agent

- **WHEN** the owner confirms the playback with `--delegate components`
- **THEN** the `components` entry SHALL become `agent` with `set: "owner"`

#### Scenario: A stated skip delegates intake

- **WHEN** quick web work records its stated decision, or standard web work records `--choice skip`
- **THEN** the `intake` entry SHALL be `agent`

#### Scenario: An unknown checkpoint is named

- **WHEN** an intake record passes `--delegate colours`
- **THEN** the command SHALL exit 1 and list the valid checkpoint ids

### Requirement: Final acceptance and creative intent stay with the owner

Every deliverable at every tier SHALL end with an owner final acceptance before delivery, and it and the confirmation of creative intent SHALL be locked to the owner. They SHALL NOT be delegated, recorded with `--by agent`, or routed to an art director. An owner MAY decline to state creative intent; that SHALL be reported as not stated by the owner and SHALL NOT be filled in by the agent.

#### Scenario: Quick and ui work end with the owner's acceptance

- **WHEN** quick web or edit work passes its check, or ui work at any tier records its work evidence
- **THEN** `next` SHALL ask the owner to accept or reject the result before the work is done
- **AND** a rejection SHALL become a project rule and return to the build or work stage

#### Scenario: Delegating final acceptance is refused

- **WHEN** an intake record passes `--delegate review`
- **THEN** the command SHALL exit 1 and state that final acceptance stays with the owner

#### Scenario: A director run reaches the final review

- **WHEN** standard work initialized with `--director` reaches the final review
- **THEN** `next` SHALL return the acceptance ask without the art-director routing
- **AND** a director review note MAY be recorded as an agent recommendation before the owner decides

#### Scenario: An agent tries to accept

- **WHEN** `decide --stage review --verdict accept --by agent` runs
- **THEN** the command SHALL exit 1 and record nothing

### Requirement: Decisions record who decided

Every record `decide` writes, every direction-preview `decision`, every selection receipt (as `selectedBy`) and every template `approval` SHALL carry `by: owner|agent`. Agent records SHALL name the agent: the director model, else the recorded `--assisted-by` tool, else `unspecified`. `decide` SHALL require `--by` with no default. `--by agent` SHALL be refused on a checkpoint not delegated to the agent. A record without `by` SHALL be reported as `unknown`, never as the owner.

#### Scenario: The owner picks a variant

- **WHEN** `decide --stage concept --verdict pick --choice B --by owner --answer "<reason>"` runs
- **THEN** the stored variant entry SHALL contain `by: "owner"`

#### Scenario: A director accepts a delegated section

- **WHEN** the `section` checkpoint is delegated by `--director <model>` and the director accepts a section with `--by agent`
- **THEN** the stored section entry SHALL contain `by: "agent"` and `agent: "<model>"`

#### Scenario: `--by` is missing

- **WHEN** a `decide` call that records a checkpoint omits `--by`
- **THEN** the command SHALL exit 1 and explain when to use `owner` and when to use `agent`

#### Scenario: Autonomous direction selection without delegation

- **WHEN** `direction-preview.json` records a selection with `by: "agent"` and no `delegation`
- **THEN** `direction check --stage selection` SHALL fail

#### Scenario: A workflow state contradicts the agent selection

- **WHEN** an agent selection cites `delegation.source: "workflow-state"` and `--project-root` resolves a state whose `concept` checkpoint is the owner's
- **THEN** `direction check --stage selection` SHALL fail

#### Scenario: A standalone run cites the owner's instruction

- **WHEN** no workflow state exists and the agent selection cites `delegation.source: "owner-instruction"` with a quote of at least six words
- **THEN** the selection check SHALL pass and report the delegation as owner-instructed

#### Scenario: An agent selects a template

- **WHEN** `template select` creates a receipt with `selectedBy: "agent"` and no `selectionReason`
- **THEN** it SHALL fail instead of defaulting the reason to `user-selected-template`

#### Scenario: A record predates decision roles

- **WHEN** the statement reads a decision entry without `by`
- **THEN** it SHALL list the entry under records without an author

### Requirement: The brief states creative intent

The design brief SHALL carry `creativeIntent` with three facts: `expression`, `connection` and `distinctiveness`. Guided intake SHALL ask for them after success criteria; each fact MAY be skipped with a reason. A fact whose only source is `agent` SHALL NOT resolve it. The standard and full web playback SHALL state the three facts in the owner's words, and each anti-goal SHALL count as distinctiveness.

#### Scenario: The agent suggests the intent

- **WHEN** an intake answer records `expression` with `source: "agent"`
- **THEN** the fact SHALL stay unresolved and `intake confirm` SHALL refuse the brief

#### Scenario: The owner skips one fact

- **WHEN** the owner skips `distinctiveness` with a reason
- **THEN** `intake confirm` SHALL accept the brief and keep the skip reason

### Requirement: Product Context names the creative intent

The DESIGN.md foundation check SHALL require the `Product Context` section to name expression, audience connection and distinctiveness. English labels and the Chinese labels 表达, 连接 or 受众关系, and 独特性 SHALL be accepted. A missing label SHALL return `synthesis-required` naming the label, not `invalid`.

#### Scenario: Product Context lacks distinctiveness

- **WHEN** `Product Context` names expression and connection only
- **THEN** `check-design-foundation` SHALL return `synthesis-required` and name `Distinctiveness`

#### Scenario: Chinese labels are used

- **WHEN** `Product Context` contains 表达, 受众关系 and 独特性
- **THEN** the creative-intent check SHALL pass

### Requirement: Owner picks carry a reason

An owner's variant pick and an owner's final acceptance SHALL include an answer of at least three words, under the existing minimum-content rule. When an agent recommended a choice at that checkpoint, the owner's record SHALL keep the recommendation beside the owner's choice. Reasons SHALL be stored as plain text in the local workflow state.

#### Scenario: A bare pick is refused

- **WHEN** the owner's pick is recorded as `--choice B --answer "ok"`
- **THEN** the command SHALL exit 1 and ask for a reason

#### Scenario: The owner overrides the director

- **WHEN** the director recommended A and the owner picks B with a reason
- **THEN** the stored entry SHALL contain the choice B, the reason and `recommended: {by: "agent", choice: "A"}`

### Requirement: Delivery writes a diligence statement

Delivery SHALL render `.design-pipeline/diligence.md` from the workflow state alone, listing owner decisions with reasons, delegated agent decisions, facts the owner did not state, records without an author, the owner's rules in their words, technical checks apart from owner acceptance, and an `Assisted-by:` line. It SHALL bind the state hash and the delivery bindings already recorded, and SHALL be stale when any of them changes.

#### Scenario: Standard web work is delivered to a remote URL

- **WHEN** delivery records a remote destination and its `deliveryInputHashes`
- **THEN** `diligence.md` SHALL exist with the state hash and the reviewed-input bindings in its header
- **AND** it SHALL state that the remote page itself is not hashed
- **AND** `next` SHALL return its path with the done action

#### Scenario: Film work is delivered as a file

- **WHEN** delivery records `deliveredSha256`
- **THEN** the statement header SHALL include it beside the state hash

#### Scenario: The state changes after delivery

- **WHEN** a later `decide` changes the state
- **THEN** the statement SHALL be reported as stale until the next delivery renders it again

#### Scenario: The statement is read before delivery

- **WHEN** `diligence --write` runs before delivery
- **THEN** it SHALL render the statement without a delivered hash and SHALL NOT change any decision

### Requirement: Collaboration retrospective is optional

After final acceptance the done action MAY offer one optional question about how the collaboration went. An answer SHALL only be recorded as a shadow candidate through the existing adaptation lifecycle. A missing answer SHALL NOT block delivery or any later command.

#### Scenario: The owner does not answer

- **WHEN** the owner ignores the retrospective question
- **THEN** delivery SHALL stay complete and no adaptation candidate SHALL be recorded

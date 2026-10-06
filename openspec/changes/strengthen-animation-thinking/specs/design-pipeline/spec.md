## ADDED Requirements

### Requirement: Motion is authored from intention and poses

The system SHALL support authored pose timing, spacing and holds in the existing choreography
runtime, with deterministic seeking and validation before timeline mutation.

#### Scenario: Independent timing and spacing
- **Given** two pose sequences with the same endpoints and duration but different intermediate keys
- **When** pose-to-pose adds them to a paused composition
- **Then** they follow their authored spacing and retain exact endpoint timing under arbitrary seeks.

#### Scenario: Held drawing and secondary action
- **Given** a held incoming key and a delayed sequence on a separate target
- **When** the scene is rendered
- **Then** the preceding pose stays until the authored key and the secondary action keeps its offset.

#### Scenario: Invalid authoring data
- **Given** non-finite values, unknown properties, inconsistent pose channels or non-increasing keys
- **When** a pattern is called
- **Then** it rejects before mutating the timeline.

#### Scenario: Held poses still act
- **Given** a sequence of zero-duration numeric transform sets on one subject
- **When** later poses change from an earlier pose
- **Then** the timeline gate recognizes discrete action, while initialization, identical poses,
  fade/scale-only changes and broken planned continuous carry remain insufficient.

### Requirement: Stylistic timing remains a creative decision

The system SHALL distinguish rhythm review heuristics from implementation failures and SHALL
keep technical gate results separate from creative acceptance.

#### Scenario: Deliberate rhythm
- **Given** a structurally valid film/edit with regular pulses, long holds, sparse sound accents
  or off-beat cuts
- **When** existing gates run
- **Then** heuristics produce actionable review warnings rather than claim that this style is invalid.

#### Scenario: Broken implementation
- **Given** a timeline gap, property conflict, absent subject action or broken planned carry
- **When** the same gates run
- **Then** the objective failure still blocks conformance.

#### Scenario: Authored sound accent
- **Given** an explicit downbeat, accent or impact cue and the score's event grid
- **When** the declared cue misses every event by more than one frame
- **Then** cue misalignment remains an error even though an off-grid picture cut is only a warning.

#### Scenario: Technical result is not acceptance
- **Given** passing checks and a rendered motion study
- **When** results are reported
- **Then** runtime evidence and visual acceptance are reported separately; user acceptance is not set.

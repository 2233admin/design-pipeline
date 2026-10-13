## ADDED Requirements

### Requirement: Interaction journeys observe ordered business states

The existing interaction verifier SHALL support a bounded ordered DOM-state journey driven by real browser input in one page instance. It SHALL compare captured visible, text, attribute and focus values against declared literal expectations. Legacy motion probes SHALL retain their existing behavior and measurement requirements.

#### Scenario: Menu selection follows opening

- **WHEN** a journey observes initial closure, opens a menu, selects an item and closes it
- **THEN** the verifier SHALL retain state between steps and verify each declared result
- **AND** selection SHALL update the declared visible value and survive subsequent closing input

#### Scenario: Menu animates without applying selection

- **WHEN** the menu moves correctly but its selected value differs from the declared expectation
- **THEN** verification SHALL fail with the step, actual value, expected value and repair finding
- **AND** motion success SHALL NOT establish the missing business state

#### Scenario: Keyboard closes the menu

- **WHEN** the journey drives Escape on an open menu
- **THEN** the verifier SHALL observe closure and the declared focus recovery through real keyboard input

#### Scenario: State observations are incomplete or malformed

- **WHEN** a required step or assertion is missing, duplicated, reordered or has an invalid actual value
- **THEN** the verifier SHALL NOT return a passed journey
- **AND** a missing element SHALL NOT satisfy an expected false or null value

#### Scenario: A journey requests unbounded or executable assertions

- **WHEN** the request exceeds the step, assertion or observation budgets, mixes motion and journey shapes, or supplies an unsupported action or expression
- **THEN** contract validation SHALL reject it before browser execution

#### Scenario: A journey navigates elsewhere

- **WHEN** an ordered operation changes the actual local page to another target
- **THEN** capture SHALL retain the existing canonical-page rejection
- **AND** the other page's states SHALL NOT authorize native completion

#### Scenario: Missing journey provenance hides external requests

- **WHEN** a journey capture omits its page origin, declares another origin, or supplies an unsupported or mismatched capture URL
- **THEN** evaluation SHALL reject it before its values can establish a passed journey
- **AND** supported journey capture SHALL retain external-request checks while legacy-only capture compatibility remains unchanged

### Requirement: Native completion verifies declared journey coverage

Native completion SHALL validate the observed interaction result against the normalized original probe, including every ordered state assertion. It SHALL retain existing task/input/output/report binding, preserved scope, CAS and exact-version review. Journey results SHALL NOT fabricate motion frames or relax legacy motion completeness.

#### Scenario: A caller labels a partial report as state-only

- **WHEN** a caller supplies a state-only label without the complete declared journey observations
- **THEN** native completion SHALL remain blocked
- **AND** the original probe declaration SHALL determine required evidence

#### Scenario: The accepted probe changes

- **WHEN** a step input or literal expectation changes after observed completion
- **THEN** the completion and dependent review SHALL become stale under existing input invalidation

### Requirement: Native repair feedback is actionable and snapshot-bound

Native next SHALL expose actual verifier findings with concrete repair guidance while preserving legacy failure text. Consecutive observed failures SHALL bind the measured input/output snapshot; after three identical failures the returned action SHALL stop blind repetition. Recovery SHALL NOT bypass completion checks or reset a failed authorization window.

#### Scenario: The same failed snapshot is verified again

- **WHEN** actual verification fails repeatedly on identical bound input/output bytes
- **THEN** the stored observed attempt count SHALL increase
- **AND** the third failure SHALL return stop-repeating guidance with the failing check and repair action

#### Scenario: The implementation is repaired

- **WHEN** output bytes change before another observed failed verification
- **THEN** the consecutive count SHALL restart for that new snapshot
- **AND** a restored modification timestamp SHALL NOT hide the byte change

#### Scenario: Next is repeated without verification

- **WHEN** next is repeated, a tool is missing, scope is blocked or native CAS conflicts
- **THEN** no additional observed verifier attempt SHALL be claimed
- **AND** the existing active scope window and applicable recovery SHALL remain intact

### Requirement: Native task examples match supported proof

Native task templates and guides SHALL use an observable goal whose declared checks can establish it, and SHALL state uncovered behavior. A real menu trial SHALL retain agent-produced output, independent browser findings and repaired version evidence while keeping Component Conformance and owner Visual Acceptance separate.

#### Scenario: The agent follows the menu example

- **WHEN** the example task is dispatched, implemented and verified
- **THEN** its proof SHALL exercise actual open, selection, close and keyboard/focus states
- **AND** owner acceptance SHALL require a real reply on the exact displayed version

#### Scenario: A selection defect is deliberately injected

- **WHEN** a trial uses a fault injection to test repair feedback
- **THEN** the record SHALL identify it as an injected counterexample
- **AND** scripted fixtures SHALL NOT be described as real model-produced output

### Requirement: Publication preserves required tracked upstream source

Publication SHALL preserve required tracked upstream source bytes despite personal ignore patterns. Repository exceptions SHALL name exact source paths and SHALL retain the existing tracked-ignored-file audit without changing global preferences.

#### Scenario: A personal binary ignore hides required tracked source

- **WHEN** a published tracked upstream layout source matches a personal binary ignore rule
- **THEN** the repository SHALL explicitly include that exact source path without modifying its bytes or global preferences
- **AND** the existing tracked-ignored-file audit SHALL remain enforced

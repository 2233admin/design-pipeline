## ADDED Requirements

### Requirement: Frontend entry observes before unresolved questions

Web and UI SHALL retain supplied request/project/link context and return a bounded read-only observation before unresolved questions or source changes. Observation SHALL bind actual source/capture evidence and SHALL NOT grant owner design acceptance.

#### Scenario: Existing frontend optimization
- **WHEN** the owner asks to improve a supplied frontend
- **THEN** the first action SHALL inspect the provided bounded project scope read-only and show observed content, functions, constraints and limits
- **AND** later questions SHALL ask only direction-changing facts not already settled.

#### Scenario: Link role remains ambiguous
- **WHEN** a link and existing frontend are provided without a clear reference or reproduction purpose
- **THEN** the bounded observation SHALL precede clarification
- **AND** neither optimization nor faithful reproduction SHALL be silently guessed.

#### Scenario: Empty project is genuinely new
- **WHEN** bounded inspection finds no existing frontend content
- **THEN** the observation SHALL report that limited result and exclusions
- **AND** it SHALL NOT fabricate rendered observations or existing product constraints.

#### Scenario: Link capture is unavailable or changed
- **WHEN** a required link has no current admissible capture or captured bytes changed
- **THEN** entry SHALL remain unfinished with the named missing evidence
- **AND** an asserted observed flag SHALL NOT complete it.

### Requirement: Frontend purpose preserves its authority

Frontend SHALL distinguish optimize-existing, reference-for-existing and faithful-reproduction in plain language. Optimization SHALL preserve function/content/explicit brand constraints while allowing visual/layout improvement. Material overall-style changes SHALL use existing owner choices; reproduction SHALL retain its fidelity authority.

#### Scenario: Authorized quick optimization
- **WHEN** a quick request already fixes purpose and the permitted improvement
- **THEN** the workflow SHALL not repeat settled questions or add an owner design approval
- **AND** it SHALL keep business content, function and explicit brand constraints.

#### Scenario: Reference versus reproduction
- **WHEN** the link is explicitly a reference for the existing frontend
- **THEN** reference content SHALL not replace product-owned content or imply exact copying
- **WHEN** faithful reproduction is requested
- **THEN** the reproduction reference and existing invariants SHALL remain authoritative.

#### Scenario: Nonfrontend workflow
- **WHEN** the deliverable is film or edit
- **THEN** its current intake, sequencing and capabilities SHALL remain unchanged
- **AND** generic UI SHALL not inherit film duration or footage questions.

### Requirement: Design-system evidence is consumed downstream

Frontend directions/spec/tasks and implementation SHALL consume a schema-valid ready design-system-decision.v1 and revalidate its current sources. The same binding SHALL join existing snapshots, policy and receipt inputs. Reference-only decisions SHALL not authorize runtime adoption.

#### Scenario: Missing or fabricated decision
- **WHEN** a frontend attempts concepts/spec/work/implementation without a valid bound decision
- **THEN** progression SHALL stop at missing decision evidence
- **AND** ready/approved booleans or a receipt-shaped object SHALL not substitute for validated evidence.

#### Scenario: Changed or removed source
- **WHEN** a consumed decision, request, stack, catalog or inventory source changes or disappears
- **THEN** dependent approvals and technical evidence SHALL become invalid or stale
- **AND** a resumed stage SHALL not retain the previous acceptance.

#### Scenario: Exploration remains nonruntime
- **WHEN** reference mode supplies design research
- **THEN** directions MAY use that evidence
- **AND** implementation SHALL require retained project authority or an actual runtime choice rather than adopting the reference candidate.

### Requirement: Custom selection distinguishes scratch from fallback

An explicit owner scratch choice SHALL record structured owner selection without mandatory catalog search. Nonexplicit custom fallback and substitution SHALL require actual capability searches, compared/rejected candidates, compatibility, rationale and recorded owner decision. Ambiguous library identity SHALL require clarification.

#### Scenario: Explicit scratch stays fast
- **WHEN** the owner's supplied request explicitly chooses from scratch
- **THEN** custom mode MAY be ready without a capability inventory
- **AND** the decision SHALL bind that request and SHALL not add an interview solely for scratch.

#### Scenario: Product query miss is inconclusive
- **WHEN** research console has zero direct hits but capability decomposition finds app shell, command palette, side nav, data table, progress, dialog or tabs
- **THEN** the miss SHALL not prove catalog exhaustion
- **AND** an unsearched fallback SHALL remain blocked.

#### Scenario: Fallback lacks owner authority
- **WHEN** a fallback omits inventory, comparisons, compatibility, rationale or actual owner selection
- **THEN** the decision SHALL not be ready
- **AND** a late fallback SHALL not inherit authorization from downstream files.

#### Scenario: Ambiguous library name
- **WHEN** a supplied component-system identity is unknown or ambiguous
- **THEN** the workflow SHALL ask for its identity rather than silently select a familiar library.

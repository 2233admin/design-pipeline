## ADDED Requirements

### Requirement: UI transitions have local state-change selection guidance

The packaged skill SHALL provide project-authored UI transition guidance reachable from its animation entry and web build/review guidance. It SHALL map state changes to optional effects or no motion, preserve project token and UC-rule precedence, and require no upstream fetch or runtime installation.

#### Scenario: An author chooses a transition

- **WHEN** UI content, layout, overlay, navigation, list order or a numeric value changes
- **THEN** local guidance SHALL distinguish the changed state, stable identity and appropriate optional transition
- **AND** a clear static change or high-frequency keyboard action SHALL support an explicit no-motion decision.

#### Scenario: Showcase values conflict with the project

- **WHEN** upstream timing, easing, blur or stagger differs from project motion primitives or UC-01 through UC-07
- **THEN** existing project and pipeline precedence SHALL govern
- **AND** the author SHALL NOT install the gallery's token scale as a competing default.

### Requirement: UI transition review checks consumer-visible correctness

UI transition guidance SHALL contain individually referenceable rules and manual review cases with observable pass/fail outcomes for identity, geometry, entrance/exit, retargeting, semantics, reduced motion and cleanup/performance. Results SHALL use existing review evidence without adding an automated gate or granting Visual Acceptance.

#### Scenario: A label is not a comparable numeric value

- **WHEN** nonnumeric status text changes, or a value changes currency, unit or comparison basis
- **THEN** guidance SHALL reject an effect that implies an unsupported increase or decrease
- **AND** neutral replacement or no motion SHALL remain available.

#### Scenario: Rapid reversal exposes stale state

- **WHEN** an overlay opens, closes and reopens before its prior exit completes
- **THEN** review SHALL expect the latest state to win without queued playback or stale cleanup removing it
- **AND** focus, keyboard operation and reduced-motion behavior SHALL remain correct.

#### Scenario: Reorder breaks identity

- **WHEN** list items reorder or a detail view claims continuity with a selected item
- **THEN** review SHALL reject continuity between different logical items or controls
- **AND** unavailable or ambiguous geometry SHALL permit a neutral or static fallback.

### Requirement: Transition method provenance remains reference-only

The guide SHALL record the exact public upstream commit, consulted paths, written-source observations, project-authored extensions and license split. It SHALL ship no copied upstream source or snippets, preserve reference-only catalog treatment, and SHALL NOT imply live playback verification, whole-library MIT licensing or paid entitlement.

#### Scenario: Public source methods are internalized

- **WHEN** upstream surface/action selection or coordination methods inform the local rules
- **THEN** guidance SHALL identify source evidence separately from original project requirements
- **AND** no copied bundle, recipe collection or paid-content access SHALL be required to use it offline.

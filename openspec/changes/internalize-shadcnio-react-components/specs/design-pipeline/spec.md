## ADDED Requirements

### Requirement: Bundled shadcnio component index preserves implementation authority

The pipeline SHALL ship the complete reviewed `shadcnio/react-shadcn-components` repository as a
pinned, MIT-attributed offline resource and expose its README component and hook entries through
deterministic local search. It SHALL distinguish the bundled index from linked webpage
implementation code that is not present in the source repository.

#### Scenario: A React component pattern is needed offline

- **WHEN** a change needs an AI-chat, button, hook, or text component pattern
- **THEN** local search SHALL return matching README entries with their source URLs and local source
  file
- **AND** every result SHALL be marked `reference-adaptation` and `review` with implementation
  license `unverified` until primary source evidence is recorded.

#### Scenario: The bundled source snapshot drifts

- **WHEN** its LICENSE or README is missing, added to, or byte-altered
- **THEN** deterministic verification SHALL block on file count, byte count, or canonical tree hash
- **AND** a valid update SHALL change revision, scope, index counts, attribution, and hash together.

#### Scenario: A linked implementation is selected

- **WHEN** a user selects a page linked by the README index
- **THEN** the pipeline SHALL NOT install dependencies, execute a generator, or copy webpage code
  solely because it was indexed
- **AND** it SHALL verify the linked implementation's license, dependencies, accessibility, and
  target-project fit before adaptation.

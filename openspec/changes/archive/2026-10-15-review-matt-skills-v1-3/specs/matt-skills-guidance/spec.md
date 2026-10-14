## ADDED Requirements

### Requirement: Maintain one configured glossary
Repository agent guidance SHALL point to `docs/GLOSSARY.md`, preserving the existing vocabulary and OpenSpec decision store. It SHALL describe the legacy name without creating duplicate glossary documents.

#### Scenario: Matt skill requests domain context
- **WHEN** a skill needs glossary or architectural decisions
- **THEN** it follows `docs/agents/domain.md` to the configured glossary and relevant OpenSpec change
- **AND** it does not infer separate product domains from private maintenance npm workspaces

#### Scenario: Legacy glossary link is migrated
- **WHEN** the existing lowercase glossary is renamed
- **THEN** current maintained consumer links resolve to the new path
- **AND** historical change records retain their original evidence

### Requirement: Review skill provenance without replacing local choices
The compatibility guide SHALL identify fixed upstream versions, installed file comparisons, local forks and setup choices. It SHALL distinguish availability, loading and successful execution.

#### Scenario: Upstream skills are already current
- **WHEN** installed upstream files match the reviewed source
- **THEN** the review records the match without reinstalling the collection
- **AND** separately named or compatibility skills are compared without overwriting them

### Requirement: Base usage recommendations on bounded evidence
The review SHALL describe its 25-session selection, invocation rules and visibility limits. Shared results SHALL contain aggregate findings without raw transcripts or private identifiers.

#### Scenario: A skill is only listed or mentioned
- **WHEN** a session names a skill without an actual skill read or invocation
- **THEN** the review does not count it as a skill-loading event

#### Scenario: Recommendations are published
- **WHEN** the review recommends an engineering flow
- **THEN** the recommendation is tied to measured use and supported skill behavior
- **AND** loading evidence is not reported as proof that the flow succeeded

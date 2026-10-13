## ADDED Requirements

### Requirement: Windows namespace aliases preserve contained artifact coordinates

The existing containment and artifact v1 helpers SHALL accept equivalent Windows namespace paths in either direction while retaining caller-root coordinates and physical identity checks. Namespace root traversal SHALL terminate safely. Artifact metadata and receipt lineage SHALL remain unchanged.

#### Scenario: Existing and future paths use the other namespace spelling

- **WHEN** an absolute existing or future path identifies a location within the caller's physical root using its equivalent namespace spelling
- **THEN** the resolver SHALL return that location within the caller's lexical root
- **AND** namespace volume-root traversal SHALL NOT throw an unrelated filesystem error

#### Scenario: An artifact caller uses a namespace root

- **WHEN** artifact creation or validation receives a namespace caller root and a contained file
- **THEN** metadata SHALL retain a relative contained path with the actual file hash
- **AND** subsequent validation SHALL retain its ready status without changing dependencies or input hashes

#### Scenario: Namespace spelling attempts to bypass containment

- **WHEN** a namespace path uses an external junction, linked ancestor, distinct physical directory, unavailable identity or relative parent traversal outside the caller's root
- **THEN** existing containment checks SHALL reject that path
- **AND** namespace handling SHALL NOT expand the authorized root

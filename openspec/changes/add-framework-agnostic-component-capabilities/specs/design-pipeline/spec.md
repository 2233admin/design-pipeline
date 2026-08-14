# Design Pipeline Delta

## ADDED Requirements

### Requirement: Component requirements are framework-agnostic before provider selection

The pipeline SHALL express component behavior as governed capabilities and dependency closure before
selecting a framework or library provider.

#### Scenario: A user requests a selectable data table

- **WHEN** a brief requests filtering, sorting, pagination, and multiple selection
- **THEN** the inventory SHALL include those data and selection capabilities
- **AND** it SHALL add required keyboard, focus, ARIA, loading, empty, and error behavior.

### Requirement: Component providers are replaceable and non-mutating

Provider discovery SHALL inspect only existing project metadata. Resolution SHALL distinguish
project-owned, installed, and candidate routes and SHALL NOT install packages or rewrite project
configuration.

#### Scenario: Vuetify0 is installed in a Vue project

- **WHEN** Vuetify0 covers a requested capability
- **THEN** it SHALL be preferred over a project-owned custom implementation
- **AND** uncovered states SHALL retain an explicit fallback rather than being reported as covered.

#### Scenario: A compatible provider is not installed

- **WHEN** it is explicitly preferred
- **THEN** the route SHALL record that adoption is required
- **AND** resolution SHALL NOT execute a package manager.

### Requirement: Component verification is behavior- and evidence-based

Verification SHALL be bound to the exact resolution hash. Every required behavior check SHALL pass
with non-empty evidence before the result can be verified.

#### Scenario: A component looks correct but has no keyboard evidence

- **WHEN** the required keyboard check is absent, missing, or failed
- **THEN** component verification SHALL remain blocked
- **AND** framework source code or a static screenshot SHALL NOT fill the missing evidence.

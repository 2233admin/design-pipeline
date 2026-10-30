## ADDED Requirements

### Requirement: Vendored guidance follows upstream corrections

When an upstream corrects, retracts or removes guidance the package vendors or quotes, the package SHALL refresh that bundle or freeze it with its upstream status recorded, and SHALL NOT keep shipping the retracted rule. Companion capability markers SHALL match text present in the reviewed upstream revision.

#### Scenario: Retracted contrast rule

- **WHEN** the refreshed `interface-discipline` bundle is packaged
- **THEN** no packaged file SHALL state that text on backgrounds above OKLCH L 0.73 must be dark

#### Scenario: Removed upstream

- **WHEN** an upstream deletes a vendored skill
- **THEN** the bundle's manifest SHALL record the removal commit and the bundle SHALL remain packaged

#### Scenario: Capability marker

- **WHEN** `capabilities:check` runs against impeccable at the reviewed revision
- **THEN** every required marker SHALL be found

#### Scenario: One runtime version

- **WHEN** the evals and the film scaffold resolve HyperFrames
- **THEN** both SHALL use the same version, and the notice SHALL name that release's commit

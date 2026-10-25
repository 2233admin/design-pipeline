## ADDED Requirements

### Requirement: Component fit takes provider licenses from the catalog source record

Component fit SHALL take an external provider's license from the component source catalog record with `recordType` `source` and the provider's `sourceId`: `license.id` when its state is verified, otherwise its `provenance.license`. Project-owned providers SHALL keep `project-owned`. The provider registry SHALL NOT carry a license. Existing unspecific-license and `requiresLicense` review rules SHALL still apply.

#### Scenario: Provider with a verified catalog source

- **WHEN** `component fit` evaluates a provider whose `sourceId` names a verified source record, such as React Aria with `adobe/react-spectrum` recorded as Apache-2.0
- **THEN** the candidate SHALL record that license and its `license` dimension SHALL pass
- **AND** the matrix `catalogHash` SHALL cover that record, so `validate-fit --catalog` SHALL report the binding stale after the record's license changes

#### Scenario: Provider without a catalog source

- **WHEN** a provider has no `sourceId`, or its `sourceId` has no source record in the catalog
- **THEN** the candidate license SHALL be null, its `license` dimension SHALL fail and the candidate SHALL be blocked

#### Scenario: Unverified, commercial or unspecific catalog license

- **WHEN** the provider's source record has license state `unverified` or `commercial`, or an unspecific `provenance.license` such as `mixed` or `unverified`
- **THEN** the candidate's `license` dimension SHALL be `review` and the candidate SHALL NOT be ready

#### Scenario: Ambiguous catalog source

- **WHEN** two source records carry the provider's `sourceId`
- **THEN** `component fit` SHALL fail and SHALL NOT pick one of them

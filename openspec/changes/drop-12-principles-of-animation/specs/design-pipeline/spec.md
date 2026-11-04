## MODIFIED Requirements

### Requirement: Bundled UI craft sources

The pipeline SHALL ship locked, scoped, byte-preserved and license-attributed snapshots of
`emil-design-eng`, `make-interfaces-feel-better`, `fixing-accessibility`, `shadcn` and
`playwright-cli`, readable without a global skill install or network access, and SHALL route them
through one maintained guide.

#### Scenario: Fresh standalone installation builds a web page

- **WHEN** a user installs only `design-pipeline` and `next` reaches the web `build` stage
- **THEN** the returned guide section SHALL route to the bundled UI craft guide
- **AND** every bundled source that guide names SHALL exist in the package with its manifest and
  license evidence, while each reference-only source SHALL resolve to its packaged, pinned
  reference record.

#### Scenario: A snapshot drifts or is incomplete

- **WHEN** a vendored file is changed, removed or added, or a manifest is rehashed without matching
  bytes
- **THEN** the source integrity test SHALL fail
- **AND** the importer SHALL reject a dirty checkout, a missing entry or root file, a changed license
  or an invalid review date without replacing the existing snapshot.

#### Scenario: Upstream guidance conflicts with pipeline contracts

- **WHEN** a bundled source disagrees with project tokens, the interface review protocol, the motion
  gate or Good CSS
- **THEN** the project and pipeline contract SHALL govern, and the conflicting rule SHALL be recorded
  as not applicable rather than as a finding
- **AND** upstream persona text, slash-command usage and output formats SHALL NOT replace the
  existing review record.

#### Scenario: An upstream deletes a bundled skill without a successor

- **WHEN** an upstream removes a bundled skill and its rules are already covered by other bundled
  sources or pipeline guides
- **THEN** the bundle, its lock entry, catalog entry, package resources and notice SHALL be removed
  and every route SHALL cite the existing coverage
- **AND** no shipped guide, lock entry or vendor directory SHALL still name the removed bundle.

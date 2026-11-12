# Design pipeline delta

## ADDED Requirements

### Requirement: Copy-specific installation and evaluation provenance
Maintained guidance SHALL distinguish committed source, published packages, installed copies and frozen evaluations by their available immutable identities and evidence scope. Missing historical records SHALL remain explicit. Technical checks SHALL NOT imply model benefits or owner Visual Acceptance.

#### Scenario: A version label is shared by different trees
- **WHEN** source or installed copies share a version label but differ in commit, tree or file bytes
- **THEN** guidance SHALL identify the copies separately and SHALL NOT describe them as the same verified release

#### Scenario: Historical raw evidence is unavailable
- **WHEN** a maintained historical record gives a source or snapshot hash but its ignored raw evidence is not reachable
- **THEN** guidance SHALL preserve the recorded lineage, name the unavailable evidence and SHALL NOT claim a fresh hash or model run

### Requirement: Full copied publication-snapshot verification
Current installation verification SHALL use the complete package from a pinned integrated publication snapshot copied into a project-scoped installation. It SHALL preserve developer junctions, unrelated local differences and frozen experiments, and record package and installed-copy identity with the actual CLI checks.

#### Scenario: Integration has not yet been frozen
- **WHEN** runtime and documentation slices are still being integrated
- **THEN** new-commit package, installation and CLI verification SHALL remain pending in a new record rather than inherit historical results

#### Scenario: A developer junction fails diagnostics
- **WHEN** the live global skill resolves to a locally modified developer source and diagnostics report failures
- **THEN** guidance SHALL label it development and unverified, preserve it unchanged, and SHALL NOT substitute it for the copied publication snapshot

### Requirement: Artifact-bound historical task corrections
A stale golden-case acceptance task SHALL be corrected only when an existing owner acceptance record identifies the corresponding reviewed artifact. Deferred issues SHALL remain deferred, and new implementation evidence SHALL NOT rewrite frozen experiment logs or raw outputs.

#### Scenario: Later-round films have render-bound approval
- **WHEN** the MAD, UI promo and explainer case records each contain owner acceptance with the reviewed render SHA-256
- **THEN** the later-round task MAY be corrected with pointers to those records without rerendering or extending their acceptance to new outputs

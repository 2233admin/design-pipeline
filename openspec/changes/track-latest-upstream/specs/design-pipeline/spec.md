## ADDED Requirements

### Requirement: Upstream sources track latest through one lock

The repository SHALL record every upstream source in `sources.lock.json` with its repository, revision or release, commit time, review date and kind. Vendor manifests, catalog links, companion profiles, adapted-reference frontmatter, notices and runtime version sites SHALL be derived from it, and the offline source check SHALL fail when any of them disagrees with the lock.

#### Scenario: A derived pin drifts

- **WHEN** a catalog link, manifest revision or runtime version differs from its lock entry
- **THEN** `npm run sources:check` SHALL fail and name the file and the locked value.

#### Scenario: A manifest is rehashed over edited bytes

- **WHEN** a vendored file is edited and its manifest hashes are recomputed by hand
- **THEN** the source check SHALL fail because the lock records a different snapshot hash.

### Requirement: Updating moves every source to upstream HEAD

`npm run sources:update` SHALL resolve each source's upstream HEAD, or the latest release for runtime libraries, fetch it into a temporary directory as data, re-import it with the source's existing importer, regenerate integrity hashes and derived pins, and update the lock. It SHALL NOT execute upstream code, and a source held in the lock SHALL stay and be reported with its follow-up issue.

#### Scenario: An upstream moved

- **WHEN** a locked repository has new commits
- **THEN** the lock, the bundle manifest and every derived link SHALL name the new revision and the same upstream state SHALL produce the same bytes.

#### Scenario: An upstream restructured

- **WHEN** the new revision removes or moves a file our guides, records or resources cite, changes a cited license text or drops a companion capability marker
- **THEN** the update SHALL fail for that source, name what changed and leave its bundle, pins and lock entry unchanged.

### Requirement: Behind upstream is visible

`npm run sources:check -- --upstream` SHALL list every source whose upstream has moved past the lock, held ones with their issue, as warnings without failing; the default check SHALL stay offline.

#### Scenario: A source is behind

- **WHEN** an upstream HEAD differs from its lock entry
- **THEN** the check SHALL print it with the command that moves it and still exit by the offline result.

### Requirement: A weekly pull request carries the bump

A scheduled and manually startable workflow SHALL run the update, move npm dev dependencies to latest, run specification validation and the full QA, and open or refresh one pull request from `chore/track-latest-upstream` that states what moved, what failed and what is held. It SHALL NOT merge.

#### Scenario: The checks fail

- **WHEN** QA fails after the bump
- **THEN** the pull request SHALL still be opened, as a draft, with the failing result in its body.

## MODIFIED Requirements

### Requirement: Complete pinned good-css source

The pipeline SHALL ship the complete good-css Git tree at the revision `sources.lock.json` records as byte-preserved source with revision, Git tree, per-object identities, canonical hash and license evidence. It SHALL use the existing snapshot, package-resource and source-check mechanisms without automatic upstream installation.

#### Scenario: Clean reviewed source is imported

- **WHEN** a clean checkout of the upstream HEAD is imported
- **THEN** every tracked file, practice, reference, specimen and attributed asset SHALL be packaged
- **AND** the snapshot SHALL match Git blob identities and the locked tree hash.

#### Scenario: Source evidence is incomplete or changed

- **WHEN** the source is dirty, a practice loses its reference or specimen, or a locked file is missing, added or modified
- **THEN** import or integrity verification SHALL fail without relabeling the source as current
- **AND** existing published artifacts SHALL not be silently overwritten by a failed import.

### Requirement: Complete pinned Taste source

The pipeline SHALL ship the complete Leonxlnx/taste-skill Git tree at the locked revision with its one skill, references, library, scripts, assets and supporting files, preserving original bytes and recording modes. Provenance SHALL bind revision, Git tree, per-object identities, canonical hash and MIT license through existing snapshot and resource mechanisms.

#### Scenario: Reviewed source is internalized

- **WHEN** a clean checkout of the upstream HEAD is imported
- **THEN** the complete source inventory and the `design-taste-frontend` skill name SHALL match the preserved Git blobs
- **AND** required package resources SHALL include their complete local source.

#### Scenario: An import or snapshot cannot be trusted

- **WHEN** the source is dirty, incomplete, ships a different skill set, or a locked blob is changed, missing or added
- **THEN** import or source verification SHALL fail without approving a new baseline
- **AND** a failed import SHALL preserve the prior snapshot.

### Requirement: Complete film method source snapshots

The packaged skill SHALL preserve both redistributable film-method Git trees at their locked revisions with original bytes, file inventories, hashes and notices. Import SHALL take the clean checkout it is given, reject an altered checkout or a missing entry, and preserve the previous snapshot on failure.

#### Scenario: Complete sources travel with an isolated installation

- **WHEN** the package is installed without ambient Cinetic or product-film-skill
- **THEN** every locked tracked blob SHALL remain readable locally and match its locked identity
- **AND** excluded external media SHALL have a stated boundary.

#### Scenario: Arbitrary source refresh is refused

- **WHEN** an import uses a modified checkout, lacks the entry file or has a different license
- **THEN** it SHALL fail without replacing the previous snapshot.

### Requirement: Bundled UI craft sources

The pipeline SHALL ship locked, scoped, byte-preserved and license-attributed snapshots of
`emil-design-eng`, `make-interfaces-feel-better`, `fixing-accessibility`,
`12-principles-of-animation`, `shadcn` and `playwright-cli`, readable without a global skill
install or network access, and SHALL route them through one maintained guide.

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

### Requirement: Tracking HUD film reference has locked provenance

The packaged skill SHALL carry the complete ff-tracking Git tree at its locked revision with original bytes, inventory, hashes and MIT and font notices, registered with the existing film source importer and checks. Import SHALL reject an altered checkout and keep the previous snapshot. The vendored tree SHALL stay reference and provenance; it is never edited, built or run by the skill.

#### Scenario: The template travels with an isolated installation

- **WHEN** the package is installed without an ambient ff-tracking checkout
- **THEN** every locked tracked blob SHALL be readable locally and match its locked identity
- **AND** the manifest SHALL record the upstream repository, commit, license and render boundary.

#### Scenario: Arbitrary template refresh is refused

- **WHEN** an import uses a modified checkout, lacks the README entry or has an invalid review date
- **THEN** it SHALL fail without replacing the previous snapshot.

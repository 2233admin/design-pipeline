## ADDED Requirements

### Requirement: Bundled upstream snapshots match their recorded upstream trees

Bundled upstream files SHALL be stored without line-ending conversion. iart verification SHALL rebuild each pack's Git tree from the manifest objects and block when it differs from the tree recorded for that pack's revision.

#### Scenario: A snapshot was regenerated from altered bytes

- **WHEN** an iart file and its manifest entry agree with each other but not with the pack's recorded Git tree
- **THEN** verification SHALL block and name the pack

#### Scenario: A new upstream file is committed

- **WHEN** a file under `skill/vendor/**/upstream/` is added
- **THEN** Git SHALL store its bytes unchanged

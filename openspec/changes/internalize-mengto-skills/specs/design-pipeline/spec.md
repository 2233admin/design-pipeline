## ADDED Requirements

### Requirement: MengTo skills are completely internalized

The pipeline SHALL ship a complete, pinned, MIT-attributed `MengTo/skills` source tree and a
machine-readable catalog as core offline package resources.

#### Scenario: A design technique is needed offline

- **WHEN** the user has only the packaged design pipeline and requests a matching visual, motion,
  reference, WebGL, or game workflow
- **THEN** local search SHALL return candidates from all bundled skills with exact source paths
- **AND** the selected source SHALL be adapted through project DESIGN, MOTION, dependency, and QA
  contracts rather than copied as project authority.

#### Scenario: The upstream snapshot is partial or altered

- **WHEN** a tracked file is missing, added, or byte-drifted
- **THEN** deterministic verification SHALL block
- **AND** revision, Git tree, counts, and canonical hash SHALL be updated together for a valid sync.

#### Scenario: A bundled workflow crosses an authority boundary

- **WHEN** a skill involves credentials, paid services, private accounts, publication, social
  posting, or other external side effects
- **THEN** bundling SHALL NOT grant authority
- **AND** the workflow SHALL remain explicit-only and subject to normal host boundaries.

#### Scenario: Kage is used as a scroll-world reference

- **WHEN** a task cites the separately published `MengTo/kage` repository
- **THEN** the pipeline SHALL route through the bundled `web-design/build-threejs-scroll-worlds`
  playbook plus the clean-room Kage case study
- **AND** it SHALL preserve the current repository's no-license boundary by importing no source,
  font, generated image, foreground artwork, or other project asset.

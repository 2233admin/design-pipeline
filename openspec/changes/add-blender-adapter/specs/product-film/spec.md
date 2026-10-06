# Product film delta

## ADDED Requirements

### Requirement: Blender shots
The pipeline SHALL render a declared Blender template headless from validated parameters, SHALL
encode the frames into a film, and SHALL convert the scene's keyframes into the film timeline
format so the timeline gate applies.

#### Scenario: Valid Blender shot is rendered
- **WHEN** a shot declares a Blender template and validated parameters
- **THEN** the pipeline SHALL render it headlessly, encode its frames into a film, and convert its keyframes into the film timeline format used by the timeline gate

### Requirement: external tools and assets
The package SHALL NOT include Blender or downloaded assets. Downloaded HDRIs SHALL be verified
against the publisher's checksum.

#### Scenario: Package excludes Blender and downloaded assets
- **WHEN** the package is built
- **THEN** Blender and downloaded assets SHALL NOT be included in the package

#### Scenario: Downloaded HDRI is verified
- **WHEN** an HDRI is downloaded
- **THEN** it SHALL be verified against the publisher's checksum

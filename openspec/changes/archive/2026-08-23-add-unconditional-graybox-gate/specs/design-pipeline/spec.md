## ADDED Requirements

### Requirement: Structural proof precedes optical treatment on every route

The pipeline SHALL require a layout-only graybox capture and a recorded structural comparison before
materials, glow, bloom, depth of field, scanlines, or cinematic grading are authored, on every route
and in every fidelity mode.

#### Scenario: A flat or planar reference route

- **WHEN** the selected route is `2d` or `2.5d`
- **AND** a `reference-evidence.json` exists for the change
- **THEN** `designer-pipeline reconstruction check --stage graybox` SHALL be required
- **AND** it SHALL report `blocked` until a graybox capture and structural comparison exist
- **AND** optical treatment SHALL NOT be authored while it reports `blocked`.

#### Scenario: The source raster is unavailable

- **WHEN** the reference source is not a resolvable file
- **AND** the measured geometry stage therefore cannot run
- **THEN** the graybox stage SHALL still be required
- **AND** its comparison mode SHALL be recorded as `qualitative`
- **AND** a `qualitative` graybox SHALL NOT be accepted as fidelity evidence.

#### Scenario: A capture claims suppression without a declared mode

- **WHEN** a graybox capture is submitted
- **AND** the change declares no runtime graybox mode that disables emissive, optical, and texture
  layers
- **THEN** the graybox stage SHALL report `blocked`.

### Requirement: Reconstruction stages are reported independently

The pipeline SHALL report the graybox, geometry, and final stages as separate results and SHALL NOT
infer one stage's status from another.

#### Scenario: Geometry is blocked but graybox passed

- **WHEN** the geometry stage is `blocked` on a missing source raster
- **AND** the graybox stage is `ready`
- **THEN** the reported result SHALL show both statuses separately
- **AND** the change SHALL be permitted to continue into optical treatment.

#### Scenario: Both stages are blocked

- **WHEN** the geometry stage is `blocked` on a missing source raster
- **AND** the graybox stage is also `blocked`
- **THEN** `qa.md` SHALL record the graybox blocker as a process gap rather than an environmental
  limitation.

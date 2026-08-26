## ADDED Requirements

### Requirement: Reference classification separates geometry, camera, interaction, and output

The pipeline SHALL record object dimensionality, camera model, interaction model, and output surface
as separate decisions before implementation.

#### Scenario: Fixed-camera cinematic 3D

- **WHEN** a reference contains authored 3D geometry under a fixed perspective camera
- **AND** the final surface exposes no camera navigation
- **THEN** the route SHALL remain 3D
- **AND** the runtime family SHALL be `fixed-camera-cinematic-3d`

### Requirement: Spatial evidence is machine-checkable

The pipeline SHALL validate a `reference-evidence.json` artifact and reject a 2D classification when
multiple strong spatial cues are recorded.

#### Scenario: Spatially contradictory 2D route

- **WHEN** at least two of thickness, occlusion, contact shadows, bevel highlights, perspective
  convergence, or depth of field are present
- **AND** the selected route or object dimensionality is 2D
- **THEN** reference validation SHALL fail with a spatial-route contradiction

### Requirement: Reference approval blocks implementation

The pipeline SHALL report schema-valid reference evidence as blocked until explicit approval is
recorded.

#### Scenario: Approval is pending

- **WHEN** reference evidence is valid
- **AND** approval status is `pending`
- **THEN** `reference check` SHALL exit with blocked status

### Requirement: 3D work proves geometry before polish

Every 3D route SHALL declare `reference.md`, `scene.json`, `3d.md`, and `graybox.png`.

#### Scenario: Graybox evidence is absent

- **WHEN** a 3D route omits `graybox.png`
- **THEN** reference validation SHALL fail before material and optical polish

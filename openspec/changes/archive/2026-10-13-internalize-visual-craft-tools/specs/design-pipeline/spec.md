## ADDED Requirements

### Requirement: Cross-surface visual craft is executable

The skill SHALL expose reusable, locally executable drawing, typography and image-placement
methods for graphics and frontend work without requiring a film deliverable or a fixed style.

#### Scenario: Progressive tool loading
- **Given** an existing graphics, drawing, image, layout or frontend task
- **When** an agent needs a supporting visual capability
- **Then** it can follow a short tools index to one guide and implementation without loading the whole source library or creating a film workflow.

#### Scenario: Bounded implementation by a smaller model
- **Given** an observed visual goal and supplied geometry, colors, text and dimensions
- **When** an agent selects the applicable bundled primitive
- **Then** it can render that goal with explicit inputs and obtain repeatable visual evidence.

#### Scenario: Invalid or unreadable authoring data
- **Given** non-finite geometry, excessive work or text that cannot fit above the minimum size
- **When** the helper runs
- **Then** it rejects invalid geometry before drawing or reports text overflow without a false success.

### Requirement: Visual differences are observable evidence

The system SHALL provide spatial image and sampled-motion diagnostics through the existing
composition and reference-analysis surfaces while preserving source lineage and acceptance boundaries.

#### Scenario: Compare equal-size images
- **Given** two contained PNG images with a local change
- **When** composition comparison runs
- **Then** it renders the original pair and localizes the change, records source digests, and grants no creative acceptance.

#### Scenario: Inspect motion in sampled reference frames
- **Given** a local video prepared by the existing reference analyzer
- **When** the agent opens a spatial motion map
- **Then** the map names its source frames and sampling limits without claiming object identity or full-frame-rate motion analysis.

#### Scenario: Preserve evidence integrity
- **Given** mismatched dimensions, unsafe or existing output paths, or a changed diagnostic file
- **When** the comparison or reference validator runs
- **Then** it refuses unsafe comparison/overwrite or invalidates the changed evidence using the existing report contract.

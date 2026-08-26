## ADDED Requirements

### Requirement: Bundled Holosticker preserves executable capability boundaries

The pipeline SHALL ship every tracked file from one pinned, MIT-attributed `jal-co/holosticker`
revision as a byte-verified offline implementation source. It SHALL expose the holographic
material, die-cut mask, pointer tilt, peel/layers, static export, animated export, React component
export, and Studio settings as separately selectable capability slices.

#### Scenario: A holographic sticker is requested

- **WHEN** a change explicitly needs holographic foil, a die-cut sticker, pointer tilt, or peel
  behavior
- **THEN** the pipeline SHALL route the minimum matching local source files through the
  `scene-renderer-3d` family and project-pinned `threejs` adapter
- **AND** it SHALL require `scene.json`, `3d.md`, `motion.md`, accessible controls or static parity,
  reduced-motion behavior, cleanup ownership, performance budgets, and real-browser evidence.

#### Scenario: An optional output is not requested

- **WHEN** the selected capability does not require GIF/video, GLB, React component export, upload,
  or the full Studio UI
- **THEN** the pipeline SHALL not copy those modules or add their dependencies
- **AND** it SHALL preserve the target project's existing framework, controls, and Three.js
  version when they satisfy the contract.

#### Scenario: The bundled source snapshot drifts

- **WHEN** any tracked upstream file is missing, added, or byte-altered
- **THEN** deterministic verification SHALL block on file count, byte count, canonical tree hash,
  or missing capability source
- **AND** a valid update SHALL change revision, Git tree, version, inventory, attribution, and hash
  together.

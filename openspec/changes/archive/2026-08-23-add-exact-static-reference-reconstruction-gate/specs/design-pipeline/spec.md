## ADDED Requirements

### Requirement: Static reference fidelity is explicit and non-downgradable

The pipeline SHALL distinguish primary targets from constraints and inspiration and SHALL preserve
requested fidelity separately from effective fidelity.

#### Scenario: Exact still-frame reconstruction is requested

- **WHEN** a supplied image is requested as an identical, exact, 1:1, pixel-accurate, cloned,
  reproduced, or faithful target
- **THEN** the pipeline SHALL select `primary-target` plus `exact-reconstruction`
- **AND** SHALL NOT generate alternative visual directions
- **AND** SHALL require explicit user approval for any fidelity downgrade.

#### Scenario: Geometry is calibrated

- **WHEN** implementation is about to proceed
- **THEN** the pipeline SHALL require a rectified reference, canonical elevation, locked camera,
  distributed landmarks, and overlay evidence
- **AND** SHALL independently recompute landmark error before visual polish.

#### Scenario: Final fidelity is evaluated

- **WHEN** completion is claimed
- **THEN** an independent EvidencePort SHALL produce a successful probe and hash-bound
  source/render/diff receipt
- **AND** the evaluator SHALL distinguish `blocked` evidence from `fidelity-limited` measurements.

# design-pipeline Delta Specification

## ADDED Requirements

### Requirement: Graphics capabilities are stable before adapters

The pipeline SHALL select a durable capability family before a 2D, 3D, data, geospatial, GPU,
game, or narrative adapter and SHALL preserve an accepted existing runtime that satisfies the
contract.

#### Scenario: A project already has a suitable renderer

- **WHEN** the accepted project runtime satisfies the selected capability, accessibility, and
  performance contract
- **THEN** the pipeline SHALL preserve it rather than add another adapter only because a companion
  skill exists.

### Requirement: Spatial runtime state uses scene.md

Persistent spatial, engine, GPU, or stateful narrative work SHALL use change `scene.md` to bind
design and motion semantics to one versioned adapter with explicit lifecycle, assets, input,
accessibility, budgets, determinism, degradation, and cleanup.

#### Scenario: A persistent runtime is selected

- **WHEN** persistent spatial state, cameras, coordinates, assets, input, a render or game loop,
  procedural state, or save/load lifecycle is required
- **THEN** change `scene.md` SHALL bind the selected adapter and its lifecycle, budgets,
  determinism, degradation, and cleanup ownership
- **AND** change `qa.md` SHALL own evidence that verifies the selected adapter satisfies those
  contracts.

### Requirement: Phaser is a native 2D game route

Phaser v4 routing SHALL work from the built-in contract and official documentation without an
optional credentialed host or unverified community skill pack.

#### Scenario: An optional Phaser integration is unavailable

- **WHEN** the credentialed host is not configured or a community pack lacks verified licensing
- **THEN** local Phaser routing SHALL remain available from the built-in contract and official
  documentation
- **AND** the unavailable or unverified integration SHALL NOT be automatically installed.

### Requirement: Narrative game UI is deterministic and accessible

Dialogue, choices, backlog, skip, autoplay, save/load, localization, and related Galgame state
SHALL be data-driven and SHALL remain operable when motion or scene rendering is reduced or
degraded.

#### Scenario: Dialogue rendering is degraded

- **WHEN** motion is reduced or the scene renderer is unavailable
- **THEN** dialogue, choices, backlog, skip, autoplay, save/load, localization, keyboard operation,
  and readable text SHALL remain operable from deterministic product state.

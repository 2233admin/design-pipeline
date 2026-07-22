# design-pipeline Delta Specification

## ADDED Requirements

### Requirement: Graphics capabilities are stable before adapters

The pipeline SHALL select a durable capability family before a 2D, 3D, data, geospatial, GPU,
game, or narrative adapter and SHALL preserve an accepted existing runtime that satisfies the
contract.

### Requirement: Spatial runtime state uses scene.md

Persistent spatial, engine, GPU, or stateful narrative work SHALL use change `scene.md` to bind
design and motion semantics to one versioned adapter with explicit lifecycle, assets, input,
accessibility, budgets, determinism, degradation, and cleanup.

### Requirement: Phaser is a native 2D game route

Phaser v4 routing SHALL work from the built-in contract and official documentation without an
optional credentialed host or unverified community skill pack.

### Requirement: Narrative game UI is deterministic and accessible

Dialogue, choices, backlog, skip, autoplay, save/load, localization, and related Galgame state
SHALL be data-driven and SHALL remain operable when motion or scene rendering is reduced or
degraded.

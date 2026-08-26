# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: PixiJS is a bounded 2D rendering route

The pipeline SHALL treat PixiJS as an optional interactive 2D renderer and scene runtime rather
than as the default animation choice or a replacement for semantic HTML.

#### Scenario: A PixiJS render surface is justified

- **WHEN** sprites, particles, filters, shaders, Canvas/WebGL/WebGPU rendering, or high object counts require a dedicated 2D renderer
- **THEN** the pipeline SHALL route through the official PixiJS v8 skill suite
- **AND** change `motion.md` SHALL define renderer, scene graph, lifecycle, ticker, asset,
  performance, accessibility, reduced-motion, fallback, and cleanup ownership.

#### Scenario: Ordinary UI motion is requested

- **WHEN** semantic DOM, CSS, or the target repository's existing runtime can satisfy the change
- **THEN** the pipeline SHALL NOT select PixiJS only because the interface contains motion.

#### Scenario: PixiJS and a choreography runtime are combined

- **WHEN** PixiJS is used with CSS, WAAPI, Anime.js, or GSAP
- **THEN** `design.md` and `motion.md` SHALL assign non-overlapping render, property, clock,
  lifecycle, and cleanup ownership.

### Requirement: PixiJS companion compatibility is data-driven

The pipeline SHALL evaluate the official PixiJS router and a bounded production baseline without
making the optional suite a prerequisite for normal pipeline use.

#### Scenario: Only the PixiJS router is installed

- **WHEN** `pixijs` is present but required production-baseline sub-skills are absent
- **THEN** self-check SHALL report a non-blocking warning with missing skills and the canonical
  PixiJS documentation fallback.

#### Scenario: The PixiJS suite is absent

- **WHEN** no PixiJS production-baseline skill is installed
- **THEN** self-check SHALL report informational absence and SHALL keep the core pipeline usable.

## ADDED Requirements

### Requirement: SVG/D3 has a project-owned executable lifecycle

The existing svg-d3 adapter SHALL define probe, plan, invoke and verify using the existing toolchain contract, so a framework request that selects it is not blocked for a missing lifecycle. The probe SHALL inspect only the target project's package.json and node_modules/d3: an exact declared d3 version equal to the installed package version, a nonempty dev script, and an importable local package exporting select. It SHALL NOT install dependencies, fall back to parent or global modules, use the network, start the server or claim chart, accessibility or visual verification from package import.

#### Scenario: React project with a pinned D3 runtime

- **WHEN** a React toolchain request selects svg-d3 and the target declares an exact d3 version matching node_modules/d3 with a project-owned scripts.dev
- **THEN** the existing resolver SHALL report ready without a lifecycle blocker and supply the SVG/D3 guide and the npm run dev invocation
- **AND** the probe SHALL report the actual installed d3 version
- **AND** the plan SHALL list DOM, screenshot and accessibility evidence for the existing toolchain receipt without creating a receipt

#### Scenario: Missing or unpinned target D3 runtime

- **WHEN** the target lacks package.json or node_modules/d3, declares a version range or a mismatched version, lacks scripts.dev, or its local package is not d3, lacks select or fails to import
- **THEN** the existing toolchain probe SHALL remain blocked with the concrete cause
- **AND** it SHALL NOT install, start a service or modify the target package.json

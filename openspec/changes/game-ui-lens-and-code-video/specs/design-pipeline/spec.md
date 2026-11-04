## ADDED Requirements

### Requirement: World-branded UI and key art have an advisory review lens

The game UI guide SHALL provide review lenses for world-branded UI and key art (diegetic placement, material, depth, decorative type, focus, transition logic, input feedback). Each lens SHALL name what to look for and a good and bad sign, and SHALL name an existing check with its limit only where one measures part of it. Lenses SHALL NOT block a stage or grant acceptance, and SHALL cite their source.

#### Scenario: A reviewer applies the lens to a key visual

- **WHEN** a key visual pairs a classical scene with a modern display face and heavy ornament text
- **THEN** the decorative type lens SHALL describe the mismatch as a review finding
- **AND** no gate, finding code or stage block SHALL result from it.

#### Scenario: A lens has no measuring tool

- **WHEN** a lens such as diegetic placement has no existing measurement
- **THEN** the guide SHALL say review by eye and SHALL NOT invent a check.

#### Scenario: A tool measures only part of a lens

- **WHEN** text sits on a frosted or textured panel
- **THEN** the guide SHALL name the composition contrast check and state that it skips image grounds and ignores what shows through the blur.

### Requirement: Film guides carry the audited code-video mechanisms

The film guides SHALL describe order-independent drawing from time with a worker-split render check, optional subframe motion blur that keeps cuts on whole frames, review strips for fast moves, phone width and loop seams, and sound effects anchored by onset for hits and by peak for swells. They SHALL reuse existing commands and add no gate, and SHALL record the audit with sources, skipped items and #260 ablation candidacy.

#### Scenario: A composition keeps state between frames

- **WHEN** a ported animation increments a counter on every update
- **THEN** the guide's one-worker and several-worker PNG renders SHALL differ in frame hashes
- **AND** the guide SHALL direct the author to draw every frame from time.

#### Scenario: Motion blur meets a hard cut

- **WHEN** subframes are averaged and a cut lies between output frame times
- **THEN** the guide SHALL warn that one double-exposed frame results
- **AND** it SHALL tell the author to place cuts on whole frames.

### Requirement: Style libraries with restrictive or mixed terms are routed, not bundled

A style library whose terms forbid resale or mix licences SHALL be routed as a companion with its commit and terms recorded, and SHALL NOT be vendored or registered as a fetched bundle. Using it SHALL record the style ID in the reference notes, read only chosen entries, and SHALL NOT describe a still that does not exist.

#### Scenario: An entry has no still

- **WHEN** a chosen style entry has only text
- **THEN** the guide SHALL require stating that it is text only.

#### Scenario: Someone proposes fetching the library

- **WHEN** a change proposes adding the library to `sources fetch`
- **THEN** the recorded licence decision SHALL apply until its terms allow redistribution through an MIT package.

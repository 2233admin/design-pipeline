## ADDED Requirements

### Requirement: Release-derived npm data is regenerated from release tarballs

An npm lock entry MAY name an importer for data derived from its release. `npm run sources:update` SHALL fetch the named release tarballs with `npm pack --ignore-scripts`, pass them to that importer as data, never install or run them, and on importer failure SHALL restore the importer's outputs and leave the lock entry unchanged.

#### Scenario: A new Astryx release appears

- **WHEN** `@astryxdesign/core` has a newer release than the lock records
- **THEN** the update SHALL regenerate the bundled snapshot from the core and CLI tarballs of that release, record the release tag's commit and each tarball's integrity, and move the lock and every derived pin.

#### Scenario: The importer cannot read the release

- **WHEN** a tarball is missing, or the importer exits non-zero
- **THEN** the update SHALL report the source as failed and SHALL leave the snapshot, notices and lock as they were.

#### Scenario: An importer form is invalid

- **WHEN** an npm importer is not a `scripts/import-*.cjs` or `scripts/generate-*.cjs` script, reads no `{pack:<package>}` tarball, or asks for `{revision}` without a repository and tag
- **THEN** lock validation SHALL fail and name the entry.

## MODIFIED Requirements

### Requirement: Astryx knowledge is bundled but runtime adoption is optional

The package SHALL include an inert, MIT-attributed snapshot of the stable public Astryx surface of the locked release, built from its npm tarballs by parsing doc modules and keeping only literal data. Private, charts, lab, Vega, canary, and other non-stable package surfaces SHALL remain excluded from the default catalog.

#### Scenario: Astryx is unavailable or incompatible in a target project

- **WHEN** the local Astryx CLI is absent or React, React DOM, or StyleX constraints do not match
- **THEN** bundled search and reference use SHALL remain available
- **AND** runtime adoption SHALL remain blocked without changing the target project.

#### Scenario: A doc module holds code

- **WHEN** a doc module value is a call, function, import, await or other non-literal outside the named run-time-computed CLI topics
- **THEN** generation SHALL fail with the file and line and SHALL write no snapshot
- **AND** no statement of any doc module SHALL be executed.

#### Scenario: A lens adds nothing

- **WHEN** a `docsZh` or `docsDense` lens reads the same as the entry it overlays
- **THEN** the snapshot SHALL omit that lens and readers SHALL use the entry itself.

#### Scenario: Release packages disagree

- **WHEN** the core and CLI tarballs are different releases, swapped, or not MIT-licensed by Meta Platforms, Inc.
- **THEN** generation SHALL fail without replacing the bundled snapshot.

### Requirement: Token projection preserves provenance and loss

`design-system project-tokens` SHALL project representable provider tokens into
`design-pipeline.design-tokens.v1` and SHALL return a
`design-pipeline.design-system-token-projection.v1` artifact with explicit loss.

#### Scenario: Token semantics are not fully representable

- **WHEN** a token type, semantic role, mode, or normalized path cannot be mapped without ambiguity
- **THEN** the projection SHALL record a `review` or `blocked` loss with code, path, and message
- **AND** it SHALL NOT invent semantic certainty or report `ready` while blocking loss remains.

#### Scenario: A projected token is representable

- **WHEN** source value, type, semantic role, and modes can be represented safely
- **THEN** the projection SHALL preserve source identity, license, source hash, and representable
  mode metadata
- **AND** the emitted token artifact SHALL pass the existing token validator before `ready`.

#### Scenario: A token name states its type

- **WHEN** a token name ends in `-color`, or ends in `-style` with a CSS border-style keyword value
- **THEN** the projection SHALL type it `color` or `strokeStyle` respectively
- **AND** any other `-style` value SHALL remain a `type-unresolved` review loss.

## ADDED Requirements

### Requirement: Generated material is seeded, recorded and measured against real scans

`materials generate` SHALL write paper, halftone, ink-flat, architecture or motif material under `materials/generated/` with its generator name, version, resolved params and seed in `materials/licenses.json`; the same record SHALL replay to the same decoded pixels. Paper and ink textures SHALL record their distance to a held-out region of a real scan with the scan's natural variation; owners SHALL be able to calibrate to their own scans.

#### Scenario: Replay

- **WHEN** `materials generate --file materials/generated/<x>.png` runs on an untouched generated file
- **THEN** it SHALL compare the regenerated and on-disk decoded RGBA (SVG: text) and report `reproduced` and exit 0, also when the PNG's deflate bytes differ, and SHALL report `differs` with a fix and exit 2 when the file was edited

#### Scenario: Seed is part of the record

- **WHEN** a generated record lacks its seed, version, name or params
- **THEN** `materials check` SHALL report `material-generator-incomplete` and exit 2

#### Scenario: Distance to a real scan

- **WHEN** paper is generated from a built-in profile
- **THEN** the record SHALL hold `similarity` with the metric value, the profile's natural variation and a level, and the profile SHALL name its scan's source, licence, hash and px/mm evidence

#### Scenario: Grading needs separating yardsticks

- **WHEN** a profile's natural spread is not below 0.8 × its distance to the nearest other real sample on the spectral or histogram metric, or a halftone profile has no second sample
- **THEN** a texture judged against it SHALL be `not-calibrated` with the reason unless it is farther than both yardsticks, and a calibrated profile SHALL grade by the worse of `spectralDb` and `histogramL`

#### Scenario: Noise is not material

- **WHEN** white noise (±4 grey) or a flat field is measured against any built-in profile
- **THEN** the level SHALL be `unlike-reference`, and a halftone measurement without a 2-D screen peak SHALL report `screen: false` and `unlike-reference`

#### Scenario: Calibration lineage

- **WHEN** a built-in profile entry or a project profile that a generated or processed file was made or graded from (profile, paper, grain or `--reference`) changes
- **THEN** `materials check` SHALL report `material-calibration-stale` with a re-run command naming `--project-root`; a profile id outside `^[a-z0-9-]+$` SHALL be refused with `OPTION_VALUE_INVALID`

#### Scenario: Unlike paper

- **WHEN** `materials measure --reference <profile>` measures a texture whose band spectrum is farther from the held-out scan than two different real papers are
- **THEN** it SHALL report `unlike-reference` and exit 2, and a result with no flag SHALL still state `creativeAcceptance: not-assessed`

#### Scenario: Owner calibration

- **WHEN** a recorded scan is measured with `--name <id>` and `params.pxPerMm`
- **THEN** `materials/calibration/<id>.json` SHALL be written with fit and held-out halves, generation SHALL accept `profile: <id>`, and editing that profile SHALL make every generated or processed file that used it `material-calibration-stale`

#### Scenario: Calibration refused

- **WHEN** `--name` targets an unrecorded scan, omits px/mm, or reuses a built-in profile id
- **THEN** measure SHALL fail with `LICENSE_UNRECORDED`, `OPTION_REQUIRED` or `OUTPUT_EXISTS` and write nothing

#### Scenario: Native-resolution region

- **WHEN** `materials fetch` gets `params.region` for a IIIF source
- **THEN** the region SHALL be downloaded unscaled and recorded; a source without IIIF SHALL refuse with a fix

### Requirement: Print-style processing keeps lineage to its source

`materials process` SHALL turn a recorded PNG into woodcut, halftone, papercut, photocopy or duotone output under `materials/processed/`, deterministic for its seed, inheriting the source's licence and recording `derivedFrom` with operation, effect, version, seed and params. A source that changed SHALL make the output stale with the exact re-run command.

#### Scenario: Unrecorded source

- **WHEN** the input has no licence record or the effect is unknown
- **THEN** process SHALL fail with `LICENSE_UNRECORDED` or `OPTION_VALUE_INVALID` and write nothing

#### Scenario: Stale processed file

- **WHEN** the source of a processed file is replaced and re-recorded
- **THEN** `materials check` SHALL report `material-derived-stale` whose fix is `materials process` with the recorded effect, seed and params and `--replace`

#### Scenario: Papercut keeps small details

- **WHEN** a mostly black shape with small red and white spots is papercut
- **THEN** the dominant colour SHALL be the base sheet and the spots SHALL be separate textured sheets with shadows, transparent outside the silhouette and its shadow

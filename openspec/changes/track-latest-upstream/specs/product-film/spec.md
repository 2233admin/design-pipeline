## MODIFIED Requirements

### Requirement: film scaffold pins the reviewed runtime
`film scaffold` SHALL write a `package.json` pinning the `hyperframes` and `gsap` releases that
`sources.lock.json` records and SHALL load GSAP from the local install, so that after one install the
composition renders and is captured without network access. HyperFrames preview and catalog calls
SHALL default to that release.

#### Scenario: Fresh film project
- **WHEN** a film project is scaffolded into an empty directory
- **THEN** `package.json` SHALL pin the locked `hyperframes` and `gsap` versions (while #262 holds HyperFrames, 0.8.137), the composition SHALL load no remote script, and the guide SHALL use `npx --no-install hyperframes`

#### Scenario: Existing package.json
- **WHEN** the target already has a `package.json`
- **THEN** scaffolding SHALL refuse without an explicit replace flag, and with it SHALL keep the existing fields and only set the pins and missing scripts

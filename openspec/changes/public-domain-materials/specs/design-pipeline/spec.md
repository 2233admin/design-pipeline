## ADDED Requirements

### Requirement: Public-domain materials carry measured source reachability and recorded provenance

The skill SHALL list public-domain/CC0 image sources with query route, licence field and dated measured reachability. `materials fetch` SHALL download only records whose own licence field is CC0 or public domain and SHALL write source, object id, title, author, page and file URL, licence evidence, retrieval date and hash into `materials/licenses.json`, the film-edit record shape. Blocked sources SHALL be reported with a fix, not bypassed.

#### Scenario: Open object is fetched with provenance

- **WHEN** `materials fetch --source cleveland --id <id>` targets an object whose `share_license_status` is CC0
- **THEN** a PNG no larger than `--width` on its long side SHALL be written under `materials/raw/` and its record SHALL carry licence, source, sourceUrl, author, retrieved, fileUrl and sha256

#### Scenario: Non-open licence is refused

- **WHEN** a Met object has `isPublicDomain` false or a Commons file is CC BY-SA
- **THEN** fetch SHALL return `refused` with the licence evidence, write no file and exit 2

#### Scenario: Look-alike or restricted licence

- **WHEN** a Commons file's licence is "Not public domain" or `PD-textlogo`, a Rijksmuseum rights text only mentions a public-domain URL, or a Commons file lists Restrictions such as trademarked
- **THEN** fetch SHALL refuse it with the evidence (and the restriction), and SHALL never record `commercialUse: true` for it

#### Scenario: Blocked or keyed source

- **WHEN** fetch or search targets NYPL, BHL, Smithsonian or a source answering 429 or a bot challenge
- **THEN** the result SHALL name the measured status and the fix (owner download plus `materials add`) and SHALL not retry around it

#### Scenario: Reachability drift

- **WHEN** `materials probe` measures a status other than the registry's recorded one
- **THEN** it SHALL report the source as drift with the HTTP evidence and exit 2

#### Scenario: Offline environment

- **WHEN** no probed route answers at the network level, or `--source` names an unknown source
- **THEN** probe SHALL exit 1 as an environment or usage error and SHALL not suggest editing the registry

#### Scenario: Challenge page with 200

- **WHEN** search or fetch receives an HTML bot-challenge page with status 200
- **THEN** the source SHALL be reported `blocked` and the command SHALL exit 2, not fail on JSON parsing

#### Scenario: Owner-supplied material

- **WHEN** an owner's font, scan or photo inside `materials/` is registered with `materials add --license --by`
- **THEN** it SHALL be recorded in the same file, with `commercialUse` true only for an open licence or an explicit `--commercial-use`, and a file outside `materials/` SHALL be rejected

### Requirement: Collage cutting flags dirty mattes and keeps lineage to its source

`materials cut` SHALL cut a recorded PNG into cut-outs, paper-edge stickers, ink layers or hand-cut plates through the art-motion assets helper. It SHALL flag likely dirty mattes with a fix, record each piece with the source's licence and hash, and `materials check` SHALL fail unrecorded files, incomplete provenance and pieces whose source changed or is gone.

#### Scenario: Gradient backdrop

- **WHEN** an object on a studio gradient is cut with `--mode border`
- **THEN** the result SHALL include `matte-uneven-background` whose fix names `--mode paper`, and the same image cut with `--mode paper` SHALL separate the object without that finding

#### Scenario: Dropped part and cast shadow

- **WHEN** a second wing as large as the kept piece is discarded by `keep`, or a soft grey shadow is cut with the object in `border` mode
- **THEN** the result SHALL include `matte-dropped-component` naming the `keep` to use, or `matte-cast-shadow` whose fix names `--mode paper`

#### Scenario: Stale piece

- **WHEN** a raw source is replaced after its pieces were cut
- **THEN** `materials check` SHALL report `material-derived-stale` for each piece with the re-cut command, and `materials cut` without re-recording SHALL fail with `SOURCE_CHANGED`

#### Scenario: Unrecorded file

- **WHEN** a file under `materials/` has no licence record
- **THEN** `materials check` SHALL report `material-unrecorded` with the `materials add` command and exit 2

#### Scenario: Not visual acceptance

- **WHEN** a cut reports no findings
- **THEN** the result SHALL still state `creativeAcceptance: not-assessed`

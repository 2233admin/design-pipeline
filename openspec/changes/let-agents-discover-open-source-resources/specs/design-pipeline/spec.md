## MODIFIED Requirements

### Requirement: Web build follows an explicit component source decision

Every quick, standard and full web workflow in brief, freeform and replicate modes SHALL ask components immediately before build. Decide SHALL require explicit comma-separated choices from project, github, index, discover and scratch, preserving the answer and storing a canonical deduplicated componentSources set. Scratch SHALL be exclusive; github SHALL require an HTTPS GitHub owner/repo URL in the answer. The recommendation SHALL prefer project components, then the index, then discovery.

#### Scenario: Next reaches a build boundary

- **WHEN** earlier prerequisites are complete and no components decision is recorded
- **THEN** next SHALL return the components ask before build
- **AND** its decide command SHALL bind the absolute project path and work outside that directory.

#### Scenario: Decide validates and records explicit sources

- **WHEN** decide uses `--stage components --choice index,project,index --answer "<the owner's reply>"`
- **THEN** decisions.componentSources SHALL be `["project","index"]` and decisions.components SHALL preserve the answer unchanged
- **AND** canonical ordering SHALL be project, github, index, discover, scratch, restricted to selected choices.
- **AND** missing or unknown choices, scratch combined with another choice (discover included), or github without an HTTPS GitHub owner/repo URL in the answer SHALL be rejected
- **AND** a components decision on a film, edit or ui workflow SHALL be rejected before any state or evidence changes.

#### Scenario: The owner lets the agent discover sources

- **WHEN** next asks components
- **THEN** the ask SHALL offer letting the agent find maintained open-source libraries, packages and icon sets beyond the index, and SHALL recommend `project,index,discover`
- **AND** decide with `--choice discover,index,project` SHALL store `["project","index","discover"]` without requiring a URL in the answer.

#### Scenario: Legacy answer-only decision reaches build

- **WHEN** a web state has a components answer but no explicit componentSources set
- **THEN** next SHALL ask components again rather than infer sources from the answer.

#### Scenario: Build follows a recorded reply

- **WHEN** decide records the owner's components reply with a valid explicit `--choice` set
- **THEN** the build instruction SHALL follow that reply and explicitly name references/component-source-catalog.json
- **AND** index discovery SHALL use design-system route and design-system search with the page brief and platform web
- **AND** the instruction SHALL require component-manifest.json before index.html
- **AND** it SHALL search the index first, route font choice through tools/fonts.md without silently defaulting to the system stack, and keep discovered code and fonts bundled or self-hosted inside the project with their notices, with no CDN scripts or remote fonts at runtime.

#### Scenario: Build guidance with discover selected

- **WHEN** the recorded componentSources include discover
- **THEN** the build instruction SHALL tell the agent, when nothing indexed fits, to find maintained open-source component libraries, packages or icon sets, check each license at a pinned revision, record the manifest entry before use and prefer genuine reuse over hand-writing
- **AND** without discover the instruction SHALL NOT offer discovery beyond the selected sources.

#### Scenario: Changed decision invalidates checked evidence

- **WHEN** a different components answer or source set is recorded after interaction, review or delivery evidence exists, or a first explicit decision is recorded on a legacy state that already holds such evidence
- **THEN** the interaction pass and delivery SHALL be invalidated and next SHALL return to the probe or review boundary
- **AND** recorded review verdicts SHALL stay unchanged but SHALL NOT complete review for the new decision
- **AND** re-recording an identical decision SHALL leave the evidence intact
- **AND** adding or removing discover SHALL count as a different source set.

### Requirement: Component provenance is an existing build completion condition

Web build SHALL require index.html and a valid component-manifest.json. Sources SHALL resolve to indexed records, decision-named GitHub repositories, discovered https sources or project files in a recorded componentSources category. Usage SHALL identify contained files and real markers; indexed license states SHALL match. Scratch SHALL require fromScratch true and only project-owned or font entries. Nonscratch SHALL forbid fromScratch true and require a non-font entry. It SHALL NOT add a gate.

#### Scenario: HTML exists without valid provenance

- **WHEN** index.html exists but the manifest is absent, malformed or lacks required entry fields
- **THEN** build SHALL remain unfinished
- **AND** its instruction SHALL include the validator message and its existing finding SHALL use code `CONTRACT_INVALID`, severity `error`, that validator message as message, and remediation as fix.

#### Scenario: Scratch implementation is explicitly chosen

- **WHEN** decide records `--stage components --choice scratch --answer "从零写"` and index.html plus a manifest with `fromScratch: true` and an empty entries array exist
- **THEN** the component provenance completion condition SHALL be satisfied
- **AND** technical completion SHALL NOT grant Component Conformance or Visual Acceptance
- **AND** scratch manifests MAY instead contain only project-owned or font entries satisfying the existing per-entry rules; missing fromScratch true or external component entries, discovered ones included, SHALL keep build unfinished.

#### Scenario: Reuse or discovery is chosen without manifest entries

- **WHEN** the explicit componentSources set selects project, github, index or discover and the manifest has no entries, only font entries, or has `fromScratch: true`
- **THEN** build SHALL remain unfinished regardless of the answer's wording.

#### Scenario: Fabricated provenance or usage is supplied

- **WHEN** a source cannot resolve, an indexed license state differs, a usage file is missing or outside the project, or its marker does not appear in that file
- **THEN** build SHALL remain unfinished.

#### Scenario: An entry substitutes an unselected source category

- **WHEN** a nonscratch component entry is a contained project file or the project-owned indexed record without project selected, a decision-named GitHub URL without github, a discovered https source without discover, or any other indexed sourceId, platform records included, without index
- **THEN** build SHALL remain unfinished and the validator message SHALL name the entry, its category and the recorded componentSources set
- **AND** a named GitHub library under a github-only set SHALL be cited by url, not by its indexed sourceId
- **AND** font entries SHALL need no source category
- **AND** scratch manifests SHALL keep their existing rules.

#### Scenario: License handling is recorded for real adoption

- **WHEN** a verified source is imported or copied
- **THEN** usedIn.how SHALL record attribution or license-notice handling
- **AND** unverified or commercial sources SHALL NOT be copied or adopted without entitlement.

## ADDED Requirements

### Requirement: Discovered sources and fonts carry pinned license provenance

An entry citing by url an https source that is neither a decision-named GitHub repository nor an indexed source SHALL be a discovered source needing revision, an SPDX license.id and https license.evidence, with license.state verified, unverified or commercial. A font entry SHALL need the same unless it cites an indexed or project-owned source. Copying, importing or serving either SHALL require a verified permissive license; anything else SHALL be study or reimplementation only.

#### Scenario: A discovered source records pinned provenance

- **WHEN** discover is selected and an entry cites a GitHub repository, npm package page or official project page that is neither decision-named nor indexed, with revision, license.id and https license.evidence
- **THEN** the entry SHALL satisfy its source rules and build SHALL complete once every other rule holds
- **AND** unverified or commercial discovered sources SHALL be accepted only for study or reimplementation.

#### Scenario: Discovered provenance is incomplete

- **WHEN** a discovered entry lacks revision, license.id or a non-empty array of https license.evidence URLs, cites a non-https URL or one with credentials, or claims license.state project-owned or platform
- **THEN** build SHALL remain unfinished with a validator message naming the entry and the missing or invalid field.

#### Scenario: A discovered source is copied without a permissive license

- **WHEN** usage copies or imports a discovered source whose license.state is not verified or whose license.id is not one of MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0 or OFL-1.1, matched case-insensitively
- **THEN** build SHALL remain unfinished
- **AND** such a source SHALL permit only study or reimplementation, and compound expressions such as `MIT OR Apache-2.0` SHALL NOT count as permissive
- **AND** verified permissive copies and imports SHALL still record attribution or license-notice handling.

#### Scenario: A URL matches an indexed source

- **WHEN** an entry cites by url an indexed source's GitHub repository, a deep link into it, or a URL at or below one of its recorded homepages, and the decision does not name that repository
- **THEN** the entry SHALL NOT be a discovered source and build SHALL remain unfinished with a message to cite the indexed sourceId
- **AND** a decision-named repository URL SHALL keep the github rule and indexed license-state agreement
- **AND** a deep link inside a decision-named repository SHALL be rejected in favour of that repository's URL.

#### Scenario: A font is recorded

- **WHEN** a `kind: "font"` entry with pinned provenance uses its font-family name in the loading or using file as the marker
- **THEN** it SHALL be accepted without its category in componentSources and under scratch
- **AND** a font citing an indexed source or a project-owned font file SHALL need no additional provenance
- **AND** a page serving a pinned font's files copies it, so a pinned font without a verified permissive license SHALL be accepted only for study, and a served one SHALL record notice handling
- **AND** a kind other than component, library, icon or font SHALL be rejected.

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
- **THEN** the ask SHALL offer letting the agent find maintained open-source component libraries and icon sets on GitHub beyond the index, and SHALL recommend `project,index,discover`
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
- **THEN** the build instruction SHALL tell the agent, when nothing indexed fits, to find maintained open-source component libraries or icon sets on GitHub, check each license at a pinned revision, record the manifest entry before use and prefer genuine reuse over hand-writing
- **AND** without discover the instruction SHALL NOT offer discovery beyond the selected sources.

#### Scenario: Changed decision invalidates checked evidence

- **WHEN** a different components answer or source set is recorded after interaction, review or delivery evidence exists, or a first explicit decision is recorded on a legacy state that already holds such evidence
- **THEN** the interaction pass and delivery SHALL be invalidated and next SHALL return to the probe or review boundary
- **AND** recorded review verdicts SHALL stay unchanged but SHALL NOT complete review for the new decision
- **AND** re-recording an identical decision SHALL leave the evidence intact
- **AND** adding or removing discover SHALL count as a different source set.

### Requirement: Component provenance is an existing build completion condition

Web build SHALL require index.html and a valid component-manifest.json. Sources SHALL resolve to indexed records, decision-named GitHub repositories, discovered GitHub repositories or project files in a recorded componentSources category. Usage SHALL identify contained files and real markers; indexed license states SHALL match. Scratch SHALL require fromScratch true and only project-owned entries, if any. Nonscratch SHALL forbid fromScratch true and require entries. This SHALL NOT introduce a new gate.

#### Scenario: HTML exists without valid provenance

- **WHEN** index.html exists but the manifest is absent, malformed or lacks required entry fields
- **THEN** build SHALL remain unfinished
- **AND** its instruction SHALL include the validator message and its existing finding SHALL use code `CONTRACT_INVALID`, severity `error`, that validator message as message, and remediation as fix.

#### Scenario: Scratch implementation is explicitly chosen

- **WHEN** decide records `--stage components --choice scratch --answer "从零写"` and index.html plus a manifest with `fromScratch: true` and an empty entries array exist
- **THEN** the component provenance completion condition SHALL be satisfied
- **AND** technical completion SHALL NOT grant Component Conformance or Visual Acceptance
- **AND** scratch manifests MAY instead contain only project-owned entries satisfying the existing per-entry rules; missing fromScratch true or external-source entries, discovered ones included, SHALL keep build unfinished.

#### Scenario: Reuse or discovery is chosen without manifest entries

- **WHEN** the explicit componentSources set selects project, github, index or discover and the manifest has no entries or has `fromScratch: true`
- **THEN** build SHALL remain unfinished regardless of the answer's wording.

#### Scenario: Fabricated provenance or usage is supplied

- **WHEN** a source cannot resolve, an indexed license state differs, a usage file is missing or outside the project, or its marker does not appear in that file
- **THEN** build SHALL remain unfinished.

#### Scenario: An entry substitutes an unselected source category

- **WHEN** a nonscratch entry is a contained project file or the project-owned indexed record without project selected, a decision-named GitHub URL without github, a discovered GitHub repository URL without discover, or any other indexed sourceId, platform records included, without index
- **THEN** build SHALL remain unfinished and the validator message SHALL name the entry, its category and the recorded componentSources set
- **AND** a named GitHub library under a github-only set SHALL be cited by url, not by its indexed sourceId
- **AND** scratch manifests SHALL keep their existing rules.

#### Scenario: License handling is recorded for real adoption

- **WHEN** a verified source is imported or copied
- **THEN** usedIn.how SHALL record attribution or license-notice handling
- **AND** unverified or commercial sources SHALL NOT be copied or adopted without entitlement
- **AND** a usedIn.how that bundles, vendors, self-hosts or downloads a source SHALL count as copying it.

## ADDED Requirements

### Requirement: Discovered GitHub sources carry pinned license provenance

An entry citing by url `https://github.com/<owner>/<repo>` that is neither decision-named nor indexed SHALL be a discovered source needing a revision and https license.evidence on that repository at the revision. Copying or importing it SHALL require license.state verified, a permissive license.id and a contained, non-empty license.file; otherwise it SHALL be study or reimplementation only. The validator SHALL check this shape offline and SHALL NOT authenticate the upstream.

#### Scenario: A discovered source records pinned provenance

- **WHEN** discover is selected and an entry cites a GitHub repository URL that is neither decision-named nor indexed, with a revision (commit SHA or tag), an SPDX license.id and https license.evidence including `https://github.com/<owner>/<repo>/blob/<revision>/LICENSE`
- **THEN** the entry SHALL satisfy its source rules and build SHALL complete once every other rule holds
- **AND** unverified or commercial discovered sources SHALL be accepted only for study or reimplementation
- **AND** a study-only discovered entry MAY omit license.id
- **AND** the validator SHALL NOT fetch the evidence or check that the repository, revision or license exists upstream.

#### Scenario: A discovered url is not a GitHub repository URL

- **WHEN** an entry cites by url an npm package page, an official project page, another host, a non-https URL, a URL with credentials, a GitHub owner page, a GitHub page that is not a repository (such as `https://github.com/topics/<name>`, `orgs`, `sponsors` or `marketplace`) or a deep link inside a GitHub repository that is neither decision-named nor indexed
- **THEN** build SHALL remain unfinished with a validator message that the url must be a GitHub repository URL `https://github.com/<owner>/<repo>` or a project file.

#### Scenario: Discovered provenance is incomplete

- **WHEN** a discovered entry lacks revision or a non-empty array of https license.evidence URLs, pins the moving ref HEAD, main or master, gives an empty license.id, claims license.state project-owned or platform, or claims availability project-owned
- **THEN** build SHALL remain unfinished with a validator message naming the entry and the missing or invalid field.

#### Scenario: License evidence does not cover the pinned revision

- **WHEN** no license.evidence URL of a discovered entry lies on its GitHub repository with the revision as the ref segment right after `blob`, `tree`, `raw`, `commit`, `releases/tag` or `archive`, for example evidence only on a default branch, another repository, another host, a different revision that merely starts with the same characters, a revision that appears only as another path segment (such as `LICENSE` or `blob`), or a revision hidden inside an encoded slash of one segment
- **THEN** build SHALL remain unfinished with a validator message naming the repository and the revision.

#### Scenario: A discovered source is copied without a permissive license kept in the project

- **WHEN** usage copies or imports a discovered source whose license.state is not verified, whose license.id is not one of MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense or CC0-1.0 (matched case-insensitively), or that has no license.file
- **THEN** build SHALL remain unfinished
- **AND** such a source SHALL permit only study or reimplementation, and compound expressions such as `MIT OR Apache-2.0` SHALL NOT count as permissive
- **AND** verified permissive copies and imports SHALL still record attribution or license-notice handling
- **AND** a discovered entry with availability `bundled-implementation` SHALL count as copied whatever its usedIn.how says.

#### Scenario: The license file is missing, empty or outside the project

- **WHEN** a discovered entry's license.file does not name a project file, does not exist, is a directory, resolves outside the project, or holds only whitespace
- **THEN** build SHALL remain unfinished with a validator message naming the entry's license.file
- **AND** the validator SHALL NOT read the file to recognise license text.

#### Scenario: A complete copied discovered entry

- **WHEN** a discovered entry with verified MIT license, revision, repository license evidence at that revision and a non-empty contained license.file is copied with notice handling recorded in usedIn.how
- **THEN** build SHALL complete once every other rule holds.

#### Scenario: A URL matches an indexed source

- **WHEN** an entry cites by url an indexed source's GitHub repository or a deep link into it, and the decision does not name that repository
- **THEN** the entry SHALL NOT be a discovered source and build SHALL remain unfinished with a message to cite the indexed sourceId
- **AND** a decision-named repository URL SHALL keep the github rule and indexed license-state agreement
- **AND** a deep link inside a decision-named repository SHALL be rejected in favour of that repository's URL.

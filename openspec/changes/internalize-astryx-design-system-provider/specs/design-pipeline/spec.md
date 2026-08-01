## ADDED Requirements

### Requirement: Design-system snapshots normalize as inert data

The pipeline SHALL accept `design-pipeline.design-system-snapshot.v1` artifacts and normalize them
into deterministic `design-pipeline.design-system-catalog.v1` artifacts without executing snapshot
content or mutating the input.

#### Scenario: The same supplied snapshot is normalized twice

- **WHEN** the same valid snapshot is normalized twice
- **THEN** both catalogs SHALL have the same canonical ordering, namespaced IDs, provenance, entry
  hashes, and serialized content
- **AND** the source snapshot SHALL remain unchanged.

#### Scenario: Snapshot content is unsafe

- **WHEN** a snapshot contains an unknown schema, executable value, cycle, prototype-pollution key,
  absolute path, parent traversal, duplicate namespaced ID, or invalid provenance
- **THEN** normalization SHALL fail closed
- **AND** no catalog SHALL be published.

### Requirement: Catalog search is pure and provider-neutral

`design-system search` SHALL filter a validated catalog by query, kind, category, and status without
mutating, executing, installing, or re-ranking entries by bundled-provider identity.

#### Scenario: An Agent searches a supplied catalog

- **WHEN** the Agent supplies a valid catalog and any supported search filters
- **THEN** the command SHALL return deterministic matching entries
- **AND** it SHALL NOT contact a provider, modify the catalog, or copy results into the UI pattern
  catalog.

### Requirement: Provider acquisition is explicit and locally bounded

`design-system acquire` SHALL invoke only the bundled read-only provider translator over an explicit
contained provider CLI path, or a caller-selected local adapter within the explicit working root,
through a supported provider profile/API version, and SHALL publish results only below the explicit
output root.

#### Scenario: The bundled Astryx translator is selected

- **WHEN** the caller supplies `--provider astryx`, an existing root-contained
  `--provider-cli-path`, a supported `--api-version`, and a contained `--output-root`
- **THEN** the bundled adapter SHALL translate only read-only manifest, component, docs, template,
  and hook JSON commands from the local Astryx CLI
- **AND** it SHALL validate provider identity, license, versioned JSON envelopes, content hashes,
  losses, and failures in a provider receipt.

#### Scenario: A reviewed custom adapter is supplied

- **WHEN** the caller supplies a root-contained `--adapter-path` instead of the bundled translator
- **THEN** the custom adapter SHALL be subject to the same command allowlist, envelope validation,
  timeout, output, provenance, and containment gates.

#### Scenario: Acquisition is not explicitly authorized

- **WHEN** neither a usable contained provider CLI path nor a custom local adapter is supplied, a
  path escapes the working root, the API version is unknown, the command is mutating, or canary is
  not explicitly allowed
- **THEN** acquisition SHALL fail closed
- **AND** it SHALL NOT discover an ambient executable, install a package, fetch a remote resource,
  or publish a partial successful snapshot.

#### Scenario: Provider documentation contains executable modules

- **WHEN** Astryx or another provider exposes `.doc.mjs`, integration, template, hook, codemod, or
  other executable modules
- **THEN** the Design Pipeline kernel SHALL treat them as non-executable provider content
- **AND** it SHALL NOT import or evaluate them to build the catalog.

### Requirement: Astryx is an optional attributed candidate profile

The built-in Astryx profile SHALL record official source identity, repository, MIT license,
supported provider API, compatibility constraints, and deny-by-default canary policy, but SHALL NOT
make Astryx a dependency or default project runtime.

#### Scenario: Astryx is absent

- **WHEN** Astryx is not installed or a local adapter is unavailable
- **THEN** `design-system profiles` SHALL still expose the candidate metadata
- **AND** the pinned inert snapshot, supplied-snapshot, requirements-only, project-owned, and custom
  workflows SHALL remain available
- **AND** the pinned snapshot SHALL NOT be described as a live view of local or upstream state.

#### Scenario: Profile license conflicts with adapter output

- **WHEN** an adapter reports a license or provider identity that conflicts with the selected
  profile
- **THEN** acquisition SHALL fail
- **AND** the output SHALL NOT be eligible for adoption.

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

### Requirement: Runtime use is an explicit four-mode decision

`design-system decide` SHALL record exactly one of `reference`, `adopt`, `substitute`, or `custom`
in `design-pipeline.design-system-decision.v1` with selected, rejected, rationale, and evidence
fields.

#### Scenario: A project already owns a design system

- **WHEN** the project has an existing design system or an authoritative `DESIGN.md` decision
- **THEN** the project-owned system SHALL remain the governing project authority
- **AND** `reference` MAY select provider evidence alongside that authority
- **AND** `adopt` or `substitute` MAY select a candidate only when the mode is explicit and all
  compatibility, intake, status, canary, and provenance gates pass.

#### Scenario: Adoption is requested

- **WHEN** `adopt` is requested
- **THEN** the candidate SHALL require compatible project runtime constraints and admissible intake
  evidence
- **AND** an incompatible, unverified, or unapproved-canary candidate SHALL be rejected with
  evidence.

#### Scenario: No candidate is eligible

- **WHEN** no candidate satisfies the selected mode, status, compatibility, intake, and canary
  constraints
- **THEN** the decision SHALL be `blocked`
- **AND** it SHALL NOT silently select Astryx or downgrade the requested mode.

### Requirement: Project design and motion foundations remain authoritative

Provider snapshots, catalogs, token projections, decisions, and benchmark results SHALL be
attributed evidence and SHALL NOT overwrite or supersede validated project `DESIGN.md` or
`MOTION.md`.

#### Scenario: Provider guidance conflicts with a project foundation

- **WHEN** provider docs, templates, tokens, or examples conflict with a validated project
  foundation
- **THEN** the project foundation SHALL remain authoritative
- **AND** the conflict SHALL be rejected, substituted, or recorded for review rather than applied
  implicitly.

### Requirement: The design-system CLI is Agent-discoverable and write-explicit

The public CLI help SHALL expose
`design-system profiles|normalize|acquire|search|project-tokens|decide` with stable JSON
envelopes, exit semantics, and the documented flag surface.

#### Scenario: A transform command omits write authority

- **WHEN** normalize, token projection, or decision receives `--output` without `--write`
- **THEN** the command SHALL return the validated artifact without writing it
- **AND** no existing file SHALL be modified.

#### Scenario: A write is explicit

- **WHEN** `--write` and a contained output path are both supplied
- **THEN** the command MAY publish the validated artifact atomically
- **AND** an escaping path or unsafe parent SHALL fail before replacement.

### Requirement: Benchmark v2 enforces candidate-neutral fairness

`benchmark evaluate` SHALL accept v1 inputs for compatibility and SHALL admit a v2 manifest only
when it affirms same prompts, same environment class, evaluator blindness, hidden expected answers,
fresh context, and representative delivery.

#### Scenario: All candidates receive equivalent evaluation

- **WHEN** Astryx, another provider, a substitute, and a custom system are compared
- **THEN** the same required scenarios, thresholds, evidence rules, environment class, and evaluator
  SHALL apply to every candidate
- **AND** bundled-profile identity SHALL NOT add score or admission privilege.

#### Scenario: Fairness is invalid

- **WHEN** any required v2 fairness condition is false, missing, or contradicted by evidence
- **THEN** evaluation SHALL NOT report `passed`
- **AND** the result SHALL preserve fairness validation and invalid reasons.

#### Scenario: Aggregate score hides a required failure

- **WHEN** an aggregate score passes but a required scenario fails or lacks evidence
- **THEN** the benchmark SHALL remain `failed` or `blocked` respectively
- **AND** canary results SHALL not be mixed into stable admission without explicit allowance.

### Requirement: Provider provenance and licenses remain auditable

Snapshots, catalog entries, provider receipts, token projections, and decisions SHALL preserve the
available source, provider version, license, attribution, and content-hash evidence needed to audit
their origin.

#### Scenario: Attribution is incomplete

- **WHEN** required source or license provenance is missing, conflicting, or unverifiable
- **THEN** normalization or acquisition SHALL fail, or the candidate SHALL remain ineligible for
  adoption
- **AND** a built-in profile SHALL NOT be treated as a license grant for unrelated third-party
  content.

### Requirement: Provider data cannot gain global instruction authority

The design-system workflow SHALL NOT inject provider content into `AGENTS.md` or another global
Agent instruction file.

#### Scenario: Provider content suggests instruction installation

- **WHEN** a provider manifest, document, template, hook, or adapter output requests instruction
  injection
- **THEN** the request SHALL be ignored or rejected
- **AND** provider discovery SHALL remain limited to the public CLI help and profile output.

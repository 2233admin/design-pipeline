## ADDED Requirements

### Requirement: Built-in offline explanation helper

The skill SHALL provide a task-triggered Node-only helper that renders explicit Markdown into a fresh caller-owned offline explanation directory using the reviewed local renderer. It SHALL default to doc/paper, support the documented diagram and manual-feedback components, and require neither companion installation nor workflow initialization.

#### Scenario: Readable local explanation

- **WHEN** a caller supplies a Chinese Markdown draft with a table, flow diagram, code and ask prompt
- **THEN** the helper produces a single-file `index.html` and redistribution notices, reports actual rendering statistics, and the default document fits a narrow viewport without whole-page horizontal overflow
- **AND** installed-skill invocation from another directory needs only supported Node and local packaged resources

#### Scenario: Explicit board layout

- **WHEN** the caller explicitly selects sheet and blueprint
- **THEN** the helper uses that board layout and reports it without claiming narrow-screen suitability or visual acceptance

### Requirement: Explanation content and resource isolation

The helper SHALL reject raw active markup and automatic remote resources, allow only documented safe hyperlinks and raster image/file includes inside the authorized real asset directory, and preserve pasted code literally. Generation SHALL not read ambient configuration, create home state, check updates, open browsers or invoke video/deployment commands.

#### Scenario: Local authorized image and code

- **WHEN** a draft includes supported raster images or code files that resolve inside its authorized asset directory
- **THEN** the output embeds them for offline use while retaining upstream secret-file restrictions

#### Scenario: Rejected executable or remote input

- **WHEN** a draft supplies raw HTML/SVG, an unsafe URL scheme or a remote automatic image/resource
- **THEN** generation fails with an actionable error and creates no successful output
- **AND** code fences displaying those strings remain literal examples

#### Scenario: Rejected escaped filesystem include

- **WHEN** an included file resolves outside the authorized asset directory, including through a symlink
- **THEN** the helper refuses it before rendering or publishing output

### Requirement: Explanation output disclosure and publication

The helper SHALL refuse existing output and output overlapping packaged source/helper resources, publish only a complete rendered artifact, and include required notices. The guide and result SHALL disclose that the original draft and included content are embedded. The generated page SHALL constrain runtime and automatic resource loading with an offline CSP.

#### Scenario: Existing output remains intact

- **WHEN** output is an existing file, directory or symbolic-link alias
- **THEN** generation fails without replacing or changing it

#### Scenario: Missing or invalid resource

- **WHEN** input, renderer, required notices or included assets are missing or invalid
- **THEN** the helper fails without a caller-visible partial success

#### Scenario: Shared page includes source

- **WHEN** a caller shares the generated explanation
- **THEN** the source-copy feature can expose the original Markdown and included content
- **AND** the guide explicitly warns that the artifact is not a redacted public report

### Requirement: Manual explanation feedback retains its authority

Explanation comments and choices SHALL remain ordinary manually copied feedback. The page SHALL distinguish untouched recommended choices from answered choices and preserve quoted reader input. It SHALL not record user acceptance, modify pipeline state or emit runtime-review feedback/receipts.

#### Scenario: Comment and unanswered recommendation

- **WHEN** a reader enters a comment and opens the reply summary without answering an ask prompt
- **THEN** the summary includes the exact comment and identifies the recommended option as unanswered
- **AND** no task, acceptance or receipt state changes

#### Scenario: Clipboard unavailable

- **WHEN** the reader cannot write the system clipboard
- **THEN** complete reply text remains visible and selectable for manual copy-back

### Requirement: Reviewed explanation source provenance

The built-in renderer SHALL retain an immutable reviewed upstream snapshot, original license, exact dependency/font notices and reproducible pinned build inputs. Maintained glue and generated runtime SHALL remain separate from original source. Existing source integrity, capability metadata, package resources and QA routes SHALL cover the additions.

#### Scenario: Locked source or runtime changes

- **WHEN** a preserved source, required notice or generated renderer differs from its recorded provenance
- **THEN** the focused source checks fail rather than refreshing evidence from arbitrary changed bytes

#### Scenario: Existing workflow remains authoritative

- **WHEN** an explanation is used to support a design task
- **THEN** existing `next`/`decide`, gates, target/receipt lineage, runtime-review identities and film routes remain unchanged
- **AND** rendering does not establish Component Conformance or Visual Acceptance

## ADDED Requirements

### Requirement: Active design capability discovery
During planning, production or rendered review, the agent SHALL identify unmet visual goals and actively investigate missing methods. It SHALL reuse adequate project/local capabilities, otherwise inspect relevant upstream implementations, test a bounded study and integrate the useful part under existing adoption contracts. The user need not name a repository.

#### Scenario: Local capabilities cannot meet the visible goal
- **WHEN** an observed or specified design need is not adequately supported by the current project and bundled methods
- **THEN** the agent searches relevant primary documentation and GitHub source beyond the local catalogue, checks the chosen revision and makes a task-specific study before adoption
- **AND** actual output and relevant playback are reviewed against the goal rather than treating source discovery or package import as visual success

#### Scenario: Existing methods already fit
- **WHEN** native CSS or an existing project helper fully covers a bounded change
- **THEN** the agent uses it without a mandatory repository search or extra overlapping dependency

#### Scenario: The gap is perceptual or the source is unverified
- **WHEN** the work has weak composition or motion decisions, or a candidate lacks source/license/compatibility evidence
- **THEN** the agent resolves the relevant method or evidence gap without hiding it under new effects or treating the candidate as an admitted runtime

### Requirement: Task-driven design source discovery
The skill SHALL offer the user's design directory as a progressively loaded source for references, assets and operations. Selected works SHALL feed existing reference, study and preview methods. The directory SHALL NOT mandate styles, services, source quotas or a new evidence schema.

#### Scenario: A visual question needs a source
- **WHEN** an agent needs composition, typography, motion, lighting or material references
- **THEN** it opens the relevant category, inspects a specific work and records an observable mechanism and intended adaptation in the existing task notes
- **AND** it reuses a suitable installed operation or project renderer instead of assuming the linked service is bundled

#### Scenario: A listed destination cannot be inspected
- **WHEN** a source is unavailable, access-restricted or only renders a loading shell
- **THEN** the agent records that limitation and uses an accessible source without claiming unseen content was inspected

### Requirement: Project-driven font discovery and use
The skill SHALL support task-driven font selection from FontLab and primary font sources. It SHALL distinguish discovery from licensing, preserve actual family identity, and route chosen project-local fonts to existing layout, glyph and subset tools. No catalogue or bundled font SHALL mandate a project typeface.

#### Scenario: A curated font fits the visual direction
- **WHEN** a font is found in FontLab or another collection
- **THEN** the agent checks its official source and intended embedding/modification use, compares the project's actual text, and records the selected family in existing design notes
- **AND** free availability alone does not label it open source or authorize subsetting

#### Scenario: Existing example font alias is reused
- **WHEN** a Huashu clip requests a bundled PuHui family alias
- **THEN** the agent identifies its actual Noto Sans SC font file and does not claim Alibaba PuHui is bundled

#### Scenario: Custom interface typography is requested
- **WHEN** the project's direction selects an appropriate custom CJK family
- **THEN** it can be used with verified glyph coverage, loading, readable layout and fallback instead of imposing the unspecific system-font default

### Requirement: Complete Huashu capability access
The installed skill SHALL provide usable local entry points for the complete reviewed Huashu capability set, combining adapted helpers with existing pipeline tools. It SHALL distinguish runnable functionality, method guidance, optional sample assets and measured verification limits.

#### Scenario: An advanced drawing method is requested
- **WHEN** an agent needs a Huashu material, camera, chart, collage, rig, typography or post effect
- **THEN** the tool guide identifies a callable local implementation and its inputs instead of requiring the agent to first port the raw source

#### Scenario: A style or grammar is selected
- **WHEN** the user requests an existing style or animation grammar
- **THEN** the installed skill provides its recipe, implementation/example and required assets through progressive lookup
- **AND** examples do not enforce the original narrator, character, scene composition or creative quotas

### Requirement: Portable isolated art tools
Art tool instances SHALL use caller-owned dimensions, time, context and assets without polluting host globals or silently fetching dependencies. Source examples MAY retain their authored coordinate system when explicitly selected and clearly fitted to the caller's output.

#### Scenario: Multiple sizes and reordered time
- **WHEN** independent tool instances render at different sizes or seek backwards
- **THEN** dimensions, cached state and frame results do not leak between instances

#### Scenario: Missing or unsafe inputs
- **WHEN** required assets are absent, numeric inputs are invalid or an output would overwrite or escape the chosen root
- **THEN** the tool reports the unmet requirement and preserves existing files

### Requirement: Complete source and capability verification
The package SHALL preserve reviewed source provenance and licenses and SHALL verify representative adapted algorithms, supplied presets and actual outputs. Numeric diagnostics SHALL remain separate from visual acceptance.

#### Scenario: Source refresh and packaging
- **WHEN** the source snapshot or adapted implementation is rebuilt
- **THEN** committed source bytes and the reviewed revision are checked before changing derived artifacts
- **AND** the installed package retains all required guides, tools and source resources

#### Scenario: Technical checks complete
- **WHEN** structural or rendering tests pass
- **THEN** the report states what was exercised and any asset, portability or visual limits without claiming user acceptance

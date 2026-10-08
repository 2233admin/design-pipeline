## ADDED Requirements

### Requirement: Maintained case and recipe library
The pipeline SHALL keep source-attributed Prompt Motion discovery candidates separate from curated recipe templates. Recipes SHALL state task fit, replaceable inputs, sequence, motion invariants and observation limits. Library inclusion SHALL NOT imply a runnable project or visual acceptance.

#### Scenario: Prompt becomes a maintained recipe
- **WHEN** a source prompt is reviewed
- **THEN** an authored recipe records the exact case source and adaptation, without mirroring its video or treating page text as observed motion

#### Scenario: Case is indexed but not reviewed
- **WHEN** a homepage card is inventoried
- **THEN** it is labelled a candidate and does not acquire a curated or rendered status

### Requirement: Offline read-only template access
The existing film CLI SHALL search curated recipes and show a selected template from the installed package without network access or writes. Discovery candidates SHALL require an explicit selection. Invalid IDs or malformed catalog data SHALL fail as contract errors.

#### Scenario: Relocated library selection
- **WHEN** a clean relocated installation searches or selects a template
- **THEN** it resolves bundled recipes and sources and retains recipe-only, unrendered and unobserved limits

#### Scenario: Unknown template
- **WHEN** a nonexistent template ID is requested
- **THEN** selection fails without modifying project files

### Requirement: Reviewable index maintenance
Refreshing source discovery SHALL produce reviewable added, changed and removed case metadata from a supplied homepage snapshot. It SHALL NOT execute source scripts, approve recipes, delete curated templates or overwrite existing output. Malformed or duplicate source entries SHALL be rejected.

#### Scenario: Upstream case changes or disappears
- **WHEN** the refreshed homepage changes metadata or omits a recorded case
- **THEN** the candidate diff records the change for review while curated recipes remain intact

#### Scenario: Unsafe refresh input
- **WHEN** source records are missing, malformed or duplicated, or the output already exists
- **THEN** maintenance fails without replacing the reviewed index or existing output

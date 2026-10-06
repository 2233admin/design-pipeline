## ADDED Requirements

### Requirement: Installed visual tools work in the caller's project

The skill SHALL locate its bundled helpers from the installed root and write project outputs
through the existing contained-path contract, without requiring a deliverable workflow.

#### Scenario: Portable visual-craft study
- **Given** a source or installed skill and an independent project directory
- **When** `composition scaffold --template visual-craft --output <new-dir>` runs for that project
- **Then** it creates a runnable HTML entry, its local Canvas helper and license in that directory, without workflow state or dependencies.

#### Scenario: Preserve authored work
- **Given** an existing output, unsupported template or output outside the project
- **When** scaffolding is requested
- **Then** it fails without overwriting project contents or creating an out-of-scope output.

### Requirement: Skill installation is documented and verified

The project SHALL ship a single discoverable skill with on-demand tools, installation and
upgrade instructions, and evidence from the installed entry rather than source tests alone.

#### Scenario: Install the current local skill
- **Given** the user requests skill installation and a previous canonical installation exists
- **When** the existing installer replaces it after a preserved backup
- **Then** the installed entry and tool files match the intended source, doctor and project scaffolding work, and separate compatibility consumers remain intact.

#### Scenario: Select the skill explicitly
- **Given** a skills CLI installation from a local or published repository
- **When** the documented command selects `design-pipeline`
- **Then** the complete selected bundle is installed and nested third-party skills are not separately selected; documentation distinguishes current local changes from published versions.

# Design pipeline delta

## ADDED Requirements

### Requirement: deliverable sub-workflows
Film and edit work SHALL each follow a sub-workflow whose guide lists, per stage, only the
commands that stage needs, and every `next` action for these deliverables SHALL name its guide
section.

#### Scenario: Film or edit action is returned
- **WHEN** a `next` action is returned for film or edit work
- **THEN** the applicable guide SHALL list only the commands needed per stage
- **AND** the action SHALL name its guide section

### Requirement: fresh gate results
A recorded gate result SHALL count toward finishing a stage only when it is not older than the
files it checked.

#### Scenario: Gate result predates checked files
- **WHEN** a recorded gate result is older than any file it checked
- **THEN** it SHALL NOT count toward finishing the stage

### Requirement: replicate mode
In replicate mode a film SHALL NOT waive its reference study, and an edit SHALL study the
reference edit before cutting.

#### Scenario: Replicate film or edit work begins
- **WHEN** work is in replicate mode
- **THEN** a film SHALL NOT waive its reference study and an edit SHALL study the reference edit before cutting

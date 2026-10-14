# Spec Delta

## MODIFIED Requirements

### Requirement: Web build waits for an approved description

At standard and full, `next` SHALL NOT return a build action until `brief.md` is approved as the one-page description with `decide --stage description --verdict accept --choice <section ids>`, by the agent's self-check by default or by the owner when kept. The approval SHALL bind the brief's bytes, the confirmed playback, the variant pick and the component decision; changing any of them SHALL ask again. A rejection SHALL become a rule.

#### Scenario: Build is blocked until approval

- **WHEN** a standard web project has its components decision but no current description approval
- **THEN** `next` SHALL return the description stage, never build
- **AND** a section verdict SHALL be refused with `WORKFLOW_NOT_READY`.

#### Scenario: A changed brief or decision asks again

- **WHEN** `brief.md` changes, or a different variant pick or component decision is recorded, after approval
- **THEN** `next` SHALL return the description step again before any further section or probe
- **AND** its `first` step SHALL name which inputs changed: the brief's wording, a section's line, the playback, the direction or the component decision.

### Requirement: The description lists its sections

`brief.md` SHALL carry a `## Sections` heading followed by one top-level list item per section, in build order, each starting with its id (lowercase letters, digits and hyphens) and giving one line on its job, and the approval's `--choice` SHALL equal that list exactly, in its order. Once `next` has reached the description, the approval MAY be recorded again: the identical approval SHALL keep the section verdicts, and a changed one SHALL ask again only the sections its change tier reopens.

#### Scenario: The description names its sections

- **WHEN** `brief.md` has no `## Sections` list, lists an item that does not start with a valid id or lists an id twice, or the approval's `--choice` differs from the list in its ids or their order
- **THEN** decide SHALL fail with `CONTRACT_INVALID`, naming the list where there is one, and record nothing
- **AND** a word that appears only in the prose of `brief.md` SHALL NOT count as a section id.

#### Scenario: An approval can be recorded again

- **WHEN** the identical approval is recorded again after `next` has moved on to build
- **THEN** decide SHALL accept it without `--tier`, and the section verdicts given under it SHALL still count.

### Requirement: Project rules stay out of the description

The description instruction SHALL tell the agent not to copy the project rules into `brief.md`, because the rules stay in `state.rules` and return with every action. A rule recorded after the approval SHALL leave the approval current, while any change to `brief.md` still asks for the approval again and, through its change tier, for the reviews of the sections it reopens.

#### Scenario: Rules stay out of the description

- **WHEN** `next` asks for the description
- **THEN** its instruction SHALL tell the agent not to copy the project rules into `brief.md`
- **AND** a rule recorded after the approval, such as a section rejection, SHALL leave the approval current.

### Requirement: Web pages are built and reviewed one section at a time

At standard and full the build SHALL follow the approved section order: the first section first, each marked `data-section` in `index.html`. A marker inside an HTML comment SHALL NOT count. `next` SHALL return the review of each built section (the agent's self-check by default, the owner's ask when kept) before the next is built, and build SHALL finish only when every approved section is accepted under its current section key. A section verdict SHALL NOT claim Visual Acceptance.

#### Scenario: Sections advance only after review

- **WHEN** the first section is built and the manifest is valid
- **THEN** `next` SHALL return the review of that section, and SHALL return the build of the second section only after decide records `--stage section --choice <first> --verdict accept`.

#### Scenario: Out-of-order acceptance is refused

- **WHEN** decide accepts a section other than the one `next` asks about
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

#### Scenario: A rejected section is revised

- **WHEN** the owner rejects a built section with comments
- **THEN** each comment SHALL become a rule bound to that section and `next` SHALL return that section's review again, telling the agent to revise it while the page is unchanged.

#### Scenario: Re-approval asks the sections again

- **WHEN** the description is approved again after a change
- **THEN** a section verdict SHALL NOT count when that section's key changed (its job line, the variant pick, the combine notes or the component decision) or the re-approval's commitment tier named it
- **AND** every other section verdict SHALL still count.

#### Scenario: A marker inside a comment is not a built section

- **WHEN** `index.html` carries `data-section="<id>"` only inside an HTML comment
- **THEN** `next` SHALL treat that section as unbuilt
- **AND** decide SHALL refuse a verdict on it with `WORKFLOW_NOT_READY`.

## ADDED Requirements

### Requirement: A changed description is re-approved with its change tier

When an earlier approval exists and the brief, the playback, the direction or the component decision changed, the description approval SHALL carry `--tier bytes` (wording or formatting only) or `--tier commitment` with `--affects <section ids>` or `all`. A first or identical approval SHALL take no `--tier`. A bytes claim SHALL be refused while a section line, the section list, the direction or the component decision changed.

#### Scenario: A typo keeps every section

- **WHEN** a sentence in the prose of `brief.md` is reworded after three sections were accepted, and the approval is recorded again with `--tier bytes`
- **THEN** all three section verdicts SHALL still count and `next` SHALL not ask any of them again

#### Scenario: A commitment reopens only what it names

- **WHEN** a goal in the prose changes and the approval is recorded again with `--tier commitment --affects hero`
- **THEN** the hero section SHALL be reviewed again and the other sections SHALL stay accepted

#### Scenario: A structural change refuses a bytes claim

- **WHEN** the job line of section proof changed, or a different variant was picked, and the approval is recorded with `--tier bytes`
- **THEN** decide SHALL exit 1 naming the change, and record nothing

#### Scenario: A missing or misplaced tier is refused

- **WHEN** a changed description is approved without `--tier`, or a first approval carries `--tier`, or `--affects` names a section not in the list, or `--affects` comes without `--tier commitment`
- **THEN** decide SHALL exit 1 and record nothing

### Requirement: A byte-only change does not go back to the owner

When the owner kept the description, the agent MAY record a `--tier bytes` re-approval with `--by agent`, and only when the pipeline finds no structural change. The record SHALL keep its tier and the diligence statement SHALL list it under the agent's decisions. A commitment re-approval of a kept description SHALL stay the owner's.

#### Scenario: The agent carries a typo forward

- **WHEN** the owner kept the description and only the prose of `brief.md` changed
- **THEN** `decide --stage description --verdict accept --tier bytes --by agent` SHALL be accepted
- **AND** the statement SHALL show it as an agent decision with its tier

#### Scenario: A commitment on a kept description stays with the owner

- **WHEN** the owner kept the description and the agent records `--tier commitment --by agent`
- **THEN** decide SHALL exit 1 and record nothing

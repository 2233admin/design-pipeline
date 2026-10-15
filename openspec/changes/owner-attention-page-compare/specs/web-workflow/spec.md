# Spec Delta

## ADDED Requirements

### Requirement: Captures fingerprint each element and section

Each numbered capture SHALL record, for every reference and every `data-section` region, a fingerprint of the pixels inside its box taken before badges are drawn, and each section's box. A verdict that keeps its screenshots SHALL also keep the capture's reference list under `evidence/reviewed/`, so two captures can be compared element by element.

#### Scenario: Unchanged content keeps its fingerprint when it moves

- **WHEN** a tall block is added at the top of section `hero`, pushing section `proof` down by a fractional amount, and the page is captured again
- **THEN** every element of section `proof` SHALL keep its fingerprint, and the comparison SHALL find section `proof` unchanged and `hero` changed.

#### Scenario: A moved section with a new background

- **WHEN** section `proof` moved and its background colour changed
- **THEN** the comparison SHALL find section `proof` changed.

#### Scenario: The same page gives the same fingerprints

- **WHEN** an unchanged page is captured twice
- **THEN** every fingerprint SHALL be identical.

### Requirement: An accepted section stays accepted only while it is unchanged

Once every section is built and accepted, a section accepted with kept captures on a page that changed since SHALL stay accepted only if comparing the kept captures with current ones shows it unchanged at every kept viewport. Otherwise it SHALL be reviewed again, with the changed elements listed, or, when the comparison cannot be made, with the reason.

#### Scenario: Shared CSS changes an accepted section

- **WHEN** both sections were accepted with captures, and a style added afterwards changes the `hero` button
- **THEN** after a new capture `next` SHALL ask about `hero` again, listing the button as changed and showing the accepted pictures beside the new ones; accepting it again SHALL stand.

#### Scenario: Building the next section leaves an accepted one alone

- **WHEN** section `hero` was accepted with captures and the page is edited to build `proof`
- **THEN** `next` SHALL ask about `proof` without asking for a capture first, and once `proof` is accepted and the page captured, `hero` SHALL stay accepted when the comparison finds it unchanged.

#### Scenario: The comparison cannot be made

- **WHEN** the page changed since `hero` was accepted with captures and there is no current capture
- **THEN** `next` SHALL ask about `hero` again, its `first` saying the section cannot be compared until the page is captured, giving the capture command, and that an unchanged section keeps its acceptance.

#### Scenario: A self-checked section is not compared

- **WHEN** a section was accepted by an agent self-check
- **THEN** a page change SHALL NOT reopen it.

#### Scenario: A verdict from before the comparison

- **WHEN** a section's accept names its screenshots without a kept reference list, and the page changed
- **THEN** `next` SHALL ask about it again as not comparable.

#### Scenario: Elements are paired by content

- **WHEN** a paragraph is inserted before an unchanged heading and an existing paragraph's text is edited
- **THEN** the comparison SHALL report the new paragraph as added, the edited one as changed, and the heading as unchanged.

### Requirement: The final review lists what changed since the acceptance

When the final review is asked again after the owner's acceptance and both the kept and current captures carry fingerprints, the action SHALL list the elements and sections that changed since.

#### Scenario: Accepted, then the footer changed

- **WHEN** the owner accepted the page with captures, the footer link's text changed, and the page passed the probe and was captured again
- **THEN** the final review SHALL list the footer link as changed.

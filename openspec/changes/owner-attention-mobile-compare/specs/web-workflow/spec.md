# Spec Delta

## ADDED Requirements

### Requirement: The built page is also numbered as a phone shows it

`evidence refs` SHALL also capture the page at 390×844 with mobile and touch emulation, writing `evidence/refs-mobile.json` (the page-refs schema, with its own lineage, screenshot hash and reference list) and `evidence/refs-mobile.png`. Phone references SHALL carry the `m:` prefix on the record and the badge. Each capture SHALL be kept while current and taken again on its own when stale.

#### Scenario: Phone references are prefixed

- **WHEN** `evidence refs` captures a page with sections `hero` and `proof`
- **THEN** `refs-mobile.json` SHALL list `m:hero-1`, `m:hero-2`, ... in DOM order with the phone layout's boxes, and `refs-mobile.png` SHALL show those labels.

#### Scenario: The phone layout is what a phone shows

- **WHEN** the page hides an element under `(pointer: coarse)`, or has no `<meta name="viewport">`
- **THEN** the hidden element SHALL get a desktop reference and no phone reference, and the page without the meta SHALL be laid out at the browser's default mobile width (980), with each badge still on its element.

#### Scenario: One stale capture is taken again alone

- **WHEN** `refs-mobile.png` is replaced after a capture and `evidence refs` runs again
- **THEN** the phone capture SHALL be taken again and `refs.json` and `refs.png` SHALL stay byte-identical.

#### Scenario: A phone capture that fails keeps the desktop one

- **WHEN** the desktop capture succeeds and the phone capture fails
- **THEN** `evidence refs` SHALL exit 1 naming the phone viewport, write the desktop capture, and write nothing for the phone.

#### Scenario: A project captured before the phone capture

- **WHEN** a current `refs.json` exists and no phone files do
- **THEN** `evidence refs` SHALL keep `refs.json` and `refs.png` byte-identical and add the phone capture.

#### Scenario: Citing a phone reference

- **WHEN** the owner cites `m:hero-2` at the review of section `hero`
- **THEN** decide SHALL check it against the current phone capture and keep it on the rule with its selector and text; `M:Hero-2` SHALL be read as `m:hero-2`; with the phone capture missing or stale, or `m:proof-1` at section `hero`, decide SHALL exit 1 and record nothing.

### Requirement: A repeated review shows what was judged before

When the owner, or the art director at a section, records a section or final-review verdict, each numbered screenshot current at that moment SHALL be kept as `evidence/reviewed/<sha256>.png` and named on the record. When the same section or the final review is asked again and a current screenshot differs from the one named on the latest such record, the action SHALL show the kept copy beside it and say when and how that verdict went.

#### Scenario: Revised after a rejection

- **WHEN** the owner rejects section `hero` with a current capture, the agent revises `index.html`, and the page is captured again
- **THEN** the next section ask SHALL show the kept copy and the new `refs.png`, saying the owner asked for changes at that time.

#### Scenario: Accepted, then changed

- **WHEN** the owner accepts the final review with a current capture, and the page then changes, passes the probe and is captured again
- **THEN** the final review SHALL show the kept copy and the new screenshot, saying the owner accepted the page at that time.

#### Scenario: The art director's section verdict

- **WHEN** the art director rejects section `hero` with a current capture, and the revised page is captured again
- **THEN** the next ask SHALL show the kept copy, saying the art director asked for changes.

#### Scenario: Nothing to compare

- **WHEN** no verdict at that scope kept a copy, the capture is not current, or the current screenshot equals the kept one
- **THEN** the action SHALL add no before picture.

#### Scenario: A self-check keeps nothing

- **WHEN** the agent records a delegated section self-check
- **THEN** the record SHALL name no screenshot and nothing SHALL be written under `evidence/reviewed/`.

#### Scenario: A missing or tampered copy is not shown

- **WHEN** a kept copy was deleted or no longer hashes to its name
- **THEN** the action SHALL NOT show it.

#### Scenario: A refused verdict keeps nothing

- **WHEN** decide refuses a section or review verdict after its checks
- **THEN** nothing SHALL be written under `evidence/reviewed/` and state SHALL be unchanged.

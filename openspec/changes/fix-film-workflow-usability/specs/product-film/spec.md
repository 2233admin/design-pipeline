# Product film delta

## ADDED Requirements

### Requirement: film check samples visible text between beats
When `film check` captures a composition, its existing composition gate SHALL also sample the
visible text at least five times a second and on both sides of every beat boundary. Held overlap
of two legible texts SHALL fail the gate; a passing overlap, a steady faint copy under legible
text, resting text near the frame edge and small resting text SHALL be warnings. No new gate or
acceptance state SHALL be added.

#### Scenario: Text arrives over other text at a beat boundary
- **WHEN** a legible text overlaps another legible text for two consecutive samples around a beat boundary
- **THEN** the composition step SHALL fail with a `text-overlap` error that names both texts, the time and the beat, with a fix

#### Scenario: Dissolves, covered and deliberate layers
- **WHEN** two texts crossfade, one is covered by an opaque element or clipped away, or one is marked `data-layout-allow-overlap`
- **THEN** no `text-overlap` finding SHALL be reported for them

#### Scenario: Layout capture is unavailable
- **WHEN** the layout samples cannot be captured
- **THEN** the composition step SHALL report the reason and the pixel checks SHALL still run

#### Scenario: Deliberate warning
- **WHEN** the author passes `film check --allow <code>` for a warning code
- **THEN** that warning SHALL move to the allowed list and an unknown code SHALL be rejected

### Requirement: quick film ends with the owner's review
The quick film tier SHALL run plan, build, check and review. After the film check passes, `next`
SHALL return the existing review ask with an instruction to review the checked draft one frame
per second and record it in `qa.md` first, and SHALL return `done` only after the owner accepts
the current checked draft. Other quick tiers SHALL be unchanged.

#### Scenario: Quick film passes its check
- **WHEN** a quick film's check passes
- **THEN** `next` SHALL ask for the owner's verdict with the frame-review instruction instead of returning `done`

#### Scenario: Owner rejects or the draft changes
- **WHEN** the owner rejects the draft, or a new draft is checked after acceptance
- **THEN** a rejection SHALL be recorded as a project rule and reopen the check, and `next` SHALL ask for a new verdict before `done`

### Requirement: film scaffold pins the reviewed runtime
`film scaffold` SHALL write a `package.json` pinning the reviewed `hyperframes` and `gsap`
releases and SHALL load GSAP from the local install, so that after one install the composition
renders and is captured without network access. HyperFrames preview and catalog calls SHALL
default to the reviewed release.

#### Scenario: Fresh film project
- **WHEN** a film project is scaffolded into an empty directory
- **THEN** `package.json` SHALL pin `hyperframes` 0.8.137 and `gsap` 3.15.0, the composition SHALL load no remote script, and the guide SHALL use `npx --no-install hyperframes`

#### Scenario: Existing package.json
- **WHEN** the target already has a `package.json`
- **THEN** scaffolding SHALL refuse without an explicit replace flag, and with it SHALL keep the existing fields and only set the pins and missing scripts

# Spec Delta

## MODIFIED Requirements

### Requirement: Section comments may cite runtime-review Feedback

A section verdict MAY cite runtime-review Feedback records with `--evidence`; `runtime-review check` SHALL remain the authority on bundle lineage. The owner comments on a section in text that names each element by its reference on the numbered screenshot (such as `hero-2`) or by its text, label or place. Clicking elements on the page is a planned follow-up; until it lands, no web prompt SHALL claim element picking.

#### Scenario: Section comments name elements in text

- **WHEN** `next` asks the owner to review a built section
- **THEN** its instruction SHALL tell the agent to show the numbered screenshot and ask the owner to name each element they comment on by its reference, or by its text, label or place
- **AND** it SHALL NOT offer clicking elements on the page.

## ADDED Requirements

### Requirement: The built page gets numbered element references

`evidence refs` SHALL load the built `index.html` in the probe's browser at 1440×900, scroll through it, and number its visible meaningful elements in DOM order: `<section>-<n>` inside each `data-section`, and `<n>` outside every section. It SHALL write `evidence/refs.json`, binding the page digest, every local file the browser loaded and the screenshot's hash, and a full-page `evidence/refs.png` with a badge per reference, and SHALL NOT write `index.html`.

#### Scenario: Elements are numbered per section

- **WHEN** `index.html` has a nav link outside any section, then sections `hero` and `proof`, with a heading, a paragraph and a link in `hero`
- **THEN** `refs.json` SHALL list `1` for the nav link, then `hero-1`, `hero-2` and `hero-3` in DOM order, each with a selector, tag, text and box, then the references of `proof`
- **AND** `index.html` SHALL be byte-identical before and after.

#### Scenario: What counts as an element

- **WHEN** a section holds a hidden element, a link inside a paragraph, an image inside a link and a wrapper `div` with no text of its own
- **THEN** the hidden element, the image and the wrapper SHALL get no reference, and the paragraph and the link SHALL each get one.

#### Scenario: A page without sections

- **WHEN** a quick page has no `data-section` outside HTML comments
- **THEN** its elements SHALL be numbered `1`, `2`, `3` in DOM order.

#### Scenario: A current capture is kept

- **WHEN** `evidence refs` runs again while `refs.json` already holds the current page digest
- **THEN** it SHALL report the capture as current and rewrite neither file, so a reference the owner has seen keeps its meaning.

#### Scenario: A changed asset or screenshot makes the capture stale

- **WHEN** a CSS-loaded image changes, or `refs.png` is replaced, after a capture
- **THEN** the capture SHALL no longer be current: reviews SHALL ask for a new one, `--ref` SHALL be refused, and `evidence refs` SHALL capture again.

#### Scenario: No browser

- **WHEN** no browser or `puppeteer-core` is found, or the page changes during the capture
- **THEN** `evidence refs` SHALL exit 1 naming the cause and write nothing.

### Requirement: Comments cite element references

`decide` SHALL take a repeatable `--ref <reference>` with `--answer` on a web section or final-review rejection. Each reference SHALL be in `evidence/refs.json` taken from the current page; at a section it SHALL belong to that section. The rule from the answer SHALL keep each reference with its selector and text, and the rules returned to the agent and the diligence statement SHALL show them.

#### Scenario: A comment on hero-2

- **WHEN** the owner says "hero-2 is too small" and the agent records `--stage section --choice hero --verdict reject --answer "The button is too small" --ref hero-2`
- **THEN** the rule SHALL carry `hero-2` with its selector and text, and both the next action's `rules` and the statement SHALL show them beside the owner's words.

#### Scenario: A reference that is not current is refused

- **WHEN** `--ref` names a reference missing from `refs.json`, `refs.json` is missing, its page digest differs from the current page, the reference belongs to another section, `--answer` is missing, the verdict is an accept, or the stage is not section or review
- **THEN** decide SHALL exit 1 naming the cause, and record nothing.

### Requirement: Final acceptance quotes the owner on the reviewed version

At the final review of a web deliverable, an owner accept SHALL carry `--answer` with the owner's words, at least two words or two CJK characters and no unedited placeholder; the returned command SHALL carry one placeholder for them. The record SHALL bind the reviewed inputs, and the statement SHALL show the words and that version. A page changed after the owner's latest accept SHALL be reviewed again, saying they accepted an earlier version.

#### Scenario: An acceptance without the owner's words is refused

- **WHEN** decide records a web `--stage review --verdict accept --by owner` without `--answer`, with `--answer "ok"`, or with the placeholder text
- **THEN** it SHALL exit 1 and record nothing.

#### Scenario: Other deliverables are unchanged

- **WHEN** decide records an owner accept at the final review of a film, edit or ui deliverable without `--answer`
- **THEN** it SHALL record the accept as before.

#### Scenario: The returned acceptance is not ready-made

- **WHEN** `next` returns the final review of a web page
- **THEN** its `record` SHALL hold one quoted placeholder for the owner's words, and its instruction SHALL say to record only words the owner gave.

#### Scenario: The owner accepted an earlier version

- **WHEN** the owner accepted the page and `index.html` then changed and passed the probe again
- **THEN** `next` SHALL return the final review again, saying the owner accepted an earlier version at that time.

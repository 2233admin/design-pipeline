# Spec Delta

## MODIFIED Requirements

### Requirement: Section comments may cite runtime-review Feedback

A section verdict MAY cite runtime-review Feedback records with `--evidence`; `runtime-review check` SHALL remain the authority on bundle lineage. The owner comments on a section in text that names each element by its number on the numbered screenshot or by its text, label or place. Clicking elements on the page is a planned follow-up; until it lands, no web prompt SHALL claim element picking.

#### Scenario: Section comments name elements in text

- **WHEN** `next` asks the owner to review a built section
- **THEN** its instruction SHALL tell the agent to show the numbered screenshot and ask the owner to name each element they comment on by its number, or by its text, label or place
- **AND** it SHALL NOT offer clicking elements on the page.

## ADDED Requirements

### Requirement: The built page gets numbered element references

`evidence refs` SHALL open the built `index.html` in the browser the probe uses, number the visible meaningful elements inside each `data-section` in DOM order as `<section>-<n>`, and write `evidence/refs.json` and a full-page `evidence/refs.png` with a badge per number. It SHALL record the page digest it was taken from and SHALL NOT write `index.html`.

#### Scenario: Elements are numbered per section

- **WHEN** `index.html` has sections `hero` and `proof`, with a heading, a paragraph and a link in `hero`
- **THEN** `refs.json` SHALL list `hero-1`, `hero-2` and `hero-3` in DOM order, each with a selector, tag, text and box, followed by the numbers of `proof`
- **AND** `index.html` SHALL be byte-identical before and after.

#### Scenario: What counts as an element

- **WHEN** a section holds hidden elements, a link inside a paragraph, and a wrapper `div` with no text of its own
- **THEN** hidden elements and the wrapper SHALL get no number, and the paragraph and the link SHALL each get one.

#### Scenario: No section, no browser

- **WHEN** `index.html` has no `data-section` outside HTML comments, or no browser or `puppeteer-core` is found
- **THEN** `evidence refs` SHALL exit 1 naming the cause and write nothing.

### Requirement: Comments cite element numbers

`decide` SHALL take a repeatable `--ref <number>` on a section or final-review rejection. Each number SHALL be in `evidence/refs.json`, taken from the current page. The rule from that rejection SHALL keep each number with its selector and text, and the diligence statement SHALL show them.

#### Scenario: A comment on hero-2

- **WHEN** the owner says "hero-2 is too small" and the agent records `--stage section --choice hero --verdict reject --answer "The button is too small" --ref hero-2`
- **THEN** the rule SHALL carry `hero-2` with its selector and text, and the statement SHALL show them beside the owner's words.

#### Scenario: A number that is not current is refused

- **WHEN** `--ref` names a number missing from `refs.json`, `refs.json` is missing, its page digest differs from the current page, the verdict is an accept, or the stage is not section or review
- **THEN** decide SHALL exit 1 naming the cause, and record nothing.

### Requirement: Final acceptance quotes the owner on the reviewed version

An owner accept at the final web review SHALL carry `--answer` with the owner's words from the conversation; the returned command SHALL carry a placeholder for them. The record SHALL bind the reviewed inputs, and the statement SHALL show the words and that version. When the page changed after the owner's latest accept, `next` SHALL say the owner accepted an earlier version.

#### Scenario: An acceptance without the owner's words is refused

- **WHEN** decide records `--stage review --verdict accept --by owner` without `--answer`
- **THEN** it SHALL exit 1 and record nothing.

#### Scenario: The returned acceptance is not ready-made

- **WHEN** `next` returns the final review of a web page
- **THEN** its acceptance command SHALL hold a placeholder for the owner's words, and its instruction SHALL say to record only words the owner gave.

#### Scenario: The owner accepted an earlier version

- **WHEN** the owner accepted the page and `index.html` then changed and passed the probe again
- **THEN** `next` SHALL return the final review again, saying the owner accepted an earlier version at that time.

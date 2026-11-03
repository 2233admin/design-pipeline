## ADDED Requirements

### Requirement: Reference pages are measured before they are judged

`reference extract --url --output` SHALL measure a reference page's colours, type scale and spacing from computed styles without a model, and write `extraction.json`, palette evidence conforming to `design-pipeline.palette-evidence.v1` with status `pending`, and draft DESIGN.md front-matter tokens. Unsupported values SHALL be written as `(low confidence)`. Replicate EXTRACT and website-cloning Stage B SHALL tell the agent to run it first.

#### Scenario: Palette tiers and clustering

- **WHEN** a page paints #ffffff, #fefefe and #fdfdfd backgrounds, a small #1f6feb button and #111827 text
- **THEN** the three whites SHALL merge into one dominant #ffffff cluster, #1f6feb SHALL be tiered accent although its share is under 5%, and the drafted roles SHALL include background #ffffff, text #111827 and primary #1f6feb

#### Scenario: Type and spacing clustered

- **WHEN** text is rendered at 15.8px and 16.2px beside 16px body text
- **THEN** the type scale SHALL list one 16px size counting all of them

#### Scenario: Low confidence instead of a guess

- **WHEN** the page has no saturated colour and its only font is used on one element
- **THEN** the draft SHALL write the primary colour and the body font as `(low confidence)` and list why

#### Scenario: Overlays are not measured

- **WHEN** a fixed cookie banner is open on the page
- **THEN** it SHALL be removed before measuring and listed as dismissed, and its colours SHALL not appear in the palette

#### Scenario: Existing evidence is kept

- **WHEN** the output directory already holds one of the three files and `--replace` is not given
- **THEN** the command SHALL exit 1 with `OUTPUT_EXISTS` and write nothing

### Requirement: Block pages are refused as reference evidence

A bot-challenge, WAF or captcha page SHALL be refused with `REFERENCE_BLOCKED` (exit 1) by `reference extract` and `evidence capture`, and by `evidence refs` when the page carries a vendor's challenge or block markers. A refused capture SHALL write no evidence.

#### Scenario: Access denied

- **WHEN** the page answers HTTP 403 titled "Access Denied" with little text
- **THEN** `reference extract` SHALL exit 1 with `REFERENCE_BLOCKED` and no output files

#### Scenario: Challenge that clears

- **WHEN** a Cloudflare JavaScript challenge replaces itself with the real page within the wait
- **THEN** `reference extract` SHALL measure the real page

#### Scenario: Saved block page

- **WHEN** a capture adapter's saved DOM or the project's index.html carries Cloudflare block markers
- **THEN** `evidence capture` and `evidence refs` SHALL exit 1 with `REFERENCE_BLOCKED` and keep no capture

# Spec Delta

## ADDED Requirements

### Requirement: The owner can review on the page itself

`evidence review-page` SHALL write `evidence/review.html`, a copy of the built page with a comment overlay, carrying the page digest, the current owner-facing ask and the numbered references, without changing `index.html`. In it the owner SHALL be able to click numbered elements, add pending comments and submit one review that is shown to copy and offered as a file.

#### Scenario: Clicking an element comments on its reference

- **WHEN** the owner turns on comment mode and clicks inside the `hero-2` button, writes a comment and submits Request changes
- **THEN** the submitted block SHALL hold the page digest, the ask, verdict `reject` and a comment on `hero-2` with the text.

#### Scenario: A section review numbers only its section

- **WHEN** the review page is written for the review of section `hero`
- **THEN** it SHALL carry only the references inside `hero`, and a click elsewhere SHALL be a comment without a reference.

#### Scenario: The review copy is not the shipped page

- **WHEN** `evidence review-page` runs
- **THEN** `index.html` SHALL be byte-identical, and the review copy SHALL load the page's own files.

#### Scenario: No capture or no ask

- **WHEN** there is no current desktop capture, or the next action is not the owner's section or final review (a delegated self-check or a section directed to the art director)
- **THEN** `evidence review-page` SHALL exit 1 naming what to do first and write nothing.

### Requirement: A page review is recorded as the owner's verdict

`decide --page-review <file>` SHALL record the block's verdict as the owner's, with its words and each comment's reference, only when the block is valid, was given on the current page version and answers the current ask; it SHALL keep the block under `evidence/page-review/` and mark the record as given on the page. Otherwise it SHALL exit 1 and record nothing.

#### Scenario: Changes requested on the page

- **WHEN** the block rejects section `hero` with comments on `hero-2` and on nothing numbered
- **THEN** the rule SHALL carry both comments' text and `hero-2` with its selector, the role entry SHALL say it was given on the page, and the block SHALL be kept.

#### Scenario: Accepted on the page

- **WHEN** the block accepts the final review with the owner's words
- **THEN** the acceptance SHALL be recorded with those words and the statement SHALL show it was given on the page.

#### Scenario: A stale or mismatched review

- **WHEN** the block was given on an earlier page version or capture, answers another ask, is not valid, or comes with `--stage`, `--choice`, `--verdict`, `--answer`, `--ref` or `--by`
- **THEN** decide SHALL exit 1 naming the cause and record nothing.

## ADDED Requirements

### Requirement: Motion vocabulary ships with verbatim definitions

The package SHALL ship `references/motion-vocabulary.json` holding every term of the upstream `animation-vocabulary` glossary at the locked revision with its definition verbatim, and for each term at least one English and one Chinese alias, close terms with a stated difference, and local links that resolve.

#### Scenario: The vocabulary is checked against the pinned glossary

- **WHEN** the repository tests run
- **THEN** every pinned upstream term SHALL be present with an identical definition, ids SHALL be unique, every close term SHALL exist, and every primitive id, recipe id and guide anchor SHALL resolve.

#### Scenario: A definition is reworded or a link is dead

- **WHEN** a definition differs from the pinned text, a term is missing, an alias language is empty, or a local link does not resolve
- **THEN** the test SHALL fail and name the term.

### Requirement: Loose descriptions find their term through the existing search

`design-system search` SHALL rank `term` records by deterministic lexical overlap between the query and each record's name, aliases and definition, and SHALL list them before other records. It SHALL NOT call a model. Records of other types SHALL keep their literal match and order.

#### Scenario: A description in English or Chinese

- **WHEN** `design-system search --snapshot references/component-source-catalog.json --kind doc --query "<description>"` runs for the pinned descriptions
- **THEN** each expected term SHALL be in the first three results and at least 18 SHALL be first, including the three upstream examples.

#### Scenario: A term is asked by name

- **WHEN** the query is `pop in`
- **THEN** the first result SHALL be `motion-vocabulary/pop-in` with its definition as `description` and `bounce` among its close terms.

#### Scenario: Recipe search is unchanged

- **WHEN** the query is `stagger`, `回弹` or `血条拖尾`
- **THEN** the records that are not terms SHALL be exactly the records and order returned before this change.

#### Scenario: Nothing in the vocabulary matches

- **WHEN** the query shares no word with any term
- **THEN** no term record SHALL be returned.

### Requirement: Close terms are told apart and approximations are named as such

The vocabulary SHALL state the difference for pop in and bounce, clip-path and mask, shared element transition and layout animation, and layout animation and "shared layout animation". The guide SHALL require the term first, the definition verbatim, at most two alternates, and an explicit "approximation" when no term fits; it SHALL forbid coining terms.

#### Scenario: A confusable pair

- **WHEN** either term of a listed pair is returned
- **THEN** its record SHALL name the other with the difference.

### Requirement: Motion anti-patterns have fixed names

The vocabulary SHALL define `scale-from-zero`, `hover-flicker` and `layered-entry` as project-owned entries, each with a description, a replacement term id that exists, a fix, and at least one packaged rule that resolves. Terms an anti-pattern concerns SHALL name it.

#### Scenario: A description of an anti-pattern

- **WHEN** the query is `popover grows from scale 0`
- **THEN** the results SHALL include `scale-from-zero` and a term it concerns.

#### Scenario: A replacement that is not a term

- **WHEN** an anti-pattern's replacement or source anchor does not resolve
- **THEN** the test SHALL fail.

### Requirement: Vocabulary catalog records are generated

The `motion-vocabulary/*` records of `component-source-catalog.json` SHALL be generated from `motion-vocabulary.json` by `scripts/refresh-motion-vocabulary.cjs --catalog` and SHALL NOT be edited by hand.

#### Scenario: The records drift from the data

- **WHEN** a record differs from what the vocabulary generates
- **THEN** `--check` SHALL exit 1 and the test SHALL fail.

### Requirement: The vocabulary follows the locked upstream glossary

The vocabulary's provenance SHALL extend the existing lock entry `emilkowalski-animation-review` and SHALL add no lock entry. After `sources:update`, a changed upstream glossary SHALL fail the tests until the pinned term list is refreshed and the vocabulary matches it.

#### Scenario: Upstream changes the glossary

- **WHEN** the guide's recorded content hash differs from the pinned list's file hash, or the refreshed list adds, rewords or removes a term
- **THEN** the test SHALL fail.

### Requirement: Naming questions route to the vocabulary

The job registry SHALL contain a scored job `motion-vocabulary` with English and Chinese naming keywords whose primary knowledge is `references/motion-vocabulary.md`. An explicit job or a stronger scored match SHALL keep the brief.

#### Scenario: A naming question

- **WHEN** `route --query "what's it called when a popover grows out of the button"` or `--query "这个按钮按下去缩一下的效果叫什么"` runs
- **THEN** the job SHALL be `motion-vocabulary` and the confidence SHALL NOT be `low`.

#### Scenario: A brief that only mentions naming

- **WHEN** the brief also matches an explicit job
- **THEN** the explicit job SHALL be selected.

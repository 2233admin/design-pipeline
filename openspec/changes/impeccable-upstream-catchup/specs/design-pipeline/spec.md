## ADDED Requirements

### Requirement: Every upstream Impeccable reference file has a recorded disposition

`references/impeccable-product-design.json` SHALL list each reference file of the locked Impeccable
revision beyond the command guides in `upstreamReferences` as adopted, partly adopted, mapped or
not adopted, with a reason; features left out on purpose SHALL appear in `notAdopted`.

#### Scenario: A mapped file names a real target

- **WHEN** a disposition other than not adopted names a target
- **THEN** the target SHALL be an existing guide heading or a supporting capability id.

#### Scenario: A file is not adopted

- **WHEN** a reference file needs the Impeccable CLI or writes persistent configuration
- **THEN** it SHALL be recorded as not adopted with its reason and no target.

### Requirement: Contract and guides follow Impeccable 4.8.2 behaviour

The packaged guides SHALL keep the audit report in `qa.md` after delivering it in chat, check
right-to-left pages only when `dir="rtl"` is declared, propose no visual direction during intake,
and treat a brief's cited product as a craft bar, not a pin.

#### Scenario: Right-to-left scope

- **WHEN** a page sets `lang` to an RTL script without `dir`
- **THEN** the audit SHALL note it once and SHALL NOT flag physical properties as defects.

#### Scenario: Reports opted out

- **WHEN** the brief or `PRODUCT.md` says not to keep audit reports
- **THEN** the audit SHALL still be delivered in chat and nothing SHALL be saved.

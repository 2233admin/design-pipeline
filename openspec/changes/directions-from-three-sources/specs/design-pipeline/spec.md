## ADDED Requirements

### Requirement: ui and web restate the request before any direction

For ui and web at standard and full outside replicate, `next` SHALL have the agent play back the need, audience, scene, tone and what the owner did not say, ending with "I'll make several real directions for you to see". The owner's accept SHALL be required before the direction stage, and the playback SHALL NOT ask the owner to name a style.

#### Scenario: A ui playback precedes the directions

- **WHEN** a standard ui project has an intake answer and no accepted playback
- **THEN** `next` SHALL return an ask with that closing line
- **AND** quick and replicate SHALL have no playback.

### Requirement: Directions are made from three sources

For ui and web at standard and full in brief mode, the direction stage SHALL record six cards in `direction-preview.json` `cards`: two best-designer cards, two cards from captured same-medium real work (or `seen: false` with a reason), and two style-roulette cards with section, number, style, specimen and fidelity. Each card SHALL carry source, borrowed, hero, skeleton, boldness and content-form columns.

#### Scenario: A named style still goes through the flow

- **WHEN** the owner named a style or brand
- **THEN** the receipt SHALL record it as `context`, all six cards SHALL interpret it, and the roulette SHALL draw only from a recorded compatible pool.

### Requirement: The roulette is deterministic and avoids recent deliveries

The roulette SHALL draw number `S % sectionCount + 1` in the medium's section and `S % 12 + 1` in east for the current second `S`, skipping styles in the appearance ledger's last three deliveries and recording what it skipped. A style under 70% fidelity SHALL state what degrades. `direction draw` SHALL print both draws.

#### Scenario: A recent style is skipped

- **WHEN** the ledger's latest entry lists `style:east/02` and the east draw lands on 2
- **THEN** the draw SHALL be 3 with `skipped` listing 2.

### Requirement: Cards become a thumbnail board and three full versions

The stage SHALL build `direction-previews/thumbs.html` with six cells captured to PNG, then three full versions `dir-1.html` to `dir-3.html`, each bound to a card, captured, and recorded with reasons for being good alone, distinct, not colliding with the ledger and not overdone. At most one version SHALL be marked overdone.

#### Scenario: Two versions are overdone

- **WHEN** two versions are marked overdone
- **THEN** `direction check` SHALL return the finding `versions-overdone` with a fix.

### Requirement: direction check gates the three-source set with fixes

`direction check` SHALL return a finding with a fix for each: wrong card count or missing card field or evidence, roulette mismatch with the catalog, missing thumbs or capture, a version count other than three, versions not distinct on four axes, a ledger collision of source or appearance, and unreadable captured text. A waiver SHALL keep working and SHALL carry no cards or thumbs.

#### Scenario: A ledger collision names its fix

- **WHEN** a version's source appears in the ledger's last three deliveries
- **THEN** the check SHALL return `ledger-source-collision` whose fix says to swap that card for an alternate.

### Requirement: The owner picks from three captures and keeps their words

The owner ask SHALL show the three captures with card summaries and the thumbnail board, naming the other three cards as alternates. `decide --by owner` SHALL keep the exact words, the chosen ids and any `--mix part=id` as structured fields, and a `--taste` statement SHALL become a rule scoped as said.

#### Scenario: A mix is recorded

- **WHEN** the owner chooses two versions with `--mix layout=a --mix colour=b`
- **THEN** the decision SHALL hold both ids and the mix, and a mix naming an unshown version SHALL be refused.

### Requirement: An appearance ledger records what was delivered

`~/.design-pipeline/ledger.json` (or `DESIGN_PIPELINE_LEDGER`) SHALL hold entries of project hash, date, appearance (palette, fonts, skeleton, motion) and sources, never project content. Ui delivery and review accept and web delivery SHALL write it; the direction stage SHALL read it. A missing or failed measurement SHALL NOT block delivery.

#### Scenario: Delivery is remembered

- **WHEN** a project with an `index.html` is delivered
- **THEN** one entry for that project SHALL exist, replaced on a later accept, and the next project's direction check SHALL see it.

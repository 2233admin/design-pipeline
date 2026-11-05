## ADDED Requirements

### Requirement: The appearance ledger records a measured look signature

Each delivered ledger entry SHALL carry `appearance.signature` with accent hex or null, display and body font families, `light` or `dark` theme and a hero class (`centred`, `split`, `full-bleed-image`, `left`, `right`, `none`, or `unmeasured` without a browser), measured from the delivered page's computed styles. It SHALL hold no project text, and entries without it SHALL stay valid.

#### Scenario: A dark split page is recorded

- **WHEN** a delivered page has a dark background, a Fraunces heading left of an image and repeated #e4572e buttons
- **THEN** its entry SHALL record accent `#e4572e`, display `fraunces`, theme `dark` and hero `split`.

#### Scenario: A large colour field is not the accent

- **WHEN** a page's whole background is teal and its small buttons are pink
- **THEN** the signature SHALL record the pink as accent and `dark` as theme, not teal as accent.

#### Scenario: Cards, footers and textures do not mislead

- **WHEN** a dark body holds white cards, a white page ends in a tall dark footer, or a hero is painted with a small tiled texture or a decorative svg
- **THEN** the theme SHALL follow the body's background and the hero SHALL NOT be `full-bleed-image`.

#### Scenario: No browser

- **WHEN** no browser resolves at delivery
- **THEN** the signature SHALL come from the CSS accent token and fonts with hero `unmeasured`, and delivery SHALL NOT be blocked.

### Requirement: Direction choice shows recent looks as advice

The direction stage SHALL list the last five signatures of other projects, newest first, as `recentLooks` on the action that makes the directions and on the owner's ask, and each version SHALL carry its measured look and the parts it repeats. This SHALL NOT add a finding, block, or reorder.

#### Scenario: A version repeats a recent display font

- **WHEN** a recent delivery used display `fraunces` and version one is set in Fraunces
- **THEN** the ask SHALL list that delivery under `recentLooks` and version one's `repeatsRecent` SHALL name `display fraunces`, and `direction check` SHALL return the same findings as with an empty ledger.

#### Scenario: Broken ledger or own project

- **WHEN** the ledger is unreadable, or its only signed entry is this project's own
- **THEN** no `recentLooks` SHALL be shown and the stage SHALL proceed.

## MODIFIED Requirements

### Requirement: Web concepts ask for a section arc and a treatment

The web `concepts` run action SHALL ask for the six direction cards, the thumbnail board and three full versions `a`, `b` and `c` defined by the `design-pipeline` directions requirements, checked by `direction check`. It SHALL say that `concepts.md` is written from the chosen version's card and extended with a `## Treatment`. The pick SHALL be `--choice` a, b or c, or several comma-separated with `--mix` and an answer.

#### Scenario: A web concepts step asks for a treatment

- **WHEN** `next` runs for a standard web project with a confirmed playback, a reference decision and no direction receipt
- **THEN** the `run` action SHALL name `direction draw`, `thumbs.html`, `dir-1.html` and `## Treatment`
- **AND** it SHALL NOT mention `concepts.html` or a variant switcher
- **AND** decide SHALL refuse a pick, a description verdict or a section verdict for it.

#### Scenario: Versions the owner has not seen cannot be picked or rejected

- **WHEN** decide records a pick or rejection before `next` asks about the versions
- **THEN** it SHALL fail with `WORKFLOW_NOT_READY` and record nothing.

## REMOVED Requirements

### Requirement: Web variants are switchable first screens

**Reason**: The variants page and its switcher are replaced by the three full versions and the thumbnail board of the directions flow.

**Migration**: Build the versions as `dir-1.html` to `dir-3.html` and pick `a`, `b` or `c`. A rejection still becomes a project rule and reopens the pick.

### Requirement: The variant switcher never ships

**Reason**: The switcher tool is deleted, so `index.html` has nothing to carry and the `variant-switcher-shipped` finding is gone.

**Migration**: None. Remove any leftover `data-variant` panels as ordinary page cleanup.

## ADDED Requirements

### Requirement: Product motion recipes are locally discoverable

The packaged skill SHALL provide original HP ghost bar, cooldown completion, reward arrival and menu switch recipes, each with a runnable offline browser specimen. Existing catalog search SHALL expose them as doc/method project-owned records with Chinese and English scenario terms and valid local paths, without changing component-only platform filtering.

#### Scenario: A practitioner finds a game motion recipe

- **WHEN** a practitioner searches the supplied component-source snapshot without a platform filter for a recipe's Chinese or English scenario term
- **THEN** the matching method record SHALL identify its local guide and runnable specimen
- **AND** no upstream fetch or runtime installation SHALL be required.

#### Scenario: A component-only search remains component-only

- **WHEN** the same snapshot is searched with platform web
- **THEN** recipe method records SHALL NOT be returned as web components.

### Requirement: Recipes preserve authoritative state during motion

Each recipe SHALL define purpose, trigger, authoritative/visual state, phased timing, primitive choice, interruption/reset and reduced-motion behavior. Browser specimens SHALL implement those behaviors using original DOM/SVG code. Project motion tokens and existing opportunity/transition/review contracts SHALL govern adaptations.

#### Scenario: Damage repeats or healing interrupts a trail

- **WHEN** damage repeats before the ghost bar settles or healing arrives during a trail
- **THEN** current HP SHALL update immediately and the visual trail SHALL retarget or align without stale completion overwriting current HP.

#### Scenario: A cooldown is restarted or cancelled

- **WHEN** a cooldown is restarted or cancelled before completion
- **THEN** availability SHALL follow the current run or cancellation state
- **AND** a stale previous run SHALL NOT emit a ready cue.

#### Scenario: A grant interrupts a prior arrival

- **WHEN** rewards arrive rapidly or presentation is interrupted
- **THEN** each deliberate grant SHALL update the authoritative total once, independently of visual completion
- **AND** old presentation callbacks SHALL NOT alter the total.

#### Scenario: Menu state changes rapidly

- **WHEN** a menu opens, closes and reopens before exit completes
- **THEN** the latest requested state SHALL determine visibility and semantics
- **AND** inactive controls SHALL remain unavailable to keyboard navigation.

#### Scenario: Reduced motion is active

- **WHEN** system reduced-motion preference or the specimen reduced-motion control is active
- **THEN** essential values, availability and menu operation SHALL remain correct without travel, shake or repeated emphasis.

### Requirement: Recipe reference evidence remains honest

Recipes SHALL distinguish project-authored parameters/code from source observations and written descriptions. They SHALL cite external inspiration without redistributing upstream code/assets or asserting unverified upstream licensing. Discovery and runtime evidence SHALL use existing workflow records and SHALL NOT grant Visual Acceptance or create a new gate/receipt schema.

#### Scenario: A showcased timeline is adapted

- **WHEN** a source demonstration inspires a recipe
- **THEN** the guide SHALL distinguish full demonstration duration from functional state-transition timing
- **AND** unplayed, unmeasured or unauthorized source details SHALL NOT be asserted as verified.

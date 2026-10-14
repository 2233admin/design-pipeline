# Spec Delta

## ADDED Requirements

### Requirement: Delegated checkpoints are agent self-checks

When the delegation map gives a checkpoint to the agent, `next` SHALL return that checkpoint's step as a `run` self-check, not an `ask`. The self-check SHALL tell the agent to check the work against the confirmed playback and the chosen direction and to record it with `--by agent`. A checkpoint routed to an art director under `--director` SHALL keep its ask with the director routing. Owner checkpoints SHALL keep their asks.

#### Scenario: A delegated section is a self-check

- **WHEN** a standard web project's `section` checkpoint is delegated to the agent and a section is built
- **THEN** `next` SHALL return `type: "run"` for that section with a record command carrying `--by agent`
- **AND** `decide --stage section --choice <id> --verdict accept --by agent` SHALL accept it

#### Scenario: A kept checkpoint still asks

- **WHEN** the owner confirmed the playback with `--keep section`
- **THEN** `next` SHALL ask the owner to review each built section

#### Scenario: Director routing is unchanged

- **WHEN** standard web work started with `--director` reaches a built section
- **THEN** `next` SHALL return the section ask with the art-director routing

### Requirement: Web review checkpoints default to the agent

For web work, the `components` checkpoint at every tier and the `description` and `section` checkpoints at standard and full SHALL default to the agent. The playback, the variant pick and final acceptance SHALL stay with the owner. The intake playback SHALL offer the owner to keep section reviews.

#### Scenario: A two-section page asks the owner three times

- **WHEN** a standard web project with two sections runs from intake to delivery with default delegation and no trade-off escalated
- **THEN** `next` SHALL return exactly three owner asks: the playback, the variant pick and the final review

#### Scenario: Quick web asks only for acceptance

- **WHEN** a quick web project runs with default delegation
- **THEN** the components step SHALL be a self-check and the only owner ask SHALL be the final review

### Requirement: Owner asks on delegated work record their trade-off

A self-check SHALL tell the agent to ask the owner only when the work carries a trade-off the owner has not settled, and for component sources only for a new dependency, a license obligation or a notable cost. Such an ask SHALL name what is new, the recommendation and its cost, and how to see the difference. `--tradeoff` SHALL record what was asked on the owner's record and the statement SHALL show it.

#### Scenario: A license consequence is asked

- **WHEN** the agent records the owner's reply on a delegated components checkpoint with `--by owner --tradeoff "Adds a GPL chart library; recommend the MIT one at 12 KB more"`
- **THEN** the role entry SHALL keep the trade-off text
- **AND** the diligence statement SHALL list it beside the owner's decision

#### Scenario: An agent cannot claim a trade-off ask

- **WHEN** `decide` runs with `--tradeoff` and `--by agent`
- **THEN** it SHALL exit 1 and record nothing

### Requirement: Agents do not record a "no"

A "no" SHALL be the owner's words. `decide --by agent --verdict reject` SHALL be refused with exit 1 and no state change, except on a checkpoint routed to an art director under `--director`. A self-check that finds a fault SHALL fix the work before recording `accept`.

#### Scenario: An agent reject is refused

- **WHEN** `decide --stage description --verdict reject --by agent --answer "Too long for the hero"` runs on a delegated description
- **THEN** it SHALL exit 1 and `state.rules` SHALL be unchanged

### Requirement: The web playback is a card that confirms creative intent

The standard and full web playback SHALL be a short card: three intent lines (what the page expresses, who it connects with and how, what makes it distinct), the open uncertainties, and one line on what the agent will decide. The owner confirming the card SHALL record creative intent with `by: "owner"`. A skip SHALL leave creative intent not stated by the owner. The statement SHALL NOT say it is planned.

#### Scenario: Confirming the card records creative intent

- **WHEN** decide records the confirmed playback with `--by owner`
- **THEN** `decisions.roles` SHALL hold a `creative-intent` entry by the owner with the card text
- **AND** the diligence statement SHALL list creative intent under the owner's decisions

#### Scenario: A skip leaves intent unstated

- **WHEN** a standard web project records a stated skip
- **THEN** the statement SHALL list creative intent as not stated by the owner

### Requirement: Owner-facing asks follow the project's language

Every `ask` and every self-check from `next` SHALL carry a `language` line telling the agent to speak to the owner in the brief's language, else in the language the owner writes in, translating the fixed wording while keeping commands and ids unchanged.

#### Scenario: The playback ask carries the language line

- **WHEN** `next` asks a standard web intake
- **THEN** the action SHALL carry `language`

### Requirement: A "no" binds to its object by default

A web, film or edit "no" SHALL store the object it was about (the playback, the variants, the component round, the description, a section, the sample or the reviewed result) and `scope: "object"`. Actions SHALL return it until that object is next accepted. `--scope project` SHALL make it a project rule. Anti-goals and rules without an object SHALL stay project rules. An unknown `--scope` SHALL fail with exit 1.

#### Scenario: A section rule retires when the section is accepted

- **WHEN** the owner rejects section hero with "Drop the gradient" and section hero is later accepted
- **THEN** actions before that acceptance SHALL return the rule labelled with section hero
- **AND** later actions SHALL NOT return it, and `state.rules` SHALL still hold it

#### Scenario: The owner says "from now on"

- **WHEN** the rejection is recorded with `--scope project`
- **THEN** the rule SHALL be a project rule returned by every later action

#### Scenario: A bad scope is refused

- **WHEN** decide runs with `--scope everywhere`
- **THEN** it SHALL exit 1 and record nothing

### Requirement: Final acceptance offers to keep general rules

When object rules exist, the final review ask SHALL list them with where they came from and tell the agent to ask once whether to keep, for the rest of the project, those given about more than one object or phrased as a principle. `--promote "<from>"` on the owner's review record SHALL make that rule a project rule. Without the owner's answer no rule SHALL change scope.

#### Scenario: The owner keeps one rule

- **WHEN** the owner's final review is recorded with `--promote "section hero 1"`
- **THEN** that rule SHALL become a project rule and keep the scope it was given in

#### Scenario: Promotion names an unknown rule

- **WHEN** `--promote "section footer 9"` names no object rule
- **THEN** decide SHALL exit 1 and record nothing

# Spec Delta

## ADDED Requirements

### Requirement: Delegated web reviews are agent self-checks

When the delegation map gives the web `components`, `description` or `section` checkpoint to the agent, `next` SHALL return its step as a `run` self-check, not an `ask`. Its record command SHALL carry `--by agent`, and its correction command `--by owner`. Intake, concept, sample and final review steps SHALL keep their asks. A section routed to an art director under `--director` SHALL keep its ask.

#### Scenario: A delegated section is a self-check

- **WHEN** a standard web project's `section` checkpoint is delegated to the agent and a section is built
- **THEN** `next` SHALL return `type: "run"` with `selfCheck: true` for that section, a record command carrying `--by agent` and a correction command carrying `--by owner`
- **AND** `decide --stage section --choice <id> --verdict accept --by agent` SHALL accept it

#### Scenario: A kept checkpoint still asks

- **WHEN** the owner confirmed the playback with `--keep section`
- **THEN** `next` SHALL ask the owner to review each built section

#### Scenario: Director routing is unchanged

- **WHEN** standard web work started with `--director` reaches a built section
- **THEN** `next` SHALL return the section ask with the art-director routing

#### Scenario: A delegated concept pick keeps its ask

- **WHEN** the owner delegated `concept` at intake
- **THEN** `next` SHALL return the variants ask, recordable with `--by agent`

#### Scenario: A build with open findings is not a self-check

- **WHEN** a section is built but the page has build findings
- **THEN** `next` SHALL return the build run, and a `--by agent` accept of that section SHALL fail with `WORKFLOW_NOT_READY`

### Requirement: Web review checkpoints default to the agent

For web work, `components` at every tier and `description` and `section` at standard and full SHALL default to the agent. The playback, the variant pick and final acceptance SHALL stay with the owner. At standard and full the intake playback SHALL offer the owner to keep section reviews with `--keep section`; quick work, whose intake the agent records, SHALL keep its defaults.

#### Scenario: A two-section page asks the owner three times

- **WHEN** a standard brief-mode web project with two sections runs from intake to delivery with default delegation and no trade-off asked
- **THEN** `next` SHALL return exactly three owner asks: the playback, the variant pick and the final review

#### Scenario: Quick web asks only for acceptance

- **WHEN** a quick web project runs with default delegation
- **THEN** the components step SHALL be a self-check and the only owner ask SHALL be the final review

### Requirement: Owner asks on delegated work record their trade-off

A self-check SHALL tell the agent to ask the owner only when the work carries a trade-off the owner has not settled, and for component sources only for a new dependency, a license obligation or a notable cost. Such an ask SHALL name what is new, the recommendation and its cost, and how to see the difference. `--tradeoff` SHALL record what was asked on an owner record, and the statement SHALL show it.

#### Scenario: A license consequence is asked

- **WHEN** the owner's reply on a delegated components checkpoint is recorded with `--by owner --tradeoff "Adds a GPL chart library; recommend the MIT one at 12 KB more"`
- **THEN** the role entry SHALL keep the trade-off text
- **AND** the diligence statement SHALL list it beside the owner's decision

#### Scenario: The owner declines the recommendation

- **WHEN** the owner says no to the recommendation and the agent records it with the self-check's correction command and `--tradeoff`
- **THEN** the "no" SHALL become a rule and the role entry SHALL keep the trade-off text

#### Scenario: An agent cannot claim a trade-off ask

- **WHEN** `decide` runs with `--tradeoff` and `--by agent`
- **THEN** it SHALL exit 1 and record nothing

### Requirement: Agents do not record or undo a "no"

A "no" SHALL be the owner's words: `decide --by agent --verdict reject` SHALL be refused with exit 1 and no state change, except on a pick routed to an art director under `--director`. A `--by agent` accept of a section or description whose latest record is the owner's reject of the same bytes SHALL be refused: the work changes first.

#### Scenario: An agent reject is refused

- **WHEN** `decide --stage description --verdict reject --by agent --answer "Too long for the hero"` runs on a delegated description
- **THEN** it SHALL exit 1 and `state.rules` SHALL be unchanged

#### Scenario: An unchanged section cannot be self-accepted

- **WHEN** the owner rejected section hero and `index.html` is unchanged since
- **THEN** `decide --stage section --choice hero --verdict accept --by agent` SHALL exit 1 and record nothing
- **AND** after the section is revised, the same command SHALL accept it

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

Every `ask` from `next`, including the first ask before any state exists, and every self-check SHALL carry a `language` line telling the agent to speak to the owner in the brief's language, else in the language the owner writes in, translating the fixed wording while keeping commands, ids and file names unchanged.

#### Scenario: Asks carry the language line

- **WHEN** `next` runs with no state, and when it asks a standard web intake
- **THEN** each action SHALL carry `language`

### Requirement: A "no" binds to what it was about

Every rule from an owner "no" SHALL store `scope: "object"` and the object it binds to. A section "no" SHALL bind to that section, a sample "no" to the sample, and every other "no" to the result under review. A rule SHALL be returned until a later record accepts its object. `--scope project` on the call that records the "no" SHALL make it a project rule. Anti-goals and older rules SHALL stay project rules.

#### Scenario: A section rule retires when the section is accepted

- **WHEN** the owner rejects section hero with "Drop the gradient" and section hero is later accepted
- **THEN** actions before that acceptance SHALL return the rule as `section hero: Drop the gradient`
- **AND** later actions SHALL NOT return it, and `state.rules` SHALL still hold it

#### Scenario: An earlier "no" holds through the build

- **WHEN** the owner turns down a component recommendation with "No GPL libraries"
- **THEN** every action until the final acceptance SHALL return the rule

#### Scenario: The owner says "from now on"

- **WHEN** the "no" is recorded with `--scope project`
- **THEN** the rule SHALL be a project rule returned by every later action

#### Scenario: A bad scope is refused

- **WHEN** decide runs with `--scope everywhere`, or with `--scope` on a record that holds no "no"
- **THEN** it SHALL exit 1 and record nothing

#### Scenario: An anti-goal matching an earlier "no" still becomes a project rule

- **WHEN** a playback correction "No stock photos" is followed by a confirmed playback with `--anti-goal "No stock photos"`
- **THEN** `state.rules` SHALL hold a project rule with that text

### Requirement: Final acceptance offers to keep general rules

When rules with object scope exist, active or retired, the final review ask SHALL list them with where they came from and tell the agent to ask once whether to keep, for the rest of the project, those given about more than one object or phrased as a principle. `--promote "<from>"` (repeatable) on the owner's review record SHALL make every rule with that origin a project rule, recording `givenScope: "object"` and `promotedAt`. No rule SHALL change scope without the owner's answer.

#### Scenario: The owner keeps a retired rule

- **WHEN** section hero was accepted after "Drop the gradient", and the owner's final review is recorded with `--promote "section hero 1"`
- **THEN** that rule SHALL become a project rule with `givenScope: "object"` and be returned again

#### Scenario: Promotion names an unknown origin

- **WHEN** `--promote "section footer 9"` names no object rule, or the review is recorded `--by agent`
- **THEN** decide SHALL exit 1 and record nothing

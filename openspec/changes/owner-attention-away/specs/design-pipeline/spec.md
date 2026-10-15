# Spec Delta

## ADDED Requirements

### Requirement: The owner can answer an ask later

`decide --later [--until <time>]` SHALL record that the owner will answer the current owner ask later. While it holds, `next` SHALL return a `blocked` action of kind `owner` carrying the deferred ask. It SHALL ask again once the time passes, what is asked or what it shows changes, another ask is current, or the owner's answer is recorded. It SHALL refuse when `next` is not an owner ask.

#### Scenario: Deferred until a time

- **WHEN** the owner says "not now, tomorrow morning" at the final review and the agent records `decide --later --until 2026-10-16T09:00:00+08:00`
- **THEN** `next` SHALL return `blocked` with kind `owner`, the deferred ask and its `record` command, until that time, and the final review again after it.

#### Scenario: Activity wakes it early

- **WHEN** a review was deferred and the page it is about changes before the time, or a variants pick was deferred and the variants page changes
- **THEN** `next` SHALL ask again.

#### Scenario: Answering ends the deferral

- **WHEN** the owner answers before the time and the agent records the answer with `decide`
- **THEN** the answer SHALL be recorded as usual and the deferral SHALL be gone.

#### Scenario: Nothing to defer

- **WHEN** `next` is a self-check run, an art director's pick, blocked or done
- **THEN** `decide --later` SHALL exit 1 and record nothing.

#### Scenario: Invalid deferral

- **WHEN** `--until` is not a future time with its offset, `--until` comes without `--later`, or `--later` comes with `--stage`, `--verdict`, `--answer` or `--by`
- **THEN** `decide --later` SHALL exit 1 and record nothing.

#### Scenario: The agent's own records do not end it

- **WHEN** the owner deferred an ask and a record by the agent is added after it
- **THEN** `next` SHALL still return the deferral.

### Requirement: An owner ask catches the owner up

When the agent decided anything or a check ran since the owner's last recorded answer, an owner ask SHALL carry `away`: what the agent decided, which checks ran, and the decision now needed. Its `first` SHALL tell the agent to say this briefly before asking. Without such activity, or before any owner decision, it SHALL carry none.

#### Scenario: Self-checks while the owner was away

- **WHEN** the owner approved the description, the agent then self-checked two sections and the probe passed, and next asks the final review
- **THEN** the ask SHALL carry `away` listing those two agent decisions, the probe, and the question now asked.

#### Scenario: Nothing happened in between

- **WHEN** the owner's last answer is the latest record and no check ran since
- **THEN** the ask SHALL carry no `away`.

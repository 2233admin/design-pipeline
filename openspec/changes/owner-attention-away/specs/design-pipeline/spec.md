# Spec Delta

## ADDED Requirements

### Requirement: The owner can answer an ask later

`decide --later [--until <time>]` SHALL record that the owner will answer the current owner ask later. While it holds, `next` SHALL return a `blocked` action of kind `owner` carrying the deferred ask, and SHALL ask it again once the time passes, the page it is about changes, the current ask changes, or any decision is recorded. It SHALL refuse when `next` is not an owner ask.

#### Scenario: Deferred until a time

- **WHEN** the owner says "not now, tomorrow morning" at the final review and the agent records `decide --later --until 2026-10-16T09:00:00+08:00`
- **THEN** `next` SHALL return `blocked` with kind `owner`, the deferred ask and its `record` command, until that time, and the final review again after it.

#### Scenario: Activity wakes it early

- **WHEN** a review was deferred and the page it is about changes before the time
- **THEN** `next` SHALL ask the review again.

#### Scenario: Answering ends the deferral

- **WHEN** the owner answers before the time and the agent records the answer with `decide`
- **THEN** the answer SHALL be recorded as usual and the deferral SHALL be gone.

#### Scenario: Nothing to defer

- **WHEN** `next` is a self-check run, an art director's pick, blocked or done, or `--until` is not a future time, or `--later` comes with `--stage`, `--verdict`, `--answer` or `--by`
- **THEN** `decide --later` SHALL exit 1 and record nothing.

### Requirement: An owner ask catches the owner up

When the agent decided anything or a check ran since the owner's last recorded decision, an owner ask SHALL carry `away`: what the agent decided, which checks ran, and the decision now needed. Its `first` SHALL tell the agent to say this briefly before asking. Without such activity, or before any owner decision, it SHALL carry none.

#### Scenario: Self-checks while the owner was away

- **WHEN** the owner confirmed the playback, the agent then self-checked the description and two sections, and next asks the owner about a kept section
- **THEN** the ask SHALL carry `away` listing those three agent decisions and the question now asked.

#### Scenario: Nothing happened in between

- **WHEN** the owner's last decision is the latest record and no check ran since
- **THEN** the ask SHALL carry no `away`.

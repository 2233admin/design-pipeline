# Design

## Context

- `next` walks the stages and returns the first unfinished one's action. It returns at most one owner ask
  at a time:
  - an `ask` the owner faces, such as the playback, the variants, a kept section review or the final
    review;
  - delegated checkpoints come back as self-check `run`s;
  - an art director's picks carry `director`.
- `decide` records a decision. `roles.stampRecord` appends one `decisions.roles` entry `{stage, by, verdict,
  choice, answer, at}` per call. That list is the only ordered, timestamped log of who decided what.
- Gates record `{status, at}` (epoch ms) in `state.gates`.
- `blocked` is an existing action type: `{blocker: {kind, reason, needs}}`, line "blocked (kind): …", and
  `next` exits 2.

## Goals / Non-Goals

**Goals:**

- The owner can say "later" and the pipeline remembers it.
- The agent neither nags nor builds on a guess while it holds.
- A returning owner hears, in a line or two, what happened since their last decision, and then the one
  question.

**Non-Goals:**

- A multi-item inbox.
- Reminders that fire without anyone running `next`.
- Changing delegation after intake.
- Rule editing.
- Impact analysis of a "no".

## Decisions

### 1. The owner ask's identity

- An owner ask is a `next` result of type `ask` without `director`.
- Its identity is `{stage, section}`: the `next` stage id, and for a web section review its section id,
  else null.
- The same identity is what a deferral names and what wakes it when it changes.

### 2. `decide --later [--until <time>]`

- **What it is.** The owner's answer "not now" to the current owner ask.
- **What it takes.** It takes no `--stage`, `--choice`, `--verdict`, `--answer`, `--ref` or `--by`. It
  defers whatever `next` asks now, so it cannot name another ask.
  - It refuses when `next` is not an owner ask: a run, a self-check, a director's pick, blocked or done.
  - It refuses an `--until` that is not a valid time in the future.
  - `--until` takes an ISO 8601 time (`2026-10-16T09:00:00+08:00`), like Linear's "until a time".
- **What it records.** `state.pending = {ask: {stage, section}, question, until|null, basis, at}`.
  - `basis` is what the ask is about: the page digest for a web section or final review; otherwise null.
  - A second `--later` replaces it.
  - Nothing goes into `decisions.roles`: a deferral is not a decision, and the statement stays a record
    of decisions.
- **Alternative rejected:** a list of pending items. `next` asks one thing at a time; a list would hold
  items no stage can ask.

### 3. While it holds

`nextAction` computes the stage action as now. If it is the owner ask that `state.pending` names, and the
deferral still holds, it returns instead:

- `type: "blocked"`, `blocker: {kind: "owner", reason: "the owner chose to answer this later[, until <time>]",
  needs: "the owner's answer"}`;
- `deferred`: the ask as `next` would have returned it, so the agent can ask it word for word once the
  deferral ends;
- an `instruction`:
  - do not ask again before the time unless the owner writes;
  - do not build on a guess about the answer;
  - when the owner writes, ask the deferred question, then record the answer with its `record` command.

**It ends**, and `next` returns the ask again, when any of these happens:

- the time has passed;
- `basis` no longer matches, because the page the review is about changed (Linear: activity brings it back
  early);
- the current owner ask is a different one;
- `decide` records any decision. The owner answered, so `state.pending` is cleared with that record.

An agent that hears the owner write simply asks: the deferral binds `next`, not the conversation.
Answering early needs nothing more than the usual `decide`.

### 4. The catch-up on owner asks (`away`)

- **Baseline.** The `at` of the latest `decisions.roles` entry with `by: "owner"`, the Bitbucket model:
  - it moves only when the owner completes a decision;
  - with no owner entry yet, there is no catch-up.
- **What is listed since the baseline:**
  - **`decided`:** each role entry with `by: "agent"`, in order, rendered as the statement renders it, for
    example `Section review: accept hero (agent)`;
  - **`checks`:** each gate whose `at` is later, as `<gate>: <status>`;
  - **`needed`:** the current ask's question, the one decision now needed.
- **When it is shown.** `away: {since, decided, checks, needed}` is added only to an owner ask, and only
  when `decided` or `checks` is non-empty.
  - `first` begins: "Since the owner's last decision (<since>): the agent decided <n> (…); checks: …. Tell
    the owner this in a line or two before asking."
  - Stale approvals already lead the ask's own `first` (the page tier's "accepted … the page changed
    since"), with their before and after pictures in `show`, so they are not repeated.
- **Not shown** on a deferred (`blocked`) result. The agent is not talking to the owner then.

## Risks / Trade-offs

- **[A time passes but nobody runs `next`]** Nothing fires by itself. The pipeline is pull-based, and a
  scheduled check-in is the host's job.
- **[`--later` recorded by the agent without the owner saying so]** As with `--by`, the record is the
  agent's claim. It only delays an ask and never decides anything, so a wrong deferral costs time, not a
  decision.
- **[A long `decided` list]** It is capped at the first 8 entries, plus "and N more"; the statement keeps
  every entry.

## Migration

- New optional `state.pending`. Projects without it behave as before.
- Owner asks may carry `away`.

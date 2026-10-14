# Design

## Context

See proposal.md for the problem. These facts about the current code shape the approach. Each was
checked against the code, and the independent review re-checked them.

- **Delegation changes the author, not the ask.**
  - `nextAction` (`workflow-core.cjs`) returns each stage's action through `withRoles`, which only
    inserts `--by owner|agent` into the returned `decide` commands.
  - A delegated checkpoint therefore still returns `type: "ask"` with owner wording.
  - Only `--director` changes framing, with a `director` hint on concept, sample and build asks.
- **Defaults** (`roles.defaultEntry`): only `reference` and `deliver` default to the agent, plus
  quick web intake and directed picks under `--director`. `ensureDelegation` keeps stored entries
  and fills missing keys only.
- **Record paths need an ask.** Accepting a section (`web.recordSection`), recording a concept pick
  (`web.recordConcept`) and recording a sample verdict (`workflow-core.decide`) each require `next`
  to be an `ask`.
- **The build run also names a section.** The build `run` carries `section` while it shows findings,
  so `section` alone does not identify a review step.
- **Rules** are `{text, from, scope: "project"}`.
  - They are created by `web.addRule`, by the anti-goals in `recordIntake` (deduplicated against
    every rule's text), and by sample and draft rejects in `decide`.
  - A section reject with both `--answer` and `--evidence` creates several rules with the same
    `from`.
  - Every action returns all rule texts.
- **Role entries** (`decisions.roles[]`, written by `stampRecord`) are
  `{stage, by, agent?, verdict?, choice?, answer?, at}`:
  - concept picks and component decisions carry no `verdict`;
  - an intake skip carries `choice: "skip"`;
  - review and sample verdicts are `accept` or `reject`.
  - adopt-ai-fluency-decision-roles task 2.4a mentions a director note with `verdict: "recommend"`,
    but no code records one.
- **Component decisions** take no `--verdict accept`. They record `--choice` and `--answer`, and
  their corrections record `--verdict reject`.
- **Quick web intake** is a `run` recorded `--by agent`. `--keep` and `--delegate` need an intake
  recorded `--by owner`, so a quick project cannot change its delegation.
- **Creative intent** is a locked owner checkpoint in the map, but nothing records it. The
  statement prints "not yet recorded (planned in phase 2)".
- **Unarchived deltas.** The requirements for web conversation and decision roles live only in the
  unarchived deltas of `make-web-workflow-conversational` and `adopt-ai-fluency-decision-roles`.
  Their archive chain waits on `redesign-user-workflow`.
- **The baseline:** the default two-section brief-mode page asks the owner seven times: playback,
  variants, components, description, two sections and the final review.

## Goals / Non-Goals

**Goals:**
- With default delegation, the owner is asked only about the playback, the direction and the
  result.
- Each "no" is returned only while it applies.
- Records stay as complete as today for the statement and audit.

**Non-Goals (deferred, with the umbrella phase that takes them):**
- "Decide later", snooze and a pending-decision inbox: phase 4, absence.
- Narrowing, superseding or retiring a rule by hand, and changing delegation after intake:
  phase 4, delegation over time.
- Routing lasting cross-project preferences to the adaptation ledger: phase 4.
- Re-review in proportion to the change (change tiers): phase 2. The description approval still
  binds its upstream bytes.
- Page review lite: phase 3. Section reviews stay text comments.

## Decisions

### 1. Convert only the three web review checkpoints

`nextAction` converts an ask into a self-check when all of these hold:

- the stage is web `components` or `description`, or a web `build` that returns a section ask;
- the delegation entry for its checkpoint is `to: "agent"`;
- it is not a section routed to an art director.

The self-check is:

```
{type: "run", selfCheck: true, checkpoint, check, instruction, command, correction,
 show, questions, recommended, section}
```

- `check` is the self-check wording for each checkpoint, not the owner question.
- `command` is the record command (`--by agent`).
- `correction` carries `--by owner`, so an owner's "no" on delegated work has a command.
  - Components and description keep their own correction, re-stamped explicitly after
    `withRoles`, which skips commands that already carry `--by`.
  - The section ask has a single `record` with `--verdict accept|reject`, so its self-check builds
    `command` with `--verdict accept --by agent` and `correction` with `--verdict reject --answer
    "<owner's words>" [--evidence ...] --by owner`.

Intake, concept, sample and review keep their asks even when delegated. The record paths for
concept and sample need an ask. Intake records the owner's own words, so a correction after a skip
must not become a self-confirmation.

- **Alternative:** convert every delegated checkpoint. Rejected. It would need the concept and
  sample record paths changed as well. A self-check "against the confirmed playback and the chosen
  direction" does not fit a pick of the direction itself. And it would let the agent confirm a
  reopened playback.
- `roles.checkpointOf(state, stageId)` replaces the inline mapping in `defaultDelegation`.

### 2. A section self-check is recognised by `selfCheck`

`recordSection` accepts when `next` is either the section ask or a `selfCheck` run for that
section.

- `section` alone is not enough, because the build run carries it while findings are open.

### 3. Defaults move in `roles.defaultEntry`

`components` (every web tier), `description` and `section` default to the agent.

- At standard and full the intake delegation hint offers `--keep section` ("review each section
  with me"). The hint names it only when the project has a `section` checkpoint.
- Quick web keeps its defaults: its intake is the agent's statement, so there is no owner record
  to carry `--keep`.
- **Alternative:** a separate ask-budget setting. Rejected: it would be a second source for who
  decides.

### 4. Trade-off asks are owner records carrying `--tradeoff`

- The self-check says when to ask the owner and how to phrase it: what is new, the recommendation
  and its cost, how to see the difference. For component sources it asks only for a new
  dependency, a license obligation or a notable cost.
- The owner's reply is recorded with `--by owner` and `--tradeoff "<what was asked>"`:
  - on the record command (with `--by agent` replaced) when they take the recommendation;
  - on the correction command when they say no.
- The role entry keeps `tradeoff`, and the statement prints it. `--tradeoff` with `--by agent` is
  refused.
- **Alternative:** an `escalate` verdict that queues a pending ask. Rejected for now: that is the
  phase 4 inbox. It would add state without a consumer.
- **Not enforced:** whether a trade-off was real (see Risks).

### 5. Agents neither record nor undo a "no"

- `decide` refuses `--by agent --verdict reject`, except on a concept, section or sample pick
  routed to an art director. Directors keep their current behaviour.
- A `--by agent` accept is refused when the latest record for that section, or for the
  description, is a reject and the bytes are unchanged:
  - for a section, `pageSha256` equals the current page digest;
  - for the description, `sha256` equals the current brief.
- Without that check an agent could retire the owner's rule by accepting the page they rejected.
- **Alternative:** let only an owner accept retire a rule. Rejected: it would bring back the owner
  ask for every revised section.

### 6. Rule scope: a "no" binds to a section, the sample, or the result under review

- Rules from a "no" store `{scope: "object", object, since}`:
  - **object** is `{stage: "section", choice: id}` for a section, `{stage: "sample"}` for a sample,
    and `{stage: "review"}`, the result under review, for every other "no" (playback, variants,
    component round, description, draft).
  - **since** is the index of the rejecting call's own role entry in `decisions.roles`.
- An earlier "no" shapes the whole build, so it binds to the result. Binding it to its own
  checkpoint would retire "No GPL libraries" exactly when building starts.
- **Retiring:** a rule retires at the first role entry with an index greater than `since` that has
  its stage (and choice) and a verdict of `accept` or none. A reject does not retire it.
- **Returned rules:**
  - Actions return only active rules.
  - Section rules are prefixed `section <id>: ` and sample rules `sample: `.
  - Rules on the result and project rules return as plain text, as today. While a result is open,
    the agent applies both kinds alike.
- **`--scope`:**
  - `--scope project` (the existing string option) makes the rules a call creates project rules.
  - `object` is the default.
  - Other values fail, and so does `--scope` on a call that records no "no". A confirmed
    playback that carries only anti-goals records no "no"; its anti-goals are project rules
    anyway.
- **Anti-goals and older rules:** anti-goals are project rules. Their duplicate check compares only
  project rules, so an earlier correction with the same text cannot swallow one. Rules without
  `object` (every rule recorded before this change) read as project rules.
- **Alternatives:**
  - Compare `at` timestamps. Rejected: two calls in the same millisecond tie.
  - An explicit retire step. Rejected: it adds an owner action for the common case.

### 7. Promotion happens once, at the final review

- The review ask carries `ruleCandidates: [{from, object, text, active}]` for every object rule,
  active or retired.
- Its instruction asks once about those given about more than one object or phrased as a principle.
- `--promote "<from>"` is repeatable and goes in `REPEATABLE_OPTIONS`. It is accepted only on a
  `--by owner` review record. It promotes every object rule with that `from`, since a section
  reject with `--answer` and `--evidence` shares one.
- Promotion sets `scope: "project"`, `givenScope: "object"` and `promotedAt`, so a retired rule is
  returned again. Those two fields are the rule's history. Hand edits to rules are phase 4.
- An unknown or already-project `from` fails before any write.
- **Alternative:** ask at every "no". Rejected by the owner's decision 3 in design-owner-attention.

### 8. Language is one guidance line

Every ask, the no-state ask included, and every self-check carries `language`: "Speak to the owner
in the project's language: the brief's, else the one the owner writes in. Translate the wording
here; keep commands, ids and file names unchanged."

- **Alternative:** a translated string table. Rejected: the agent relays every ask anyway, so a
  table would double the strings to maintain.
- The diligence statement stays in English for the PR.

### 9. The playback card records creative intent

- The intake instruction asks for a card: three intent lines, open uncertainties and the
  delegation line, instead of a 200-300 word playback.
- An owner-recorded confirmed playback in a project whose map has `creative-intent` appends a
  `creative-intent` owner role entry carrying the card text.
- The statement lists creative intent as not stated only when no such entry exists.
- **Alternative:** the fifth intake question and the `Product Context` label check from
  adopt-ai-fluency-decision-roles phase 2. Superseded by design-owner-attention H. This change
  removes those two unimplemented requirements.

### 10. Wording that promised "project rule" changes with the scope

These strings say "becomes a project rule" or "is now a project rule" and are reworded to "becomes
a rule":

- the intake, variants, components, description and section texts in `web.cjs`, including
  `CONVERSATION`;
- the sample and review reject messages in `workflow-core.cjs`;
- the review texts in `shared.cjs`.

The guides (`workflow-web.md`, `workflow-film.md`, `workflow-edit.md`) follow. Tests asserting
`scope: "project"` on new rules, and plain rule texts for section rules, are updated to the new
shape.

### 11. In-flight deltas are corrected in place

The superseded requirements are not in `openspec/specs/`, so MODIFIED cannot target them. A second
ADDED requirement would contradict them at archive.

- `make-web-workflow-conversational` gets these edits in place:
  - the skip scenario of "Web intake ends in a confirmed playback or a stated skip";
  - "two human decisions";
  - "Web build follows an explicit component source decision";
  - "Web concrete decisions are asked in numbered rounds";
  - "A no in a decision round becomes a rule";
  - "Web build waits for an approved description";
  - "Web pages are built and reviewed one section at a time";
  - "Every web rejection becomes a project rule";
  - "Anti-goals become project rules", for the dedupe.
- `adopt-ai-fluency-decision-roles` loses "The brief states creative intent", "Product Context
  names the creative intent" and its tasks 3.x.
- Each edited change's design notes the edit and points here.

## Risks / Trade-offs

- **[The agent approves weak sections the owner would have caught]**
  - Final acceptance stays locked to the owner.
  - The playback offers section reviews.
  - The agent cannot self-accept unchanged work the owner rejected.
  - The statement lists every agent decision.
- **[The agent never asks about a real trade-off]**
  - Code cannot judge that.
  - The umbrella walkthrough (design-owner-attention 3.1) counts missed key questions and rework
    beside the ask count. Fewer asks with more rework is a regression.
- **[The agent-accept guard compares bytes]**
  - Any change, even whitespace, lets the agent accept a section the owner rejected.
  - Judging whether the change answers the "no" is beyond code. The owner's final acceptance of
    the whole page is the backstop, and the statement shows every agent accept.
- **[A general section "no" retires with its section]**
  - The final review lists every object rule and asks once.
  - Anti-goals are project rules.
  - `--scope project` covers "from now on".
- **[In-flight delta edits blur change history]**
  - Each edit is named in that change's design and in this one.
  - The stuck archive chain is a separate follow-up.
- **[Tests assume owner asks]**
  - Helpers record `--by owner`, which any checkpoint accepts.
  - The ask-count walk switches the three delegated calls to `--by agent`, so the new defaults are
    exercised.
  - Tests of an owner ask's shape keep the checkpoint with `--keep`.

## Migration

- **State fields:** rules gain the optional `object`, `since`, `givenScope` and `promotedAt`. Role
  entries gain the optional `tradeoff`.
- **Old rules:** they have no `object`, so they read as project rules, which they were.
- **Projects in progress:** they keep their stored delegation entries. A project from before #112
  has no map, so it gets the new defaults on its next `next` or `decide`.
- **Rollback:** reverting the code is enough; the extra fields are ignored.

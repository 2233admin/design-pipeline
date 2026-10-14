# Design

## Context

See proposal.md for the problem. Facts about the current code that shape the approach:

- **Delegation changes the author, not the ask.**
  - `nextAction` (`workflow-core.cjs`) returns each stage's action through `withRoles`, which only
    inserts `--by owner|agent` into the returned `decide` commands.
  - A checkpoint delegated to the agent therefore still returns `type: "ask"` with owner wording.
  - Only `--director` changes framing, with a `director` hint on concept, sample and build asks.
- **Defaults** (`roles.defaultEntry`): only `reference` and `deliver` default to the agent, plus
  quick web intake and directed picks under `--director`. Components, description and section
  default to the owner.
- **Accepting a section** (`web.recordSection`) requires `next` to be an `ask` about that section.
- **Rules** are `{text, from, scope: "project"}`.
  - They are created by `web.addRule`, and by sample and draft rejects in `workflow-core.decide`.
  - They are never retired, and every action returns all their texts.
- **Role entries** (`decisions.roles[]`, written by `roles.stampRecord`) are
  `{stage, by, agent?, verdict?, choice?, answer?, at}` for every record. Some accepts carry no
  verdict:
  - concept picks and component decisions record no `verdict`;
  - an intake skip records `choice: "skip"`.
  - Review and sample verdicts are only `accept` or `reject`. adopt-ai-fluency-decision-roles task
    2.4a describes a director note with `verdict: "recommend"`, but no code records one.
- **Creative intent** is a locked owner checkpoint in the map, but nothing records it. The
  statement prints "not yet recorded (planned in phase 2)".
- **Unarchived requirements.** `make-web-workflow-conversational` and
  `adopt-ai-fluency-decision-roles` are not archived (their archive chain waits on
  `redesign-user-workflow`). Their web and decision-role requirements live only in those change
  deltas, not in `openspec/specs/`.

## Goals / Non-Goals

**Goals:**
- An agent-delegated checkpoint returns a self-check, so default delegation decides who is asked.
- Each "no" is returned only while it applies.
- Every record stays as complete as today for the statement and audit.

**Non-Goals (deferred, with the umbrella phase that takes them):**
- "Decide later", snooze and the pending-decision inbox: phase 4, absence.
- Narrowing, superseding or retiring a rule by hand, and changing delegation after intake:
  phase 4, delegation over time.
- Routing lasting cross-project preferences to the adaptation ledger: phase 4. There is no code
  link today, and this change adds none.
- Re-review in proportion to the change (change tiers): phase 2. The description approval still
  binds its upstream bytes as today.
- Page review lite: phase 3. Section reviews stay text comments.

## Decisions

### 1. Convert asks to self-checks in `nextAction`, from the delegation map

`nextAction` maps the stage to its checkpoint. A web `build` stage that returns a section ask maps
to `section`. When the entry is `to: "agent"`, is not locked, and is not an art-director pick under
`--director`, the ask becomes `{type: "run", selfCheck: true, checkpoint, check: <the question>,
command: <record>, instruction}`. It keeps `show`, `questions`, `recommended` and `section`, and
drops `correction` and `skip`.

- **Alternative:** each stage builds its own self-check. Rejected: five stages would duplicate one
  rule, and future checkpoints would need it again. The map already is the single source of who
  decides.
- `roles.checkpointOf(state, stageId)` replaces the inline mapping in `defaultDelegation`, so the
  defaults and the conversion use one mapping.

### 2. Defaults move in `roles.defaultEntry`; nothing else changes

`components`, `description` and `section` are added to the agent defaults. These checkpoints exist
only in web workflows. The owner keeps any of them with the existing `--keep` on the intake record.
The intake delegation hint offers "review each section with me" as `--keep section`.

- **Alternative:** a new "budget" setting. Rejected: it would be a second source of who decides.

### 3. Trade-off asks are an owner record with `--tradeoff`, not a queue

The self-check tells the agent when an owner ask is warranted, and in what shape: what is new, the
recommendation and its cost, and how to see it. The owner may always record (`recordRole` lets
`--by owner` through on any checkpoint), so the owner's reply is recorded with `--by owner
--tradeoff "<what was asked>"`. The role entry keeps `tradeoff`, and the statement prints it.
`--tradeoff` with `--by agent` is refused.

- **Alternative:** an `escalate` verdict that queues a pending owner ask. Rejected for now: it is
  the phase 4 inbox. Adding it here would add state without a consumer.
- **Not enforced:** the pipeline cannot tell whether a trade-off was real. Measuring missed key
  questions in the walkthrough covers this (Risks).

### 4. Agents never record a reject

`decide` refuses `--by agent --verdict reject` unless the checkpoint is a director pick under
`--director` (concept, section, sample). A director's reject keeps its current behaviour.

- **Alternative:** let an agent reject and leave no rule. Rejected: a reject with no rule is a
  record with no effect. The self-check fixes the work instead.

### 5. Rule scope is computed from the role entries

- `addRule` (web) and the sample and draft rejects store
  `{text, from, scope: "object", object: {stage, choice?}, since: <index in decisions.roles>}`.
  `since` is the index the rejecting call's own role entry takes.
- The objects are:
  - playback: `{stage: "intake"}`
  - variants: `{stage: "concept"}`
  - component round: `{stage: "components"}`
  - description: `{stage: "description"}`
  - section: `{stage: "section", choice: id}`
  - sample: `{stage: "sample"}`
  - reviewed result: `{stage: "review"}`
- An object rule is active until a role entry after `since` matches its stage (and choice) with a
  `verdict` of `accept` or none. Any other verdict, `reject` today, does not retire a rule.
- Actions return active rules. An object rule is labelled with its object, for example
  `section hero: Drop the gradient`.
- `--scope project` (the existing string option) makes the rules a call creates project rules. Any
  other value except `object` fails.
- Anti-goals and rules without `object` are project rules. That covers every rule recorded before
  this change, so no migration is needed.
- **Alternatives:**
  - Compare `at` timestamps. Rejected: two calls in the same millisecond tie, and tests run that
    fast.
  - An explicit retire step. Rejected: it adds an owner action for the common case.

### 6. Promotion happens once, at the final review

- The review ask (`shared.REVIEW`) carries `ruleCandidates: [{from, object, text}]` for object
  rules that have not been promoted. Its instruction tells the agent to ask once about those given
  about more than one object or phrased as a principle.
- `--promote "<from>"` (repeatable, new) is accepted only on a `--by owner` review record. It sets
  `scope: "project"`, `givenScope: "object"` and `promotedAt`.
- An unknown or already-project `from` fails before any write.
- **Alternative:** ask at every "no". Rejected by the owner's decision 3 in design-owner-attention.

### 7. Language is one guidance line, not a string catalogue

Every ask and self-check carries `language`: "Speak to the owner in the project's language: the
brief's, else the one the owner writes in. Translate the wording here; keep commands, ids and file
names unchanged."

- **Alternative:** a translated string table. Rejected: the agent relays every ask anyway, so a
  table would double the strings to maintain and still need the agent.
- The diligence statement stays in English for the PR, as design-owner-attention I places it.

### 8. The playback card records creative intent

- The intake instruction asks for a card: three intent lines, open uncertainties and the
  delegation line, instead of a 200-300 word playback.
- On an owner-recorded confirmed playback in a project whose map has `creative-intent`, `decide`
  appends a `creative-intent` role entry by the owner, carrying the card text.
- The statement lists creative intent as not stated only when no such entry exists.
- **Alternative:** the fifth intake question and the `Product Context` label check from
  adopt-ai-fluency-decision-roles phase 2. Superseded by design-owner-attention H; this change
  removes those two unimplemented requirements from that change.

### 9. In-flight deltas are corrected in place

The superseded requirements are not in `openspec/specs/`, so this change cannot target them with
MODIFIED. A second ADDED requirement with the same intent would contradict them at archive.

- `make-web-workflow-conversational` gets these edits in place:
  - "Web intake ends in a confirmed playback or a stated skip" (skip scenario);
  - "two human decisions";
  - "Web build follows an explicit component source decision";
  - "Web concrete decisions are asked in numbered rounds";
  - "A no in a decision round becomes a rule";
  - "Web build waits for an approved description";
  - "Web pages are built and reviewed one section at a time";
  - "Every web rejection becomes a project rule".
- `adopt-ai-fluency-decision-roles` loses "The brief states creative intent" and "Product Context
  names the creative intent", and its tasks 3.x.
- Each edited change's design notes the edit and points here.

## Risks / Trade-offs

- **[The agent approves weak sections the owner would have caught]**
  - Final acceptance stays locked to the owner and is asked on the whole page.
  - The playback offers section reviews (`--keep section`).
  - The statement lists every agent decision.
- **[The agent never escalates a real trade-off]** No code can judge that.
  - The umbrella's walkthrough (design-owner-attention task 3.1) counts missed key questions and
    rework beside the ask count.
  - Fewer asks with more rework is a regression.
- **[A general "no" retires with its object]**
  - The final review lists object rules and asks once.
  - Anti-goals are project rules from the start.
  - `--scope project` covers "from now on".
- **[In-flight delta edits blur change history]** Each edit is named in that change's design and
  in this one. The stuck archive chain is reported as a separate follow-up, not fixed here.
- **[Existing tests assume owner asks]**
  - Helpers keep recording `--by owner`, which any checkpoint accepts.
  - Tests that check an ask's shape keep the checkpoint with `--keep`, so they still test the ask.

## Migration

- **State shape:** rules gain the optional `object`, `since`, `givenScope` and `promotedAt`; role
  entries gain the optional `tradeoff`.
- **Old rules:** they have no `object` and read as project rules, which they were.
- **Projects in progress:** they keep their stored delegation entries. `ensureDelegation` keeps
  existing entries, so only new projects get the new defaults.
- **Rollback:** reverting the code is enough; the extra fields are ignored.

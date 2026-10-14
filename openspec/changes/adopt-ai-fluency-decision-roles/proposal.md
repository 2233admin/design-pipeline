## Why

The pipeline already asks the owner at real checkpoints, keeps every "no" as a project rule and
refuses to let a gate claim creative or visual acceptance. What it cannot say is **who decided**.

- No decision record carries an author. `decide` writes `state.decisions` entries with `at` and
  `verdict` only, and the change-level event (`design-pipeline.event.v2`) has no actor field.
- With `--director`, the concept, section and final-review asks go to an AI art director, yet the
  stored record looks exactly like the owner's.
- `direction-preview.md` allows "the user's selection or the bounded autonomous selection", and the
  stored `decision` cannot tell them apart. `template select` defaults its reason to
  `user-selected-template` whoever selected.
- Quick web work already "states what was decided for the owner", but that delegation is recorded
  as an ordinary intake answer.
- The brief asks for audience, actions, surface and success criteria. It never asks what the work
  should express, what relationship it builds with its audience, or what makes it not generic.
  DESIGN.md `Product Context` is required but only its heading is checked.
- Nothing at delivery tells the owner, a reviewer or a PR reader what the AI did and what the
  owner decided.

The owner approved adopting Anthropic's AI Fluency 4D framework (Dakan and Feller) and its
creative-work course as the model for these gaps, with these decisions:

1. Embed the 4Ds in the existing checkpoints; add no new gate.
2. Defaults per checkpoint; the owner changes only what they care about.
3. Final acceptance is always the owner's.
4. Owner reasons are kept as plain text in the ignored local `.design-pipeline/` directory.
5. The diligence statement also supplies an `Assisted-by:` line for commits and PRs.
6. Roll out in three phases: decision roles and the statement first, creative intent second,
   reasons and the collaboration retrospective third.

## What Changes

**Delegation: who may decide each checkpoint.**

- Every checkpoint gets a delegation entry, `owner` or `agent`, with per-deliverable defaults.
- Defaults are shown in the intake playback and changed with `--delegate <checkpoint>` and
  `--keep <checkpoint>` on the intake record.
- Quick tier's stated decision records intake as delegated.
- `next --director <model>` delegates the concept pick, section reviews and film/edit sample
  verdicts to that model by default.
- Two checkpoints are locked to the owner: final acceptance and creative intent. Neither can be
  delegated.
- Every deliverable at every tier ends with the owner's acceptance (owner decision): aesthetic
  quality cannot be accepted the way working code is. Web quick gains a review after its probe and
  ui gains one before delivery, following film/edit quick, which already end at the owner's review.

**Decision roles: each record says who decided.**

- `decide` requires `--by owner|agent`; there is no default, so every record is an explicit claim.
- `--by agent` is refused unless the checkpoint is delegated, and it is always refused on a locked
  checkpoint.
- Agent records also name the agent: the director model or the `--assisted-by` tool.
- The direction-preview `decision`, the selection receipt (`selectedBy`) and the template `approval`
  gain the same field. An agent direction selection carries its own delegation evidence, because
  `direction check` sees only the change root.
- A record written before this change reads as `unknown`, never as the owner.

**Description: creative intent, following the course's Creative Value Lens.**

- The brief gains `creativeIntent` with three facts:
  - `expression`: the point of view or attitude;
  - `connection`: the relationship with the audience;
  - `distinctiveness`: what it must not look like, with anti-references.
- Guided intake asks it as a fifth question. Agent-sourced answers stay unresolved, as the existing
  intake rule already does.
- Web playback includes the three facts, and existing anti-goals count as distinctiveness.
- `check-design-foundation` requires `Product Context` to name all three. English or Chinese labels
  are accepted, the same way `Source Decisions` already accepts 采纳/拒绝.

**Discernment: owner picks carry a reason.**

- A variant pick and the final acceptance by the owner need a reason of at least three words, using
  the existing minimum-content rule. A director's recommendation, when present, is recorded next to
  the owner's pick.
- At delivery, one optional question about how the collaboration went is offered. Its answer becomes
  an existing shadow-mode `adaptation record` candidate.

**Diligence: a statement at delivery.**

- Delivery writes `.design-pipeline/diligence.md`, generated only from state. It lists:
  - owner decisions with their reasons;
  - delegated agent decisions;
  - unknown-author records;
  - the number of project rules;
  - technical gates, kept separate from owner acceptance;
  - an `Assisted-by: <tool>` line.
- The statement binds the state hash and the delivery bindings already recorded (`deliveredSha256`
  for files, `deliveryInputHashes` for reviewed inputs) and goes stale when any of them changes.
- `next` accepts `--assisted-by "<tool>"` once at init.

## Capabilities

- `design-pipeline`: ADDED requirements:
  - `Checkpoints declare their delegation`
  - `Final acceptance and creative intent stay with the owner`
  - `Decisions record who decided`
  - `The brief states creative intent`
  - `Product Context names the creative intent`
  - `Owner picks carry a reason`
  - `Delivery writes a diligence statement`
  - `Collaboration retrospective is optional`

## Reuse

The change adds no gate, receipt schema, policy digest or feedback system. It reuses:

- `next`/`decide` and `.design-pipeline/state.json` for delegation and decision roles;
- the brief fact `source: known|user|agent` rule that agent facts cannot resolve a core field;
- the guided-intake question table and skip shape;
- the web minimum-content rule (`statement`/`reason`) for reasons;
- web anti-goals as distinctiveness;
- the `Source Decisions` label check pattern in `check-design-foundation`;
- delivery's existing `deliveredSha256` and `deliveryInputHashes` bindings for the statement;
- shadow-mode `adaptation record` for the retrospective.

## Impact

- **Agents:**
  - Every `decide` call now names `--by`. Without it the call fails with a usage error (exit 1) that
    says how to fix it.
  - SKILL.md tells agents to claim `owner` only for the owner's own words in this conversation.
- **Owners:**
  - One added intake question, which can be skipped.
  - A delegation line in the playback.
  - A reason on the variant pick and the final acceptance.
  - A statement at delivery.
- **Quick web and ui work:** one added ask, the final acceptance.
- **`--director` runs:** the director keeps reviewing concepts, sections and samples, but final acceptance
  asks the owner.
- **In-flight projects:** earlier records show `unknown` in the statement. A project without
  creative intent in `Product Context` reports `synthesis-required` until it is added. No migration
  layer is added.
- **Not covered:**
  - Change-level native visual-task events: they need the event schema to gain an actor field.
  - Translated statement labels.
- **Limitation, stated in docs:** `--by owner` is the agent's claim, not proof of a human. Like the
  existing hash bindings, it exposes mislabelled or missing records, but cannot prevent a forged
  one.

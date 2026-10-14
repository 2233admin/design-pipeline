# Proposal

## Why

A two-section standard web page asks the owner seven times: the playback, variants, component
sources, the description, each of the two sections, and the final review. Most of those asks repeat what the
owner already settled, so owners approve recommendations they never judged.

`design-owner-attention` (#115) set the direction and the owner's decisions. This is its phase 1
(design A, D and H): ask only where something is new, speak the project's language, and scope each
"no" to what it was about.

## What Changes

- **Delegated web reviews become self-checks.** When the delegation map hands the web components,
  description or section checkpoint to the agent, `next` returns a `run` self-check instead of an
  owner-style `ask`. Intake, concept, sample and final review keep their asks. Today delegation changes
  only the `--by` in the returned command, so the owner is still asked.
- **New web defaults.** Component sources (every tier), the description and section reviews
  (standard and full) default to the agent. At standard and full the owner keeps any of them
  with the existing `--keep` on the intake record, for example "review each section with me" as `--keep section`.
  Variants, the playback and final acceptance stay with the owner. The two-section sample drops to
  three owner asks.
- **Asks on delegated work name their trade-off.** A self-check tells the agent to ask the owner
  only when the work carries a trade-off the owner has not settled. For component sources, that
  means a new dependency, a license obligation or a notable cost. The owner's reply is recorded with
  `--by owner` and the new `--tradeoff "<what was asked>"`, which the diligence statement shows.
- **An agent cannot record or undo a "no".** A self-check records the decision once the work
  matches. `--by agent --verdict reject` is refused outside art-director routing, and an agent
  cannot accept a section or description the owner rejected until its bytes change.
- **The playback is a short card,** not a 200-300 word text: three intent lines (expression,
  connection, distinctiveness), the open uncertainties and the delegation line. The owner
  confirming it records creative intent. This replaces the planned fifth intake question and
  removes the "planned in phase 2" line from the statement.
- **Owner-facing language.** Every ask and self-check carries a `language` line: speak to the owner
  in the brief's language, else the language they write in.
- **A "no" is scoped to what it was about.**
  - A section "no" binds to that section and a sample "no" to the sample. Every other "no"
    (playback, variants, component round, description, draft) binds to the result under review,
    because it shapes the whole build. A rule is returned until its object is next accepted.
  - `--scope project` on the recording call makes it a project rule when the owner says "from now
    on".
  - The final review lists the object rules, including retired ones. The agent asks once whether
    to keep the general-looking ones, and records `--promote "<from>"` for each one the owner
    keeps.
  - Anti-goals and rules recorded before this change stay project rules.
- **In-flight deltas are corrected in place.** `make-web-workflow-conversational` and
  `adopt-ai-fluency-decision-roles` were not archived, and some of their requirements described
  superseded behaviour. They were edited in place, and the two unimplemented creative-intent
  requirements were removed. (`make-web-workflow-conversational` has since been archived in #136,
  so those edits are now in `openspec/specs/`.)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: adds requirements for delegated self-checks, the web delegation defaults,
  trade-off asks, the playback card and creative intent, owner-facing language, and rule scope and
  promotion.

## Impact

- **Code:**
  - `skill/scripts/workflow-core.cjs`: `nextAction` self-check conversion and the language line;
    `decide` handles `--scope`, `--promote` and `--tradeoff`, and refuses an agent reject.
  - `skill/scripts/workflows/roles.cjs`: defaults, the checkpoint-of-stage helper, the creative-intent
    record, and the statement.
  - `skill/scripts/workflows/web.cjs`: rule scope in `addRule`, the playback card instruction, and
    the section accept check.
  - `skill/scripts/workflows/shared.cjs`: the review ask lists rule candidates.
  - `skill/scripts/cli-core.cjs`: registers `--promote` and `--tradeoff` (`--scope` exists).
- **Reused, not added:**
  - the delegation map and `--keep`;
  - the `decisions.roles` entries, which also decide when an object rule retires;
  - the existing review ask;
  - the adaptation ledger stays separate.
  - No new gate, schema or state file.
- **Docs:** `skill/references/workflow-web.md`, `skill/SKILL.md`, `skill/references/stages.md`,
  CLI help, CHANGELOG.
- **Tests:** `tests/workflow-next.test.cjs` and `tests/helpers/web-flow.cjs`, plus an ask-count walk
  of the two-section sample.

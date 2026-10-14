# Design: AI Fluency decision roles on the existing next/decide machine

## Context

`next` returns one action per call and `decide` records the owner's replies in
`.design-pipeline/state.json` (`design-pipeline.workflow-state.v1`).

- Decision history lives in `state.decisions`, written by `workflow-core.cjs` and
  `workflows/{web,film,edit}.cjs`.
- Each history entry carries `at` and `verdict`, plus stage fields such as `choice`, `reason` and
  `sha256`.
- Rejections append to `state.rules`.

Other records that matter here:

- **Brief facts** (`design-pipeline.design-brief.v1`) already carry `source: known|user|agent`. An
  `agent` fact never resolves a core field.
- **Direction preview** stores `decision {status, selectedDirectionId, rationale}`.
- **Template approval** stores `{reviewer, rationale, planContentHash}` in plain text.
- **`--director <model>`** routes the `concepts`, `sample`, `build` (section) and `review` asks to an
  art director model.
- **The adaptation ledger** hashes actor labels and reasons. It governs changes to the skill itself,
  not design decisions, and this change leaves it alone.

The model is Anthropic's AI Fluency framework (Dakan and Feller). It has four competencies:

| Competency | Sub-competencies |
|---|---|
| Delegation | problem, platform and task awareness |
| Description | product, process and performance |
| Discernment | product, process and performance |
| Diligence | creation, transparency and deployment |

It also names three interaction modes:

- **automation:** the human specifies a task and the AI executes it;
- **augmentation:** the human and the AI iterate as thinking partners;
- **agency:** the human configures the AI to act independently.

The creative-work course adds the Creative Value Lens: creative expression, human connection and
distinctiveness.

Two mature disclosure practices set the shape of the statement:

- **Fedora's AI-assisted contributions policy:** the contributor stays accountable, discloses
  significant AI use with an `Assisted-by:` trailer, and a human makes the final acceptance call.
- **The IPTC digital source type vocabulary** (used by C2PA content credentials) separates media
  made by people, made by a trained model, and composites of both. That three-way split is the
  reason for keeping `owner`, `agent` and "agent proposed, owner chose" distinct here.

## Goals and non-goals

**Goals:**

- Every decision says who made it.
- Delegation is visible and changeable before work starts.
- Final acceptance and creative intent cannot be taken by an agent.
- The brief and DESIGN.md state creative intent.
- Owner picks carry a reason.
- Delivery produces a statement that is generated from state, not written by the model.

**Non-goals:**

- Proving that a human typed a decision. `--by` is a claim, stated as such.
- A new gate, receipt schema, policy digest or feedback system.
- Change-level native visual-task events; see the follow-up.
- Translating statement labels.
- Teaching the 4D vocabulary to owners. Owners see questions, a delegation line and a statement,
  never the framework names.

## Mapping

| 4D | Where it lives | What the owner sees |
|---|---|---|
| Delegation (task delegation) | `state.delegation`, set at intake | one delegation line in the playback |
| Description (product) | `brief.creativeIntent`, DESIGN.md `Product Context` | a fifth intake question |
| Description (process, performance) | existing conversation rules and adaptation dimensions | unchanged |
| Discernment (product) | owner reasons on picks and acceptance | "why this one?" |
| Discernment (process) | the existing intake playback | unchanged |
| Discernment (performance) | optional retrospective → `adaptation record` | one optional question |
| Diligence (creation) | `state.assistedBy` | nothing |
| Diligence (transparency) | `.design-pipeline/diligence.md` | the statement at delivery |
| Diligence (deployment) | final acceptance locked to the owner | the final ask is theirs |

## Decisions

### 1. One vocabulary: `owner` and `agent`

- A record's `by` is `owner` or `agent`. An agent record also has `agent`, a free-text name: the
  director model, else `state.assistedBy`, else `unspecified`.
- "Co-created" is not a third value. It is derived: an owner record whose ask offered agent-made
  candidates, or that carries a director `recommended` field, is reported as "owner chose from agent
  proposals".
- Reading a record without `by` yields `unknown`.

This keeps the stored vocabulary to two words, while the statement still shows the IPTC-style
three-way split.

### 2. Delegation map

`state.delegation` maps a checkpoint id to `{ to: "owner" | "agent", locked?: true, set: "default" | "owner" }`.
Checkpoint ids are the public `decide --stage` names (`intake`, `reference`, `concept`,
`components`, `description`, `section`, `sample`, `review`, `deliver`), plus `creative-intent`. The
internal workflow stage ids, such as `concepts` or `build`, are never accepted by `--delegate`.

- `initState` writes the defaults for the deliverable.
- The intake record applies `--delegate <checkpoint>` (to agent) and `--keep <checkpoint>` (to
  owner), each repeatable. Both flags are new; register them in `KNOWN_OPTIONS`.
- An unknown checkpoint id, or `--delegate` on a locked checkpoint, fails with exit 1.

Defaults:

| Deliverable, tier | Checkpoint | Default | Locked |
|---|---|---|---|
| web standard/full | `intake` (playback) | owner | no |
| | `creative-intent` | owner | yes |
| | `reference` | agent | no |
| | `concept` (variant pick) | owner; agent with `--director` | no |
| | `components` | owner | no |
| | `description` | owner | no |
| | `section` | owner; agent with `--director` | no |
| | `review` (final acceptance) | owner | yes |
| | `deliver` | agent | no |
| web quick | `intake` (stated decision) | agent | no |
| | `components` | owner | no |
| | `deliver` | agent | no |
| film/edit standard/full | `intake` | owner | no |
| | `creative-intent` | owner | yes |
| | `concept` | owner; agent with `--director` | no |
| | `sample` | owner; agent with `--director` | no |
| | `review` | owner | yes |
| | `deliver` | agent | no |
| ui (all tiers) | `intake` | owner (not asked at quick) | no |
| | `deliver` | agent | no |

Further rules:

- A web standard/full intake skip (`--choice skip`) is itself a delegation. It records `intake` as
  agent with `set: "owner"`, because the owner chose to skip.
- `creative-intent` stays owner and locked. If the owner skipped, it is reported as "not stated by
  the owner", never filled in by the agent.
- The final-acceptance lock applies to the `review` checkpoint, which exists only in web, film and
  edit at standard and full. Web quick and every ui tier have no `review` stage: their `deliver` is
  recorded by the agent, and the statement says plainly that no owner acceptance was recorded. That
  is honest reporting, not a failure. This change adds no owner gate to ui; whether ui should gain
  one is an open owner decision (see Open questions).
- The web standard/full playback instruction gains one line naming what the agent will decide, for
  example: "I'll pick the reference; you pick the first screen, the components, the description,
  each section and the final page." The owner corrects that line like any other part of the
  playback.

### 3. `decide --by`

- `--by owner|agent` is required on every `decide` call that records a checkpoint. A missing value
  fails with exit 1: "Fix: add --by owner when these are the owner's words, --by agent when you
  decided under delegation."
- `--by agent` on a checkpoint whose entry is `owner` fails with exit 1 and names the
  `--delegate` fix.
- `--by agent` on a locked checkpoint fails with exit 1 and has no fix offered.
- Under `--director`, an ask routed to the director is recorded with `--by agent` and
  `agent: <director>`. The final review ask is no longer routed to the director (Decision 5).
- `by` (and `agent` when needed) is added to every history entry `decide` writes: intake, playbacks,
  variants, components rounds, descriptions, sections, samples, drafts and delivery.
- The direction-preview `decision` gains `by`, `agent` and, for agent selections, `delegation`.
  `direction check` receives only the change root, so the artifact carries its own evidence:
  - `delegation: {source: "workflow-state", stateSha256}` when the change runs under a `next`
    workflow. With `--project-root`, the check reads `.design-pipeline/state.json`, verifies the
    hash and that `concept` is delegated to the agent; without it, it reports the claim as
    unverified in its output but does not fail.
  - `delegation: {source: "owner-instruction", quote}` for standalone runs. `quote` is the owner's
    instruction, at least six words under the existing minimum-content rule.
  - `selection` fails when `by` is missing, when an agent selection has no `delegation`, or when a
    verified workflow state shows `concept` belongs to the owner.
  - The prose "bounded autonomous selection" now means one of these two delegations.
- The selection receipt (`createSelectionReceipt`) gains `selectedBy: owner|agent` from its input,
  and `assertSelectionReceipt` requires it. The `user-selected-template` default reason is used only
  when `selectedBy` is `owner`; an agent selection needs an explicit `selectionReason`.
- The later template `approval` gains its own `by`. It is a separate decision and does not inherit
  `selectedBy`.

### 4. Creative intent

**Brief.**

- `creativeIntent` is added to `BRIEF_KEYS` as `{ expression, connection, distinctiveness }`. Each
  is a fact `{value, source}`.
- `QUESTION_DEFINITIONS` gains `intake-creative-intent` after `intake-success-criteria`:
  - prompt: "What should this feel like, who is it for in spirit, and what must it not look like?";
  - the three facts are asked together and each can be skipped with a reason.
- Agent-sourced facts stay unresolved, using the existing rule. `confirmDesignBrief` accepts
  skipped facts but never agent-only facts.

**Web playback.**

- The playback instruction requires three marked lines (expression, connection, distinctiveness)
  in the owner's words.
- Each `--anti-goal` is also listed under distinctiveness. It is not stored twice: the statement
  reads `state.rules`.

**DESIGN.md.**

- `Product Context` must contain the three labels, matched case-insensitively:
  - `Expression` / `表达`;
  - `Connection` / `连接` / `受众关系`;
  - `Distinctiveness` / `独特性`.
- A missing label returns `synthesis-required` with the missing label named, not `invalid`. The
  file is well-formed but incomplete, which is the existing meaning of that status.
- The repository's own `DESIGN.md` is updated to pass.

### 5. Owner reasons and the director

- The owner's variant pick (`--verdict pick`) and the final acceptance (`--stage review --verdict
  accept`) require `--answer` of at least three words, using the existing `reason()` helper. Agent
  records need no reason.
- When a director recommended a variant or a draft, the next owner record stores
  `recommended: {by: "agent", agent, choice}`. The statement then shows "owner chose B; director
  recommended A".
- `--director` no longer routes the `review` ask. The director may still produce a review note,
  recorded as an agent `drafts[]` entry with `verdict: "recommend"`, before the owner's acceptance.
- Reasons are stored as plain text in `.design-pipeline/state.json`, which is local and ignored by
  Git. The adaptation ledger's hashing is unchanged.

### 6. The diligence statement

`.design-pipeline/diligence.md` is a projection of `state.json`. It is rendered by a new
`workflow-core` function from state alone, and the agent never writes it.

- Delivery renders it after the delivery is recorded, and `next`'s `done` action returns its path.
- It binds to what delivery already records, adding no new hash source:
  - `delivered`: the destination string, for every deliverable;
  - `deliveredSha256`: present only for file deliveries (film, edit);
  - `deliveryInputHashes`: the review inputs bound at delivery (web, film, edit; ui has none);
  - the SHA-256 of the canonical state it was rendered from.
- A remote web URL has no local bytes, so the statement binds the reviewed inputs, not the remote
  page. It says so in its header ("Remote destination; bound to reviewed inputs").
- It is stale when the state hash or any recorded delivery binding no longer matches, reusing
  `shared.cjs`'s delivery-current check. `next` re-renders it at the next delivery.
- A new read-only `diligence` command (in the COMMANDS table) prints it, or renders it on demand
  with `--write`, so an owner can see it before delivery.

Shape, with fixed English labels:

```markdown
# AI diligence statement
Delivered: sha256:… · State: sha256:… · Assisted by: Claude Code (claude-opus-5-5)

## Decided by the owner
- Intake playback, confirmed: "…"
- First screen: B, "denser layout suits watching markets" (director recommended A)
- Final acceptance: "…"

## Decided by the agent under delegation
- Reference: chose … (delegated by default)
- Sections 2-4: accepted by art director <director> (delegated by --director)

## Not stated by the owner
- Creative intent: distinctiveness (skipped: "no strong view yet")

## Records without an author
- 2 decisions recorded before decision roles existed

## Project rules from the owner's "no"
- 5 rules (see state.rules)

## Technical checks (not creative acceptance)
- Interaction gate: passed at sha256:…

Suggested trailer: Assisted-by: Claude Code (claude-opus-5-5)
```

- `next --assisted-by "<tool>"` sets `state.assistedBy` at init. It is registered in
  `KNOWN_OPTIONS`.
- Agents are told in SKILL.md to pass their own tool and model name.
- The trailer line is a suggestion. The pipeline never edits commits or PRs.

### 7. Collaboration retrospective (phase 3)

- After final acceptance, the `done` action may carry one optional question: "Anything about how we
  worked together you'd change next time?"
- An answer is recorded by the agent with the existing `adaptation record` as a shadow candidate on
  a collaboration dimension. It is never promoted without the adaptation lifecycle.
- No answer blocks nothing.

## File ownership

| File | Change |
|---|---|
| `skill/scripts/workflow-core.cjs` | delegation defaults, `--by` checks, director routing, statement rendering, `diligence` |
| `skill/scripts/workflows/{web,film,edit}.cjs` | `by`/`agent`/`recommended` on records, reasons, playback lines |
| `skill/scripts/guided-design-intake-core.cjs` | `creativeIntent` fact group and question |
| `skill/scripts/design-synthesis-core.cjs` | `Product Context` label check |
| `skill/scripts/direction-preview-core.cjs` | `decision.by` validation |
| `skill/scripts/surface-design-artifacts-core.cjs` | `selectedBy` on the selection receipt, reason default, `approval.by` |
| `skill/scripts/cli-core.cjs` | `--by`, `--delegate`, `--keep`, `--assisted-by`, `diligence` command, help |
| `skill/references/schemas/*` (brief, direction preview) | added fields |
| `skill/SKILL.md`, `references/stages.md`, `workflow-web.md`, `direction-preview.md` | guidance |
| `DESIGN.md` (root) | creative-intent labels in `Product Context` |
| `CHANGELOG.md` | `[Unreleased]` entry |

## Compatibility and migration

- No migration layer. A stored record without `by` is reported as `unknown`; nothing rewrites it.
- An in-flight project's next `decide` needs `--by`. Its DESIGN.md reports `synthesis-required`
  until the three labels are added.
- `state.delegation` missing from an older state is filled from the defaults on the next `next`.
  The playback then shows it, because the defaults are only ever applied to show them.
- The brief schema version stays `v1`. `creativeIntent` is optional for briefs confirmed before this
  change and required for new confirmations.

## Phases

1. **Decision roles and diligence:** Decisions 1, 2, 3, 5 (director routing only) and 6.
2. **Creative intent:** Decision 4.
3. **Discernment:** Decision 5 reasons and recommendations, and Decision 7.

Each phase is its own PR against this change. `tasks.md` groups the tasks the same way.

## Risks

- **Agents claiming `owner`.** Mitigations:
  - SKILL.md instruction;
  - owner records at reason-bearing checkpoints need the owner's words;
  - the statement quotes them, so a fabricated quote is visible to the owner who reads it.
- **Friction.** The added asks are one intake question and two reasons. Delegation is shown, not
  asked, unless the owner corrects it.
- **Archive order.** This change ADDS requirements only. It touches code from
  `make-web-workflow-conversational` and should archive after that chain.

## Open questions

- Should ui work (and web quick) gain a locked owner acceptance before `deliver`? It would make
  final acceptance universal, at the cost of one more ask on the lightest tiers.
- Should `--by` stay required with no default? The current answer is yes, and it affects every
  in-flight project's next `decide`.

## Follow-up

- Add an optional actor field to `design-pipeline.event.v2` and set it from
  `decideVisualTask`.
- Translate statement labels once a project language setting exists.

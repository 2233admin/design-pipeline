# Proposal: decide later, and what happened while the owner was away (owner-attention phase 4a)

## Why

Phase 4 of `design-owner-attention` (section F) is about the owner's absence. Two gaps hurt first:

- **No "later".** When `next` asks the owner something and they say "not now", nothing records it. The
  next `next` returns the same ask, so an agent either nags or stalls without saying why, and a returning
  agent session cannot tell a deferred question from one never asked.
- **No catch-up.** Between two owner decisions the agent may self-check sections, approve a component
  source or rerun the probe under its delegation. When the owner is asked again, nothing tells them what
  the agent decided meanwhile. The statement lists it only at the end.

Mature tools converge on the same two answers:

- **Snooze until a time or new activity, whichever comes first.** In
  [Linear](https://linear.app/docs/snooze), activity before the time brings the item back early; an answer
  given early simply ends it ([Superhuman Remind Me](https://help.superhuman.com/hc/en-us/articles/43822934607251-Remind-Me)).
- **"Since your last review", with the reviewer's own last completed review as the baseline.**
  [Bitbucket](https://www.atlassian.com/blog/bitbucket/iterative-review) moves the marker only when a review
  is completed, never on a mere view.
- **Agents park a decision durably and do not build on a guess.** See
  [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/human-in-the-loop) and
  [Temporal human-in-the-loop](https://docs.temporal.io/ai/cookbook/human-in-the-loop-python).

## What Changes

- **`decide --later [--until <time>]`** records that the owner chose to answer the current owner ask later.
  - While it holds, `next` returns a `blocked` action of kind `owner` that carries the deferred ask. It
    tells the agent not to ask again before the time and not to build on a guess.
  - It wakes, and `next` asks again, at the time, when the page or brief the ask is about changes, or
    when the ask is no longer the current one.
  - Any answer the owner records ends it; the agent's own records do not.
- **A catch-up on owner asks.** When anything was decided or checked since the owner's last recorded
  decision, an owner-facing ask carries `away`:
  - what the agent decided under its delegation;
  - which checks ran;
  - the one decision now needed.

  Its `first` tells the agent to say this in a line or two before asking. The baseline is the owner's
  last decision record, the Bitbucket model, so no new marker is stored.
- Out of scope, for later phase 4 steps:
  - changing delegation after intake, and binding each decision to its delegation entry (E);
  - narrowing or retiring a rule by hand;
  - "what a rejection would affect";
  - more than one pending decision at a time. The pipeline asks one thing at a time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: owner asks can be deferred, and an owner ask catches the owner up on what happened
  since their last decision.

## Impact

- `skill/scripts/workflow-core.cjs`: `deferAsk`, the deferred ask in `nextAction` (read-only; nothing is cleared on write), decide answering a deferred ask,
  and `away` on owner asks.
- `skill/scripts/cli-core.cjs`: `--later`, `--until`.
- `skill/scripts/workflows/roles.cjs`: exports `describe` for the catch-up lines.
- New `skill/scripts/workflows/away.cjs` (the ask key, the deferral check and the catch-up).
- `skill/references/workflow-web.md` (the owner-facing rules), CLI help and reference, the CHANGELOG,
  and `design-owner-attention` (phase 4 split: 4a here).
- Tests in `tests/workflow-next.test.cjs`.
- No new gate, receipt schema or state file. The deferral is one `state.pending` field.

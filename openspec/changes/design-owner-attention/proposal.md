## Why

Decision roles (#112) made responsibility visible: every record says who decided, final acceptance
is the owner's at every tier, and a diligence statement is rendered at done. A role-played
walkthrough of the merged code, and an outside review of it, found the cost of that clarity: the
pipeline turns its own production steps into approvals the owner must perform.

- **The owner approves the pipeline, not the work.** A standard page with two sections asks the
  owner about nine times (playback, variants, components, description, each section, final
  review). Several asks feel like the same question ("is this the page you want?"), and nothing
  says what this ask decides that the last one did not. The predictable outcome is "use the
  recommendation" by the fourth ask, while the record shows a fully approved run.
- **The owner is asked to decide execution questions.** Component sources are an owner decision,
  though most owners can only answer "whatever you recommend".
- **Small changes trigger full re-approval.** A typo fix in `brief.md` voids the description
  approval, which voids every section verdict.
- **Feedback is coarse and permanent.** Feedback is text that describes where an element is; any
  change request rejects a whole section; and every "no" becomes a project rule that is never
  removed, even when it was about one button.
- **The owner must be present.** The flow blocks at the first owner checkpoint; nothing separates
  drafts the agent can keep making from decisions waiting for the owner.
- **We keep adding things to read** (the statement, the playback, the delegation table, rule
  lists), while people look at the page and at the one sentence that needs them.
- **The planned phase 2** (a fifth intake question about creative intent) would add another ask.

## What Changes

This change sets the principles and the design for the owner's attention. It replaces most of
phases 2 and 3 of `adopt-ai-fluency-decision-roles` (#109, #110) and keeps phase 1's
responsibility boundaries. Implementation lands in later changes, one per phase in design.md.

**Principles:**

1. **The owner decides outcomes and their costs, not pipeline stages.**
2. **No new artifacts for people to read.** Put information where people already look: beside the
   page, in the ask, in the PR.
3. **Internal execution is not external approval.** The agent may build and self-check section by
   section without asking the owner section by section.
4. **Feedback is anchored, scoped and reversible.**
5. **Owner absence is normal.**

**Design, in short (details in design.md):**

- Asks are budgeted: by default the owner meets the work twice, at the direction and at the result.
  Other asks happen only when a new trade-off appears. Each ask carries the question, the visible
  difference and the consequence.
- A lightweight review on the real page: point at an element, leave short feedback, see before and
  after, accept a specific version.
- Change tiers: a byte change, a commitment change and a page change trigger different re-review
  scopes; technical evidence still re-runs.
- Feedback scope: feedback binds to the object and round by default and becomes a project rule
  only when the owner says so; rules can be narrowed, superseded or retired.
- Delegation changes at any time, and each decision keeps the authorization it was made under.
- Absence: drafts, pending decisions and accepted results are separate states; the owner returns
  to a short "while you were away" summary, not to logs.
- Creative intent is drawn from the conversation and confirmed in the playback, not asked as a
  fifth question.
- Owner-facing text follows the project's language.

## Capabilities

- `design-pipeline`: ADDED `Owner asks carry a new trade-off and its consequence` and `Owner
  attention principles govern new owner-facing output`. Behavioural requirements are added by the
  implementing changes.

## Reuse

- Decision roles: delegation map, `by`, locked final acceptance, diligence data.
- `runtime-review` Feedback records as the shape for anchored feedback.
- The adaptation ledger for promoting a scoped preference to a lasting one.
- The existing evidence invalidation; change tiers decide what the owner sees, not what is
  re-checked.

## Impact

- Owners: fewer, more meaningful asks; feedback on the page; the ability to step away.
- Agents: more self-checking between owner asks; every ask must name its new trade-off.
- #109 and #110 are re-scoped to point here.

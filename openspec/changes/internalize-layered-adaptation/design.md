# Design: Evidence-Gated Layered Adaptation

## Boundary and Layers

`Methodology Kernel` is frozen for this experiment. It owns durable design-engineering method,
artifact requirements, safety boundaries, project constraints, and every quality gate. Adaptive
Orchestration may choose questions, representations, evidence sequencing, and available tools; it
cannot edit, reinterpret, suppress, or bypass the kernel.

The effective policy is resolved in this order: **current task > project > user > defaults**.
Higher scope may select among compatible workflow choices only. A project constraint or quality
gate is an immutable boundary, not a competing preference, and therefore survives every policy
merge. Conflicting values merge by finite collaboration dimension rather than caller-chosen rule id.
Conflicts resolve to the more restrictive valid outcome; an invalid or unsafe instruction is
dropped with a receipt rather than applied.

| Layer | Lifetime | Authority | Persistence |
| --- | --- | --- | --- |
| Methodology Kernel | frozen | method, constraints, quality gates | repository authority |
| Task Session Policy | one task | temporary orchestration choices | expires; not durable evidence |
| Project Adaptation Skill | project | versioned project conventions and workflow choices | external, project-scoped |
| User Collaboration Skill | cross-project | versioned confirmed collaboration preferences | external, user-controlled |

Neither external skill is a user profile or a general memory dump. They store only reviewable,
declared guidance with scope, source evidence references, version, author/reviewer, status, and
expiry/retention metadata. Secrets, sensitive traits, inferred identity, personality diagnosis,
and hidden prompts are out of scope.

## Candidate Lifecycle

Completed task experience is redacted and normalized into an evidence record. It may generate at
most a bounded candidate diff against one external skill version:

1. `add` creates one narrowly scoped rule.
2. `replace` changes one identified rule with its prior value retained.
3. `delete` proposes removal of one identified rule.

The candidate identifies its target scope, exact external-skill path, incumbent version and content
hash, intended benefit, affected task class, exclusions, metrics, evaluation manifest, and rollback
point. Guidance selects from a finite contract of collaboration dimensions rather than storing
free-form behavioral instructions. It cannot change the
Methodology Kernel, project constraints, gate thresholds, evaluation corpus, or its own success
criteria. The manifest, primary metric, metric direction, and candidate-construction fixture ids
are bound before evaluation. Candidate generation is proposal-only; it has no live authority.

An independent evaluator first runs a held-out set that was excluded from candidate construction,
then a replay set of representative prior tasks against both candidate and incumbent. The evaluator
uses the same manifest, environment class, task fixtures, gate results, and scoring rubric for both
arms; it records unknowns and failures separately from aggregate scores. A candidate promotes only
when all required safety/quality gates pass, the held-out and replay evidence are complete, and its
predeclared primary metric **strictly improves in its declared direction** against the incumbent in
both required comparisons.
Equal scores, partial evidence, any required regression, evaluator conflict, or unreviewed scope
expansion results in no promotion.

Promotion uses a process-owned ledger lock plus a durable prepare/commit journal to create a new immutable external-skill version,
links the complete evidence receipt, and keeps the prior version selectable. Interrupted promotion
or rollback is resolved from the before/after content hashes on the next ledger load only after a
dead writer's lock is taken over; a live writer is never recovered by another process. A newer
version supersedes the active version for the same external skill, and rollback reactivates its exact
predecessor. Actor labels and review reasons persist only as purpose-separated hashes. Rejection
leaves the incumbent active. A promoted version can
be reverted to its predecessor; invalid, expired, or user-revoked candidates are forgotten by
removing their usable guidance and recording a non-sensitive tombstone needed to prevent accidental
reinstatement. Forgetting does not erase mandatory audit records or change any shipped artifact.
When a successor snapshot still contains an older candidate, scoped forgetting blocks until the
successor chain is rolled back through that candidate, then scrubs every rolled-back dependent
snapshot that carried the forgotten guidance.

## Shadow Learning and User Control

Default operation is `shadow`: candidates are collected and evaluated but never affect a task's
effective policy. The user can view the candidate diff, inputs/retention scope, evaluation receipt,
decision, and rollback target; can reject it before promotion; and can request project- or
user-scope forgetting. A user may explicitly opt into a reviewed promoted version, but no
adaptation applies silently. The current task may also disable use of external guidance without
weakening kernel or project constraints.

## Non-Goals

- reinforcement learning, reward optimization, online policy training, or model-weight updates;
- hidden behavioral profiling, inferred personal attributes, or unbounded prompt accumulation;
- autonomous changes to project policy, quality bars, evaluation fixtures, or external skill scope;
- substituting a high score for a required gate or concrete evidence.

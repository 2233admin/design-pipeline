# Evidence-gated layered adaptation

Use this module when repeated Design Pipeline work suggests that orchestration could fit a user or
project better. This is a non-parametric learning loop: it changes reviewable external guidance,
not model weights, the Methodology Kernel, project constraints, or quality gates.

## Authority model

| Layer | Lifetime | May contain | May not contain |
| --- | --- | --- | --- |
| Methodology Kernel | release-governed | durable method, safety boundaries, required gates | personal adaptation |
| Task Session Policy | one task | temporary questions, representations, sequencing | durable evidence by itself |
| Project Adaptation Skill | one project | reviewed conventions and recurring workflow choices | weaker gates or cross-project claims |
| User Collaboration Skill | cross-project | confirmed communication, decision, evidence, and delivery preferences | identity, personality, diagnosis, or inferred traits |

Effective compatible guidance resolves as `defaults < user < project < current task`. Constraints
and gates are carried separately from guidance, so no layer can override them. When a rule collides
with an immutable boundary, the resolver drops it and records the reason.
Mutually exclusive values merge by collaboration `dimension`, not by caller-chosen rule id, so a
higher-precedence value is unambiguous.

An external durable skill is JSON with schema `design-pipeline.adaptation-skill.v1`, `scope` set to
`project` or `user`, a version, and unique identified rules. A Task Session Policy is input to one
resolution call and is never written into a durable skill.

## Lifecycle

```text
record -> propose -> evaluate -> promote
                    |            |
                    reject       rollback -> forget
```

The public command group is `designer-pipeline adaptation`.

### 1. Record minimal experience

`adaptation record` accepts a contained `design-pipeline.adaptation-experience.v1` JSON artifact,
records its content hash and a minimal signal summary, then discards the supplied content. It never
stores a transcript, prompt, design artifact, secret, identity attribute, or psychological
interpretation. Recorder, proposer, evaluator, approval, and rejection labels are retained only as
one-way purpose-separated hashes; their supplied text is not written to the ledger.

Signal strength is deliberately asymmetric:

- an explicit correction or explicit choice is strong evidence;
- a repeated pattern may enter shadow evaluation but cannot promote without explicit evidence;
- a one-off acceptance, click, completion, or silence is weak evidence and cannot produce a
  durable candidate;
- current project constraints remain project evidence and do not become cross-project preference.

### 2. Propose one bounded change

`adaptation propose` produces a shadow-only candidate bound to recorded evidence. One candidate
contains exactly one operation:

- `add` one narrowly identified rule;
- `replace` one existing identified rule;
- `delete` one existing identified rule without carrying its content.

Candidate rules are inert data. Executable fragments, remote content, credentials, raw transcripts,
identity/demographic fields, personality labels, diagnoses, and other hidden-profile fields fail
closed. A candidate cannot target the packaged `skill/` tree, evaluation criteria, constraints, or
quality gates. Durable guidance is not free-form prose: it selects one value from a finite set of
collaboration dimensions such as communication density, question sequencing, representation,
evidence order, tool presentation, delivery format, or workflow sequence. Before the candidate is
written it binds the exact external-skill path, incumbent version and content hash, SHA-256 of the
evaluation manifest, primary metric, metric direction (`maximize` or `minimize`), and construction-
fixture ids. Those declarations cannot be chosen after results are known.

### 3. Evaluate independently

`adaptation evaluate` compares the candidate with the incumbent on both replay and held-out
fixtures. Each arm uses `design-pipeline.adaptation-evaluation.v1`; the evaluator must differ from
the proposer. Both inputs must:

- bind the exact candidate hash and the same pinned evaluation-manifest hash;
- use fixture ids that are disjoint from each other and from candidate-construction fixtures;
- report complete finite baseline and candidate scores;
- report every required invariant explicitly as passed;
- preserve missing, unknown, and failed results instead of filling them with an aggregate.

The receipt passes only when the candidate score strictly improves in the predeclared direction in
**both** comparisons and neither comparison has an invariant regression. A tie, incomplete result, fixture
overlap, hash drift, unknown gate, or replay-only gain is blocked. This is the negative-transfer
guard: improvement on familiar work cannot hide damage on held-out work.

### 4. Promote with explicit approval

`adaptation promote` consumes the candidate and its hash-bound passing receipt. Promotion requires
an explicit approval flag and reason, enough explicit supporting evidence, a project/user target
skill whose scope matches the candidate, and an unchanged candidate/receipt chain. It writes a new
version through a recoverable prepare/commit journal and retains a rollback point. On interruption,
the next check commits only when the exact new content reached disk; otherwise it aborts back to the
hash-bound incumbent. A process-owned ledger lock prevents a live writer from being mistaken for a
crashed writer; a dead owner's lock is taken over before recovery. Later versions supersede the
active version for the same external skill, and rollback reactivates the exact predecessor. Shadow
candidates never become effective merely because evaluation passed.

### 5. Inspect, reject, roll back, and forget

- `adaptation check` validates the ledger, hashes, dispositions, and active scope summary.
- `adaptation resolve` consumes `design-pipeline.adaptation-policy-input.v1`, deterministically
  overlays reviewed rules, and returns immutable constraints, gates, and a receipt for dropped
  guidance.
- `adaptation reject` records a reason hash and leaves the incumbent unchanged.
- `adaptation rollback` restores the exact predecessor only when the promoted file has not drifted.
- `adaptation forget` requires a promoted candidate to be rolled back first, removes its usable
  rule content and keeps only a non-sensitive hash tombstone that prevents accidental reinstatement.
  Because successor snapshots contain their predecessors, forgetting an older version first requires
  rolling back the successor chain; forgetting then scrubs those rolled-back dependent snapshots too.

All supplied paths stay under `--root`; symlink and parent-directory escapes fail closed. State
defaults to `.design-pipeline/adaptation/state.json` and uses
`design-pipeline.adaptation-state.v1`. State is local and is not a publication or synchronization
surface.

## Minimal experiment

Use historical or synthetic fixtures; never turn the user's active task into the held-out set.

1. Capture explicit corrections and repeated choices after delivery.
2. Generate one shadow candidate against a user or project skill.
3. Predeclare the metric, invariant set, replay fixtures, and held-out fixtures.
4. Ask an evaluator that did not propose the edit to compare incumbent and candidate.
5. Run the contract checker and inspect the diff and receipt.
6. Promote only with explicit approval, then monitor the next matching tasks.
7. Roll back on a regression and forget evidence or guidance when requested.

The first product metric is repeated-correction count on matching tasks. It is successful only when
that count decreases without a quality-gate, safety, project-constraint, or held-out regression.
More stored information is not itself an improvement.

## Design rationale and sources

This contract applies the external-skill, experience-to-skill, and validation-ratchet ideas from
[SkillLens](https://arxiv.org/abs/2605.23899),
[SkillOpt](https://arxiv.org/abs/2605.23904), and
[darwin-skill](https://github.com/alchaincyf/darwin-skill) without adopting reinforcement learning
or copying executable upstream content. The bundled Prism learning-agent snapshot independently
supports append-only evidence, separate judges, propose-then-human-promotes, and reversible
changes.

The control boundary also reflects adaptive-interface findings: adaptation is useful only when it
remains predictable, understandable, reversible, and user-controlled. See
[Gajos et al.](https://doi.org/10.1145/1357054.1357252),
[Findlater and McGrenere](https://doi.org/10.1145/985692.985704), and
[Lee and See](https://doi.org/10.1518/hfes.46.1.50_30392).

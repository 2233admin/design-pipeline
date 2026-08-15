# Accept layered adaptation, Playground, and capability routing

## Intent

Run the next-stage acceptance of the already-merged layered adaptation feature on a reproducible
fixture. The acceptance must separate repeatable contract/security checks from product evidence about
adaptation benefit, trust, recoverability, Playground usefulness, installation, and maintenance.

## Scope

- Reproduce and fix the six executable CodeRabbit findings from PR #23 on top of merge `6aeec59`.
- Exercise `DESIGN.md`/`MOTION.md`, direction preview, four Playground task shapes, component capability
  routing, and the adaptation lifecycle through the public CLI.
- Compare a fixed baseline and adapted fixture using the same task list, manifest, disjoint
  construction/replay/held-out partitions, and an independent evaluator role.
- Record security, recovery, performance, package/install, and 20-task maintainability evidence.

## Non-goals

- This change does not claim generalization from the synthetic fixture.
- This change does not add telemetry collection, hosted blind evaluation, or long-term policy expiry
  beyond measuring the current contracts and recording those gaps.
- No already-merged history is rewritten.

## Acceptance decision

`qa.md` is the source of truth for GO / CONDITIONAL GO / NO-GO. A green CI run alone cannot produce
GO; product, trust, recovery, and maintenance gates must have evidence or an explicitly prioritized
gap.

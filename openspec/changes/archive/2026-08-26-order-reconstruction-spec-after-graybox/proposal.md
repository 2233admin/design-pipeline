# Proposal: Order Reconstruction Design Spec After The Graybox

## Problem

Stage 3 writes change `design.md` before Stage 5 implements it. For feature work that ordering is
correct: the spec is the decision and the code is the consequence.

For a `primary-target` reconstruction the ordering inverts the epistemics. The spec is not a
decision, it is a *reading* of an artifact the agent can look at but cannot measure. A misreading
written into `design.md` at Stage 3 is then implemented faithfully at Stage 5, because Stage 5's job
is to obey the spec. The pipeline's own discipline converts a recoverable observation error into a
propagated one.

Observed in the `jst-hud-clock` run: `reference.md` and `design.md` both recorded register one as a
`[label][mark][readout]` row, matching registers two and three. The reference actually places the
label above the readout. The tidy model was written first, then implemented exactly, and the error
surfaced only at the first render. The same pass carried a board unit roughly 40% oversized, also
specified before anything was looked at.

Nothing in the pipeline required the spec to be re-checked against the render. The correction that
did happen was voluntary.

## Change

- For `primary-target` references, author the graybox before change `design.md`, not after.
- Require `design.md` to cite the graybox capture it was written against.
- For all other reference roles, keep the current order but require a reconciliation pass: after the
  first render, re-validate `design.md` against the capture and record the delta.
- Add a `specDrift` record listing every value the implementation had to change, so silent
  divergence between artifact and code becomes visible.
- Make an unreconciled `design.md` a gate-review blocker rather than a matter of taste.

## Non-goals

- Changing stage ordering for non-reference changes.
- Removing `design.md` from the reconstruction flow.
- Allowing implementation to proceed without a spec.

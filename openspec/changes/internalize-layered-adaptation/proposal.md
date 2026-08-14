# Proposal: Internalize Layered Adaptation

## Problem

The pipeline has stable methodology and context vocabulary, but no governed way to improve its
collaboration and project guidance from completed work. Persisting raw task behavior would risk
silently changing quality gates, retaining a hidden user profile, or promoting an apparent local
win that fails on new work.

## Decision

Add the first non-RL longitudinal adaptation experiment. It separates immutable methodology from
temporary task guidance and external, versioned adaptation skills. Experience may produce only a
small, explicit `add`, `replace`, or `delete` candidate. A candidate is independently evaluated on
held-out and replay evidence and promotes only on a strict measured improvement; otherwise it is
rejected, reverted, or forgotten.

The experiment uses no reinforcement learning, model-weight training, latent preference/profile,
or automatic broad prompt mutation. It starts in shadow-learning mode, so proposed adaptations are
recorded and reviewable without affecting live delivery unless a user explicitly enables one.

## Success Criteria

- Methodology Kernel and project constraints/quality gates remain non-bypassable.
- Effective guidance has an explicit precedence: current task > project > user > defaults.
- Task Session Policy expires with its task; Project Adaptation Skill and User Collaboration Skill
  are external, versioned, inspectable artifacts.
- Promotion requires independently run held-out and replay evaluation plus strict improvement over
  the incumbent; ties, missing evidence, regressions, and unmeasured safety effects do not promote.
- Every durable candidate is finite-dimension data bound to the exact incumbent content hash, and
  promotion/rollback uses a recoverable local journal rather than free-form prompt mutation.
- Every candidate and disposition is auditable, and users can inspect, reject, roll back, or ask to
  forget adaptation data within its declared scope.

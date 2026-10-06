# Design Pipeline Context

Design Pipeline separates durable design-engineering method from the changing way an agent guides
each user and discovers current implementation capabilities.

## Language

**Methodology Kernel**:
The stable, non-negotiable design-engineering principles and quality boundaries that make work
traceable and verifiable across frameworks and tools.
_Avoid_: Dead pipeline, framework workflow

**Adaptive Orchestration**:
The user-facing selection and sequencing of questions, representations, evidence, and tools based
on the user's working context, without changing the Methodology Kernel.
_Avoid_: Self-modifying pipeline, cosmetic personalization

**Dynamic Capability Discovery**:
Task-driven identification and evaluation of current external tools, libraries, skills, and
providers as candidates rather than automatic dependencies or design authority.
_Avoid_: Dependency updating, permanent catalog expansion

**Job Dispatcher**:
Stage 0 classification of a brief into exactly one primary job from `job-registry.json`. New
capabilities register as jobs; they do not add mandatory catalog searches.
_Avoid_: Peer Stage 0 catalog crawl, one CLI door per feature

**User Collaboration Skill**:
Versioned cross-project guidance for how Adaptive Orchestration works with one user, including
confirmed communication, decision, evidence, and delivery preferences. It cannot weaken the
Methodology Kernel or override project constraints.
_Avoid_: User profile, personality diagnosis

**Project Adaptation Skill**:
Versioned project-scoped guidance for recurring constraints, conventions, design language, and
workflow choices. It takes precedence over conflicting cross-project preferences while the project
is active.
_Avoid_: Project memory dump, permanent global rule

**Task Session Policy**:
Ephemeral guidance for the current task. It may generate a candidate change for a Project
Adaptation Skill or User Collaboration Skill, but it is not durable evidence by itself.
_Avoid_: Automatically learned preference, hidden prompt state

**Experience Record**:
A minimal, scope-bound hash and signal-strength summary derived after a task. It excludes raw
transcripts, hidden traits, secrets, and artifact content.
_Avoid_: Conversation archive, behavioral profile

**Adaptation Candidate**:
A shadow-only proposal bound to an exact external-skill path, version, and content hash, containing
exactly one finite-dimension inert add, replace, or delete operation
against a Project Adaptation Skill or User Collaboration Skill.
_Avoid_: Self-modifying prompt, automatic preference

**Validation Ratchet**:
The rule that an Adaptation Candidate advances only after independent, hash-bound replay and
held-out comparisons both strictly improve while every required invariant remains satisfied.
_Avoid_: Reward loop, self-scoring

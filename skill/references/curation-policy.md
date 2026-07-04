# Curation Policy

`design-pipeline` is a design-first pipeline. Its purpose is to make UI, UX, motion, brand, accessibility, and frontend implementation quality more repeatable.

It is not a general-purpose agent skill marketplace.

## Product Boundary

Accept a skill only when it directly improves at least one design outcome:

- Visual taste
- UX clarity
- Information architecture
- Design systems and tokens
- Component states
- Motion / animation design
- Frontend implementation fidelity
- Accessibility
- Design QA and evidence
- Design artifact lifecycle

Engineering skills are allowed only when they protect design execution:

- React / Next.js correctness for UI delivery
- Animation library implementation
- Test and QA workflows for UI behavior
- OpenSpec-style artifact compatibility
- GBrain-style decision persistence
- Code review of frontend/design implementation

Reject or keep out of scope when a skill is mainly:

- Backend architecture
- Infrastructure
- Generic productivity
- Writing unrelated to product UI
- Broad project management
- Agent orchestration unrelated to design delivery
- A duplicate prompt without stronger references, scripts, templates, or evidence

## Intake Outcomes

Every external GitHub skill source should end in one of these states:

- `accepted`: part of the default design-pipeline ecosystem.
- `accepted-optional`: useful only for specific project types or stacks.
- `rejected-duplicate`: already covered by a stronger or more official skill.
- `rejected-out-of-scope`: not design-first.
- `watchlist`: promising but not stable, maintained, or structured enough.

## Evaluation Criteria

Check:

- Has `SKILL.md`.
- Has clear `name` and `description`.
- Does not overwrite an existing important skill name.
- Has references, scripts, templates, standards, or structured workflow beyond a short prompt.
- Maps to a known design capability.
- Has a fallback when missing.
- Can be checked by `scripts/check-deps.cjs`.
- Comes from an official or high-trust source when possible.
- Does not require private credentials or a private runtime.
- Adds meaningfully new capability rather than another wording of the same taste prompt.

## Priority Rules

Prefer:

1. Official source over repost.
2. Specific workflow over broad prompt.
3. Evidence-backed standards over aesthetic adjectives.
4. Small composable skill over monolithic all-purpose skill.
5. Design outcome over implementation novelty.

When a candidate conflicts with an existing skill name, rename the candidate locally with a source or domain prefix rather than overwriting established workflow names.

## Registry Mapping

Accepted skills should map to one capability group:

- `visual-taste`
- `ux`
- `design-system`
- `motion-design`
- `animation-implementation`
- `frontend-engineering`
- `qa`
- `artifact-lifecycle`
- `compatibility`

If a skill maps to more than two groups, split its usage in documentation or mark it as broad/supporting instead of making it a default route.

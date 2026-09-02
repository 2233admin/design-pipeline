# Proposal: Progressive Disclosure and Skill Evaluation

## Why

The project already absorbs most of Anthropic's `frontend-design` principles: subject-grounded direction, product-specific signatures, responsive behavior, focus visibility, reduced motion, and critique gates. Its main structural gap is the skill entry point: `skill/SKILL.md` is 1119 lines, so every invocation pays for rules that apply only to a specific module or stage. The project also has extensive deterministic runtime tests but no small, explicit skill-level prompt set for checking routing and required evidence.

Anthropic's official `skill-creator` recommends progressive disclosure, a short entry point, and repeatable with-skill/baseline evaluations. The official `frontend-design` skill reinforces a two-pass brainstorm/critique workflow and a deliberate, subject-specific signature. The official `webapp-testing` skill documents the same reconnaissance and evidence sequence already present in this repository's Playwright adapter.

Sources:

- https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md
- https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md
- https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md

## What Changes

- Reduce `skill/SKILL.md` to a concise front door containing trigger routing, non-negotiable invariants, stage map, and pointers to relevant references.
- Move stage/module detail into focused reference files and register those files in the package resource manifest.
- Add a versioned skill-evaluation manifest with representative prompts, expected routes, and required signals.
- Add a deterministic validator and tests for the evaluation manifest. It must not claim model quality or require an external model.
- Wire the already-existing subject-grounding, iterative-critique, and product-specific-signature contracts into the front-door routing instead of creating duplicate gates.
- Keep the existing CLI, artifact, receipt, state, package, and browser adapter contracts unchanged.

## Non-Goals

- Copying Anthropic's skills into this repository.
- Replacing the existing design methodology, Impeccable contract, or companion-skill routing.
- Adding a Python test harness or changing the Node Playwright adapter.
- Introducing a hosted benchmark service or model-dependent CI job.
- Rewriting every existing reference document.

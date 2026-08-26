# Proposal: audit skill package

## Why

The repository should be reviewed with skill-creation standards, not only with the existing repository QA. A distributable skill must have valid frontmatter, resolvable references, and consistent install/self-check semantics.

## What

- Strengthen repository QA to validate `skill/SKILL.md` frontmatter.
- Strengthen repository QA to validate referenced `references/*` and `scripts/*` files.
- Fix `scripts/install-local.cjs` so `CODEX_SKILLS_DIR` consistently means the skills root, matching `check-deps.cjs`.

## Non-Goals

- Do not add new companion skills.
- Do not change the design-pipeline workflow behavior.


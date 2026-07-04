# Design: bootstrap design-pipeline

## Repository Structure

The repository separates the distributable skill from OpenSpec governance:

- `skill/`: Codex skill contents.
- `openspec/`: project source of truth and active changes.
- `docs/`: future published documentation.
- `scripts/`: future repo-level automation.

## OpenSpec Mapping

The initial spec lives at:

```text
openspec/specs/design-pipeline/spec.md
```

The bootstrap change delta lives at:

```text
openspec/changes/bootstrap-design-pipeline/specs/design-pipeline/spec.md
```

## Compatibility

The core pipeline must work without optional dependencies. Optional systems such as GBrain, Matt Pocock skills, Vercel skills, GSAP, Anime.js, and OpenSpec CLI are detected or documented as fallbacks.

## Validation

The minimum validation is:

```bash
node skill/scripts/check-deps.cjs --json
```

For open-source readiness, use:

```text
skill/references/open-source-readiness.md
```


# design-pipeline

Design-first pipeline for AI-assisted frontend design work.

`design-pipeline` turns a messy collection of design, UX, motion, animation, frontend, and QA skills into a repeatable OpenSpec-aligned workflow.

It is not a general-purpose agent marketplace. Engineering integrations exist only to help produce, implement, validate, and preserve better design outcomes.

## What It Does

- Creates durable design artifacts before implementation.
- Adds first-class motion design documentation.
- Supports headless AI handoff through machine-readable state files.
- Self-checks optional companion skills and falls back when they are missing.
- Aligns with OpenSpec's proposal -> apply -> archive lifecycle.

## Repository Layout

```text
skill/
  SKILL.md
  references/
  scripts/
openspec/
  project.md
  specs/
  changes/
docs/
scripts/
```

## Install Locally

From this repository:

```bash
mkdir -p ~/.codex/skills/design-pipeline
cp -R skill/* ~/.codex/skills/design-pipeline/
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

Windows Git Bash example:

```bash
mkdir -p /c/Users/Administrator/.codex/skills/design-pipeline
cp -R skill/* /c/Users/Administrator/.codex/skills/design-pipeline/
node /c/Users/Administrator/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

## OpenSpec Alignment

Long-lived behavior lives under `openspec/specs/`.

In-progress changes live under `openspec/changes/<change-id>/` with:

```text
proposal.md
design.md
tasks.md
specs/<capability>/spec.md
```

The pipeline's runtime design artifacts map to OpenSpec as:

| design-pipeline | OpenSpec role |
| --- | --- |
| `brief.md` | Proposal intent |
| `directions.md` | Design exploration |
| `design.md` | Technical/design approach |
| `motion.md` | Motion-specific design spec |
| `tasks.md` | Implementation checklist |
| `qa.md` | Validation evidence |
| `state.json` / `events.jsonl` / `handoff.md` | Headless agent state |

## Minimum Viable Run

Even with no optional companion skills installed:

```bash
node skill/scripts/check-deps.cjs
```

The command should return `OK`. Missing optional skills should report `WARN` with fallbacks.

## Release Standard

Before publishing a release, validate against:

- `skill/references/open-source-readiness.md`
- `skill/references/qa-checklist.md`
- `openspec/specs/design-pipeline/spec.md`


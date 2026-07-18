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
- Reconstructs authorized live websites through Browser, Builder, and Evidence ports with measurable fidelity gates.

## Website Cloning

`design-pipeline` is a superset of a website-cloning prompt: it captures reference evidence, builds from complete component contracts, and independently compares the result before claiming fidelity.

```bash
node skill/scripts/init-website-clone.cjs \
  --change-id clone-example \
  --url https://example.com \
  --reference-url https://reference.example \
  --fidelity exact

# After the three adapters have reported capabilities and EvidencePort has
# produced verification-input.json:
node skill/scripts/evaluate-website-clone.cjs \
  --change-root openspec/changes/clone-example \
  --evidence openspec/changes/clone-example/verification-input.json
```

- `--url` identifies a primary surface that the implementation must match.
- `--reference-url` supplies mapped design or interaction references without becoming an automatic pixel baseline.
- If a reference intentionally replaces primary behavior, use `adaptive` and record the mapping; the result is fidelity to a mixed contract, not global 1:1.
- Exact runs require negotiated Browser, Builder, and Evidence ports. Each port records the selected adapter, actual capabilities, and its latest probe result.
- Missing ports or measurements produce `blocked`; complete evidence that misses a threshold produces `fidelity-limited`.
- Only the evaluator can mark `website-cloning.json` complete, and only after all required capabilities and measurements pass. The overall change remains `needs-review` until the normal accessibility, motion, responsive, engineering, and headless gates also pass.
- Verification is per declared viewport and per reference mapping, so an aggregate score cannot hide one broken breakpoint or interaction state.

See `skill/references/website-cloning.md` for the workflow and fidelity contract.

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

Or install from a GitHub Release package:

```bash
# download design-pipeline-skill.tgz from Releases, then:
mkdir -p ~/.codex/skills
tar -xzf design-pipeline-skill.tgz -C ~/.codex/skills
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

## Package / CI

```bash
node scripts/qa.cjs        # structure + self-check + package
node scripts/package.cjs   # writes dist/design-pipeline-skill.tgz (+ zip)
```

GitHub Actions:

- `CI` — runs QA and uploads package artifacts on every PR/push
- `Release` — on `v*` tags (or manual dispatch) publishes release assets

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


# design-pipeline

Design-first pipeline for AI-assisted frontend design work.

`design-pipeline` turns a messy collection of design, UX, motion, animation, frontend, and QA skills into a repeatable OpenSpec-aligned workflow.

It is not a general-purpose agent marketplace. Engineering integrations exist only to help produce, implement, validate, and preserve better design outcomes.

## What It Does

- Creates durable design artifacts before implementation.
- Synthesizes a project-specific `DESIGN.md` from requirements, repository constraints, and
  attributed website/template evidence.
- Adds first-class motion design documentation.
- Supports headless AI handoff through machine-readable state files.
- Self-checks optional companion skills, data-driven capability profiles, suites, and multi-root installs.
- Captures reusable pipeline gaps as redacted, deduplicated local Issue or PR drafts.
- Audits upstream companion evidence as current, stale, changed, untracked, or unknown.
- Bridges explicit publication authority through deterministic Issue/PR requests and receipts.
- Routes Anime.js v4.5 across layout, text, SVG, draggable, scroll, WAAPI, adapters, and Three.js work.
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

## Requirements-Driven DESIGN.md

Template collections such as `awesome-design-md` are useful evidence libraries, but they cannot
infer a target product's users, workflows, constraints, or component architecture. This pipeline
uses them as inspiration inputs while generating a new project design contract.

```powershell
node skill/scripts/init-design-synthesis.cjs `
  --change-id create-product-design-system `
  --problem "Design an operations console for support leads handling urgent escalations" `
  --reference-url https://example.com `
  --template "awesome-design-md:linear" `
  --framework nextjs
```

The run then:

1. requests `/grill-with-docs <problem>` and records its decision evidence;
2. measures scope against an explicit budget;
3. requests `/wayfinder 为此制作一张地图` only when the measured scope is oversized;
4. synthesizes and validates project `DESIGN.md`;
5. continues into tokens, components, implementation, and normal design-pipeline QA.

The issue tracker owns a real Wayfinder map. The bundled local scripts never fabricate one or
publish remotely.

See `skill/references/design-synthesis.md` for the full state machine and commands.

## Repository Layout

```text
skill/
  SKILL.md
  references/
    companion-capabilities.json
    design-synthesis.md
    design-synthesis.schema.json
    feedback-loop.md
    feedback-observation.schema.json
    upstream-capability-sync.md
    source-evidence.schema.json
    capability-audit.schema.json
    publication-request.schema.json
    publication-receipt.schema.json
  scripts/
    init-design-synthesis.cjs
    advance-design-synthesis.cjs
    check-deps.cjs
    record-feedback.cjs
    audit-capabilities.cjs
    prepare-publication.cjs
    reconcile-publication.cjs
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

To capture stale installed capabilities immediately as local contribution drafts:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json --record-feedback
```

The command writes under `.design-pipeline/feedback/` and never creates a remote Issue or PR.

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

## Feedback And Contributions

Record a pipeline or companion finding:

```powershell
node ~/.codex/skills/design-pipeline/scripts/record-feedback.cjs `
  --kind capability-gap `
  --source runtime `
  --skill animejs `
  --title "Anime.js companion lacks adapter guidance" `
  --summary "The requested Three.js target is supported upstream but missing from the installed companion." `
  --evidence "Self-check missing marker: adapters"
```

Repeated findings share one deterministic observation and increment its occurrence count. Machine-specific paths and common credential patterns are redacted before files are written. Review the draft before handing it to an authorized GitHub or ship workflow.

## Upstream Capability Sync

Network retrieval belongs to the host. After it writes schema-valid source evidence, the pipeline
performs a local, data-only comparison:

```powershell
node ~/.codex/skills/design-pipeline/scripts/audit-capabilities.cjs `
  --source-evidence .design-pipeline/source-evidence.json `
  --installed-evidence .design-pipeline/check-deps.json `
  --record-feedback `
  --json
```

An audit can prepare a deterministic publication request, but preparation never publishes:

```powershell
node ~/.codex/skills/design-pipeline/scripts/prepare-publication.cjs `
  --observation dpf-0123456789abcdef `
  --repository owner/repository `
  --action issue
```

After explicit authorization, a GitHub/browser host adapter performs the remote action, writes a
matching receipt, and `reconcile-publication.cjs` records the returned URL. Missing source evidence
is reported as `UNKNOWN`; ambient credentials never imply publication authority.

See `skill/references/upstream-capability-sync.md` for the evidence, host, idempotency, and receipt
contracts.

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


# design-pipeline

Design-first pipeline for AI-assisted frontend design work.

`design-pipeline` turns a messy collection of design, UX, motion, animation, frontend, and QA skills into a repeatable OpenSpec-aligned workflow.

It is not a general-purpose agent marketplace. Engineering integrations exist only to help produce, implement, validate, and preserve better design outcomes.

## What It Does

- Creates durable design artifacts before implementation.
- Requires a validated project `DESIGN.md` as the foundation for every implementation run.
- Requires a validated project `MOTION.md`, including an explicit `static` posture when motion is
  intentionally absent.
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
- Blocks website-cloning implementation until DOM and raster palette evidence, semantic roles,
  relationships, and implementation tokens are complete.
- Reviews anti-template risk through a contextual, evidence-backed rubric without installing
  mutable remote prompts as global agent instructions.

## Website Cloning

`design-pipeline` is a superset of a website-cloning prompt: it captures reference evidence, builds from complete component contracts, and independently compares the result before claiming fidelity.

```bash
node skill/scripts/init-website-clone.cjs \
  --change-id clone-example \
  --url https://example.com \
  --reference-url https://reference.example \
  --fidelity exact

# After authoring project DESIGN.md, project MOTION.md, and target palette evidence:
node skill/scripts/check-website-clone-foundations.cjs \
  --change-root openspec/changes/clone-example \
  --json

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
- Exact and adaptive runs both require ready project DESIGN/MOTION foundations and a ready palette
  foundation for every target. Adaptive mode may change the mapping contract, but it cannot bypass
  these gates.

See `skill/references/website-cloning.md` for the workflow and fidelity contract.

## Palette Foundation

Website-cloning runs capture DOM-derived and raster-derived colors separately, reconcile them into
semantic roles and relationships, and then map those decisions to implementation tokens. A few
accent swatches are not a valid palette foundation. Declared evidence paths must be portable,
present on disk, and contained below the target research directory after symlinks or Windows
directory junctions are resolved. Palette and anti-slop evidence use strict schemas, so unknown
fields are rejected instead of being silently ignored.

```powershell
node skill/scripts/check-palette-foundation.cjs `
  --change-root design/changes/clone-example `
  --json
```

The gate reports `pending`, `invalid`, or `ready`. Implementation and fidelity completion remain
locked until every declared target is `ready`.

## Requirements-Driven DESIGN.md

Template collections such as `awesome-design-md` are useful evidence libraries, but they cannot
infer a target product's users, workflows, constraints, or component architecture. This pipeline
uses them as inspiration inputs while generating a new project design contract.

The file is mandatory, but its contents are never a mandatory template copy:

```powershell
node skill/scripts/check-design-foundation.cjs --project-root . --json
```

`ready` unlocks implementation. `synthesis-required` routes into the initializer below. `invalid`
requires repair or resynthesis.

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

## Project MOTION.md

Every project declares its motion posture in a root `MOTION.md`. The foundation describes motion
principles, timing, easing, choreography, interaction states, reduced-motion behavior, performance
budgets, and source decisions. It uses a clean-room primitive vocabulary so an agent can reason
about motion without copying gallery code or treating one animation library as the design language.

```powershell
node skill/scripts/check-motion-foundation.cjs --project-root . --json
```

`ready` unlocks implementation. `synthesis-required` means the file is missing. `invalid` means the
foundation must be repaired. Change-level `motion.md` files specialize the project foundation and
record its hash; they do not replace it.

## Contextual Anti-Slop Review

The pipeline internalizes useful anti-template observations as structured QA, not as a global taste
law. Hard product-quality failures can block. Contextual findings require design reasoning.
Preferences such as named colors, fonts, punctuation, pills, gradients, or familiar layout families
remain advisory.

```powershell
node skill/scripts/evaluate-anti-slop.cjs `
  --root . `
  --evidence design/changes/example/anti-slop-evidence.json `
  --json
```

The evaluator writes `.design-pipeline/reviews/anti-slop-review.json`. Retrieved source prompts are
tracked by URL and content hash, remain inert evidence, and are never appended to global
`CLAUDE.md` or `AGENTS.md`.

See `skill/references/anti-slop-review.md` for the evidence contract and Stage 2/3/6 integration.

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
    anti-slop-review.md
    anti-slop-rubric.json
    anti-slop-rubric.schema.json
    anti-slop-evidence.schema.json
    anti-slop-review.schema.json
    palette-evidence.schema.json
    motion-foundation.md
    motion-foundation.schema.json
    motion-primitives.json
  scripts/
    check-design-foundation.cjs
    check-motion-foundation.cjs
    check-palette-foundation.cjs
    check-website-clone-foundations.cjs
    init-design-synthesis.cjs
    advance-design-synthesis.cjs
    check-deps.cjs
    record-feedback.cjs
    audit-capabilities.cjs
    prepare-publication.cjs
    reconcile-publication.cjs
    evaluate-anti-slop.cjs
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

Windows PowerShell example:

```powershell
$target = Join-Path $HOME ".codex\skills\design-pipeline"
New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item skill\* $target -Recurse -Force
node (Join-Path $target "scripts\check-deps.cjs")
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

## CLI And Reference Catalog Direction

The current scripts remain the deterministic kernel. A future `designer-pipeline` CLI may provide a
single lifecycle façade, while `designmd` and `motionmd` remain responsible for their own document
semantics. Public template collections may be connected as optional, attributed reference
providers; they never become the authority for project `DESIGN.md` or `MOTION.md`.

See `docs/cli-and-reference-providers.md` for the boundary and planned command surface.

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

- `CHANGELOG.md`
- `skill/references/open-source-readiness.md`
- `skill/references/qa-checklist.md`
- `openspec/specs/design-pipeline/spec.md`


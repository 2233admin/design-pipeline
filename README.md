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
- Routes the official PixiJS v8 skill suite for justified interactive 2D rendering, with explicit
  scene, lifecycle, performance, accessibility, reduced-motion, and fallback contracts.
- Routes graphics by durable capability family before library choice, with normative `scene.json`
  plus a human-readable `scene.md` projection for 2D, 3D, game, GPU, geospatial, and persistent
  narrative state.
- Exposes one stable `designer-pipeline` CLI for lifecycle state, evidence, motion/component gates,
  tokens/UI IR, benchmarks, adapter governance, local feedback, and release diagnostics.
- Provides a native Phaser v4 route for browser games and a game UI/Galgame profile for HUD,
  dialogue, choices, backlog, skip, autoplay, save/load, localization, and accessibility.
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

PixiJS is available as an optional 2D rendering route, not as the default answer to animation.
When sprite fields, particles, filters, shaders, canvas editors, or high object counts justify it,
the pipeline routes through the official `pixijs` skill suite and requires change `motion.md` plus
`scene.md` to name temporal semantics, renderer, scene graph, ticker, assets, performance budget,
accessibility strategy, reduced-motion substitution, and cleanup. See
`skill/references/pixijs-rendering.md`.

## Graphics, Game UI, and Scene Runtime

The stable abstraction is a capability contract, not a favorite library. The pipeline first
classifies the surface as semantic UI, data/vector graphics, 2D editor canvas, 2D scene renderer,
2D game engine, 3D renderer, 3D game engine, geospatial 3D, GPU/shader work, or narrative game UI.
It then preserves the target project's accepted runtime or chooses the smallest suitable adapter.

Persistent spatial or engine-owned work adds normative change `scene.json` and a matching
`scene.md` projection. The sidecar records coordinates, lifecycle, assets, input,
UI/accessibility boundaries, adapter/version, performance budgets, deterministic evidence,
degradation, and cleanup in a machine-checkable contract. The Markdown file explains the same
decisions and must match the sidecar identity and foundation hashes. `DESIGN.md` remains the visual
system and `MOTION.md` remains the reusable motion language.

Phaser v4 is the built-in route for a complete browser-based 2D game runtime. PixiJS remains the
specialized 2D renderer route. Three.js and React Three Fiber cover focused 3D rendering;
Babylon.js and PlayCanvas cover fuller 3D engine needs. Data, geospatial, WebGPU/WGSL, and
narrative adapters are cataloged without making every library a mandatory dependency.

The official Phaser Game Agent MCP is optional because it is credentialed and metered. An
unlicensed community Phaser skill pack is tracked only as a curation candidate and is never
auto-installed. See `skill/references/graphics-runtime-routing.md`,
`skill/references/graphics-runtime-catalog.json`, `skill/references/adapter-registry.json`,
`skill/references/scene-runtime-spec.md`,
`skill/references/phaser-v4.md`, and `skill/references/game-ui-and-narrative.md`.

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
    graphics-runtime-routing.md
    graphics-runtime-catalog.json
    scene-runtime-spec.md
    phaser-v4.md
    game-ui-and-narrative.md
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

From this repository, use the path-contained installer:

```bash
node scripts/install-local.cjs --source skill --root ~/.codex/skills --target ~/.codex/skills/design-pipeline
node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .
```

An existing target is preserved unless `--replace` is explicit. The installer stages the copy and
renames it atomically; symlinks, directory junctions, and paths outside the selected root/target
boundary are rejected.

To capture stale installed capabilities immediately as local contribution drafts:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json --record-feedback
```

The command writes under `.design-pipeline/feedback/` and never creates a remote Issue or PR.

Windows PowerShell example:

```powershell
$target = Join-Path $HOME ".codex\skills\design-pipeline"
node scripts\install-local.cjs --source skill --root (Split-Path $target) --target $target
node (Join-Path $target "scripts\designer-pipeline.cjs") doctor --root .
```

Or install from a GitHub Release package:

```bash
# download design-pipeline-skill.tgz from Releases, then:
mkdir -p /tmp/design-pipeline-release
tar -xzf design-pipeline-skill.tgz -C /tmp/design-pipeline-release
node /tmp/design-pipeline-release/design-pipeline/scripts/install-local.cjs \
  --root ~/.codex/skills \
  --target ~/.codex/skills/design-pipeline
node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .
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

## Unified CLI And Reference Providers

`skill/scripts/designer-pipeline.cjs` is the stable lifecycle façade over the deterministic kernels.
It emits `design-pipeline.cli-result.v1`, contains every project path below `--root`, and uses exit
code `0` for success, `1` for invalid input/error, and `2` for blocked or failed verification.

```powershell
node skill/scripts/designer-pipeline.cjs doctor --root . --json
node skill/scripts/designer-pipeline.cjs status --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs scene check --root . --change-root openspec/changes/example --json
node skill/scripts/designer-pipeline.cjs adapter audit --root . --json
```

The CLI does not replace DESIGN/MOTION document semantics and never publishes remotely. Public
template collections remain optional, attributed reference providers; they cannot overwrite a
validated project foundation.

See `docs/cli-and-reference-providers.md` for the boundary and planned command surface.

## Package / CI

```bash
node scripts/qa.cjs
node scripts/package.cjs --output-root dist
```

QA is hermetic: it checks manifest parity, syntax, all tests, control-plane smoke commands,
byte-reproducible archives, archive completeness, failure atomicity, isolated installation,
installed-package CLI behavior, and a byte-identical repository status before/after the run.

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
| `scene.json` / `scene.md` | Machine scene contract / readable projection |
| `state.json` / `events.jsonl` / `handoff.md` | CAS-protected state / append-only history / readable resume note |

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


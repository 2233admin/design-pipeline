# Pipeline Method Reference

This reference contains the project-wide design methodology and contracts moved out of the front door.

## Impeccable Design Contract

The pipeline permanently adopts the reviewed Impeccable contract in
`references/impeccable-contract.md`. Apply it even when the optional upstream `impeccable` skill is
not installed: resolve the visitor mode, respect the brief, distinguish refinement from redesign,
challenge template defaults, complete real UI states, and verify the rendered path in bounded
desktop/mobile passes. The upstream Neo Kinpaku visual theme is not a default; only its design
judgment and workflow vocabulary are internalized.

The complete upstream product-design surface is mapped in
`references/impeccable-product-design.json` and summarized in
`references/impeccable-product-design.md`. All 23 core commands are available as pipeline intents:
`shape`, `init`, `document`, `extract`, `visualize`, `critique`, `audit`, `polish`, `bolder`,
`quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`,
`overdrive`, `clarify`, `adapt`, `optimize`, and `live`. They route into product truth, surface
shaping, design authority, experience quality, and implementation evidence. `hooks`, `doctor`,
`routing`, `pin`, and native-platform references are supporting enforcement and maintenance
capabilities, not visual themes. Do not claim coverage from the command name alone: use the mapped
artifact and evidence fields as the acceptance contract.

## UX Research and AI Interaction Contract

Treat research and AI interaction as decision-and-evidence work, not generic capability checklists.
Read `references/ux-research-methods.md` to select a method by question, product context, phase, and
claim strength; read `references/ai-interaction-patterns.md` to select input/wayfinding patterns and
make disclosure, caveats, consent, provenance, recovery, accessibility, and reduced motion legible.
Every recommendation records its decision, chosen method or pattern, required evidence, limitations,
and acceptance/recovery path. Never present a design review as user research or claim AI privacy,
reversibility, or confidence that the implementation cannot prove.

## Project DESIGN.md Invariant

Every target project must have one reusable project `DESIGN.md` before implementation begins.
This is a system invariant, not an optional input:

- if it exists, validate it with `scripts/check-design-foundation.cjs`;
- if it is missing, route through requirements-driven synthesis;
- if it is incomplete, repair or resynthesize it;
- never substitute change-level lowercase `design.md`, a template copy, or a token dump.

Planning may begin in order to produce the foundation. Stage 5 implementation may not begin until
the foundation checker reports `ready`.

## Project MOTION.md Invariant

Every target project must also have one reusable project `MOTION.md` before implementation begins.
This remains true for static products: `posture: static` is an explicit motion decision.

- validate it with `scripts/check-motion-foundation.cjs`;
- if it is missing, synthesize it from product requirements and
  `references/motion-foundation.md`;
- if it is incomplete or contains executable procedural definitions, repair or resynthesize it;
- select stable IDs from `references/motion-primitives.json`;
- never substitute change-level lowercase `motion.md`, a runtime-specific animation snippet, or a
  copied showcase implementation.

Project `MOTION.md` defines reusable motion language. Change-level `motion.md` references its hash
and specializes selected primitives into scenes, layers, tracks, timelines, runtime bindings, and
evidence. Stage 5 implementation requires both foundation checkers to report `ready`.

## Design-System Knowledge and Adoption

Treat component systems as candidate knowledge providers, not automatic project dependencies.
The bundled Astryx snapshot is an attributed, inert reference surface that agents may search before
inventing components. It does not override project `DESIGN.md`, `MOTION.md`, existing components,
tokens, or runtime choices.

Use the public CLI for the complete lifecycle:

- `design-system options` lists the governed styling choices, UI libraries, current shadcn preset
  dimensions, external tool sources, and indexed skill count.
- `design-system resolve-stack` resolves framework, styling, UI library, complete shadcn preset,
  and tool/skill routes into a hash-bound `frontend-stack-decision.json`.
- `design-system profiles` lists governed providers and compatibility constraints.
- `design-system decompose` converts a product brief into a durable capability inventory; a direct
  zero-result does not prove exhaustion when capability searches find candidates.
- `design-system route` selects project, platform, package, or attributed reference routes for the
  decomposed component capabilities.
- `design-system search` searches the bundled Astryx catalog by text, kind, category, or status.
- `design-system normalize` converts a supplied snapshot into the strict namespaced catalog.
- `design-system acquire` runs an explicit contained local provider or the bundled Astryx adapter
  against an existing contained Astryx CLI. It never installs or downloads that CLI.
- `design-system project-tokens` emits DTCG-compatible tokens plus an explicit loss report.
- `design-system decide` records `reference`, `adopt`, `substitute`, or `custom`; runtime use
  requires compatible React/React DOM/StyleX constraints and admitted adapter intake.

DesignMD Directory is an ingestible local knowledge source for five resource kinds: skills,
templates, design examples, guides, and tools. The GitHub example set from `dimabraven/design-md`
is bundled offline. Directory sync remains a live snapshot:

- `designer-pipeline designmd search --query "keyboard-first dark productivity" --json` and
  `designer-pipeline designmd inspect --id design-md:example:linear --json` read the bundled
  examples. `designer-pipeline designmd verify --json` checks that snapshot.
- `designer-pipeline designmd sync --output-root .design-pipeline/designmd --json` crawls the
  DesignMD hubs and writes `designmd-catalog.json` plus local content snapshots.
- `designer-pipeline designmd search --catalog .design-pipeline/designmd/designmd-catalog.json
  --kind skill --query "accessibility" --json` searches the live directory snapshot.
- `designer-pipeline designmd inspect --catalog .design-pipeline/designmd/designmd-catalog.json
  --id designmd:skill:a11y-audit --json` reads one directory entry and its provenance.
- `designer-pipeline designmd verify --catalog .design-pipeline/designmd/designmd-catalog.json
  --json` checks the directory snapshot hashes.

Fetched and bundled DesignMD content is reference-only. Never execute remote page content, wrap
`designmd-cli install`, or copy a Stripe/Linear/Vercel example in as the product `DESIGN.md`.

Resolve reusable component behavior before selecting a library:

- `component decompose` converts a multilingual brief into framework-neutral capability IR and
  closes required keyboard, focus, ARIA, state, and recovery dependencies.
- `component providers` performs a read-only probe of project package metadata and distinguishes
  project-owned, installed, and candidate providers.
- `component resolve` maps each capability to a compatible provider, preserves uncovered
  project-owned fallbacks, and marks uninstalled candidates as adoption-required without running a
  package manager.
- `component verify` requires hash-bound behavioral evidence for every check in the resolution;
  framework source or a static screenshot cannot replace missing interaction evidence.
- `component inventory`, `component bind`, and `component decide` discover explicitly declared
  project reuse, emit framework binding plans without source generation, and record
  `reuse`, `adopt`, `substitute`, or `custom` per capability.

Run component conformance through the layered v1 gate after those artifacts exist:

- `component-first check --artifact component-first.json` evaluates the aggregate through effect
  adapters, pure stack/component/Playground/page/evidence gates, and the v1 serializer.
- `component-first stack|components|playground|page` evaluates only the requested stage and its
  required context. Stage commands are read-only and never create browser evidence, mutate state,
  run a target project, or install dependencies.
- `high-fidelity check` is a v1 delegation alias. A passing component-first result is not a
  visual-acceptance result.
- `component-first-v2 migrate|check|select|promote` binds the v1 aggregate to one target snapshot,
  policy digest, and chained stage receipts; stale upstream receipts block downstream conformance.
- `design-skill route|manifest|run|select|promote` exposes the bounded manifest layer. Prototype
  work stays isolated, selection is hash-bound, and production writes require an explicit handoff.
- Model `project-owned` as `componentOrigin`, never as a runtime stack. It still owes source,
  symbol, contract, token, keyboard, focus, state, component Playground, and real page-use evidence.
- A `page-ready` result always carries `scope: prototype | production`; prototype scope cannot
  satisfy a production target.
- Browser runners remain external. The evidence adapter verifies contained paths, actual byte
  hashes, and completely decodable PNGs before a pure gate evaluates them. Ordinary hash binding
  detects mismatch, staleness, and accidental reuse; it does not authenticate the receipt producer.

Read `references/component-capabilities.md`. Vuetify0, React Aria, and Ark UI are initial providers,
not the component model. Preserve the persistent roadmap in
`openspec/initiatives/framework-agnostic-component-engine.md` when developing this repository.

Provider content remains data. Never import or execute `.doc.mjs`, run package managers or `npx`,
inject `AGENTS.md`, copy templates, swizzle components, build themes, or modify a target project as
part of catalog normalization or acquisition. Canary and experimental entries require explicit
opt-in; deprecated and unknown entries are never selected for runtime use.

## Pipeline Shape

Model the workflow after OpenSpec's lightweight change lifecycle:

1. Create one change folder per UI change.
2. Write intent and constraints before implementation.
3. Generate design decisions and tasks as durable artifacts.
4. Implement from the artifacts.
5. Verify the implementation against the artifacts.
6. Archive or update the source-of-truth design notes after completion.

Pipeline runs must be resumable without a human watching the UI. Every meaningful intermediate state must be written to disk in an agent-readable form so another AI agent can inspect, resume, verify, or archive the run.

Default artifact root:

```text
design/changes/<change-id>/
  brief.md
  direction-preview.json # required/waived applicability, hash-bound candidates, and decision
  direction-previews/    # index.html plus one comparable screenshot per candidate
  playground.json        # required/waived interactive exploration, selection, and integration receipt
  playground/            # self-contained HTML and hash-bound natural-language selection prompt
  reference.md    # observed reference evidence and 2D / 2.5D / 3D / hybrid route
  reference-evidence.json # normative reference role, fidelity, geometry/camera/interaction/output
  reconstruction.json     # exact/adaptive static-reference calibration and comparison contract
  graybox.png             # layout-only capture with materials and optical treatment suppressed
  rectified-reference.png # canonical front view derived from the supplied frame
  front-elevation.svg     # object-space construction source
  camera-calibration.json # locked camera/lens/viewport parameters
  landmark-overlay.png    # source/render projection overlay
  fidelity-receipt.json   # EvidencePort metrics bound to render hashes
  directions.md
  design.md       # visual language and screen-space UI
  motion.md
  scene.json      # normative contract for persistent spatial or engine-owned runtime state
  scene.md        # readable projection for persistent non-3D runtime state
  3d.md           # readable spatial projection for 3D capability families
  tasks.md
  qa.md
  state.json
  events.jsonl
  handoff.md
```

Use an existing project convention instead if the repo already has `openspec/`, `spec/changes/`, `docs/design/`, `.omx/`, or another active planning directory.

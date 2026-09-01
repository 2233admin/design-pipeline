# Multi-Surface Design Pipeline

## Decision

The design pipeline will support multiple product surfaces under one Project. Web and Mobile are first-class platform profiles. Game is reserved as a future profile and is not part of the first implementation wave.

The system shares workflow and design facts across a Project, while keeping platform-specific retrieval, adaptation, implementation, and acceptance rules on each Surface.

```text
Project
  ├─ shared brand, domain, assets, provenance, design tokens
  ├─ Surface: web-admin
  │    └─ WebProfile
  ├─ Surface: mobile-user
  │    └─ MobileProfile
  └─ future Surface: game-ui
       └─ GameProfile
```

## Problem

A page reference cannot be adapted reliably by treating Web, Mobile, and Game as one generic UI target. The rendering model, input model, accessibility constraints, performance budget, layout behavior, and acceptance criteria differ by platform.

The current pipeline already has direction preview and direction lock, component-fit governance, and text/metadata catalog search. It does not yet have a platform-aware template inventory, region-level template selection, a selection receipt, or an adaptation plan.

## Goals

- Keep one auditable workflow for reference intake, candidate selection, adaptation, review, and task generation.
- Support multiple Web and Mobile surfaces in one product Project.
- Share brand and domain facts without sharing incompatible platform implementation rules.
- Make platform constraints participate before candidate retrieval, not only during code generation.
- Preserve license, provenance, accessibility, and safety gates as non-overridable constraints.
- Start with project-internal pages and local HTML as controlled reference inputs.
- Keep Game extensible without allowing Web or Mobile assumptions to become a universal UI model.
- Guide users who cannot express a complete design requirement up front.
- Adapt questioning depth to the evidence already supplied by the user.

## Guided Design Intake

The pipeline must not assume that the user already has a reference or a structured brief. Every
entry point first goes through an evidence extraction and clarification step. The guide turns a
vague request, a reference, or an existing project surface into a user-confirmed `DesignBrief`.

```text
user input
  → extract known facts
  → identify the highest-impact missing fact
  → ask one focused question
  → update proposed brief
  → user confirms, edits, or skips
  → DesignBrief
```

The guide is adaptive:

- a vague idea receives more questions;
- a screenshot receives questions about purpose and interaction rather than repeated visual
  description;
- an existing project page receives questions about the intended change;
- a structured brief receives a short confirmation pass rather than a full questionnaire.

The guide must prefer options, examples, and comparisons over a blank request for detailed prose.
It must show its current understanding and record assumptions explicitly.

The default user experience combines an Agent conversation with a live structured design panel.
The conversation accepts natural language; the panel shows the current brief, confirmed decisions,
agent suggestions, assumptions, and unresolved questions. The panel is the reviewable state and the
conversation is the input surface.

The guide must not behave as an unbounded questionnaire. It should generate the first direction
draft as soon as these core facts are confirmed:

```text
target audience
primary task
target Surface
success criteria
```

The user may request a draft earlier, skip a question, edit the proposed brief, or ask the Agent to
recommend a default. A skipped or recommended value remains marked as unresolved or agent-proposed
until the user confirms it.

Once the core facts are confirmed, the guide should present two or three materially different
direction drafts. Each draft must explain its intended scenario, layout, interaction posture,
benefits, and tradeoffs. The Agent may recommend one draft, but the user may choose another, ask
for a new comparison, or defer the decision. Direction lock happens only after this comparison.

### DesignBrief

```text
brief_id
project_id
surface_id
audience
user_problem
usage_context
primary_actions
content_and_data_density
brand_and_style_constraints
platform_constraints
reference_ids
success_criteria
assumptions
uncertainties
status: empty | inferred | clarifying | proposed | user_confirmed | stale
```

Only a `user_confirmed` brief may enter formal direction locking or task generation. The guide may
continue from a confirmed brief when new evidence makes it stale, but it must not silently replace
the confirmed version.

The guide must distinguish:

```text
known fact
user decision
agent suggestion
unresolved question
```

It must never fabricate audience, business goals, interaction requirements, brand constraints, or
success criteria.


## Non-goals

- A three-way rewrite into independent Web, Mobile, and Game products.
- Visual embedding or image similarity search in the first wave.
- URL crawling and screenshot understanding in the first wave.
- Game catalog, Game retrieval, or Game implementation in the first wave.
- Automatic installation, copying, or overwriting of remote template source.
- Automatic conversion from a selected template directly into development tasks.

## Domain model

### Project

Project owns facts that should remain coherent across surfaces:

- product identity and domain vocabulary;
- brand colors, typography, icons, and approved assets;
- shared design principles and token sources;
- provenance records;
- shared reference policies.

Project does not own platform-specific layout or interaction behavior.

### Surface

Surface is the unit of platform-specific experience and delivery. A Surface has:

```text
surface_id
project_id
platform: web | mobile | game
framework
platform_profile_version
direction_lock
catalog_scope
acceptance_profile
status
```

A Project may contain multiple Surfaces. Every template selection, direction lock, adaptation plan, and generated task is bound to one Surface.

### Platform Profile

A Platform Profile contains the rules that vary by target:

- supported capabilities;
- candidate ranking and hard gates;
- interaction model;
- accessibility requirements;
- performance budget;
- framework constraints;
- task-generation template;
- acceptance checks.

The initial profiles are:

#### WebProfile

Responsive layout, DOM semantics, keyboard and pointer input, accessibility, SEO where applicable, forms, data density, SSR/hydration constraints, and browser compatibility.

#### MobileProfile

Touch targets, safe areas, navigation and back-stack behavior, gestures, keyboard/input behavior, offline and weak-network states, native control expectations, device variation, and mobile interaction motion.

#### GameProfile

Reserved only. It will eventually cover scene/HUD composition, resolution scaling, controller and keyboard input, frame and GPU budgets, asset loading, animation state, spatial UI, and localization expansion.

### ReferenceSource

A normalized record for a project page or local HTML reference:

```text
reference_id
source_kind: project_page | local_html
path_or_project_ref
content_hash
captured_at
provenance
license_state
allowed_derivations
parse_status
```

Missing provenance or license state blocks `adopt` and allows only `reference` use.

### RegionTemplate

A candidate at region level. Components are nested implementation candidates, not peer page templates.

```text
template_id
template_version
region_kind
capabilities
layout_traits
components_used
framework
license
provenance
adaptation_boundary
catalog_status
```

Examples of `region_kind` are `header`, `hero`, `data-table`, `sidebar`, `filter-panel`, and `empty-state`.

### SelectionReceipt

The immutable, surface-bound record of a user selection:

```text
receipt_id
project_id
surface_id
reference_hash
region
candidate_template_version
component_candidate_versions
selection_mode: adopt | reference
selection_reason
source_and_license_evidence
direction_lock_snapshot
technical_constraints
hard_gate_results
allowed_changes
forbidden_changes
expected_differences
acceptance_criteria
created_at
```

A receipt must point to immutable candidate versions. Catalog changes do not silently mutate an existing receipt.

### AdaptationPlan

A reviewable projection of how a selected reference will become project-native work:

```text
plan_id
receipt_id
surface_id
preserved_structure
replaced_components
platform_adaptations
token_mappings
accessibility_changes
license_and_provenance_notes
forbidden_copying
expected_visual_differences
acceptance_checks
status: draft | awaiting_review | revised | approved | rejected
```

Only `approved` plans may create development tasks.

## Workflow

```text
user input
  → extract known facts
  → adaptive clarification
  → user-confirmed DesignBrief
  → direction preview
  → user selects direction or defers decision
  → direction lock only after selection
  → ReferenceSource normalization
  → region / slot decomposition
  → region template retrieval
  → component-fit for region implementation candidates
  → user selects adopt or reference
  → SelectionReceipt
  → AdaptationPlan draft
  → user review
  → approved plan
  → surface-bound development tasks
```

The guide must ask one focused question at a time. It should choose options, examples, and
comparisons when they reduce user effort. At each checkpoint it must show the current proposed
brief and distinguish known facts, user decisions, agent suggestions, and unresolved questions.

Only a `user_confirmed` DesignBrief may enter formal direction locking or task generation.

The first retrieval order is deterministic and explainable:

```text
region semantics
→ capabilities
→ framework and project stack
→ accessibility
→ license and provenance
→ layout traits
→ component-fit result
```

The system must return both matches and rejection reasons. It must support an explicit `no suitable candidate` result.

## Precedence rules

From strongest to weakest:

1. License, provenance, security, and mandatory accessibility gates.
2. Surface framework and non-negotiable technical constraints.
3. Surface direction lock for global visual language.
4. User-selected template for local region structure.
5. Visual similarity and other soft ranking signals.

`adopt` means the selected candidate enters the adaptation workflow within these constraints. It does not authorize copying source code or violating a hard gate.

`reference` means the candidate supplies visual or structural inspiration only. It does not create an adoption obligation.

A template cannot silently unlock or rewrite a Surface direction lock. A direction change requires a separate explicit direction workflow.

## Platform isolation

Candidate retrieval, adaptation, and acceptance are Surface-scoped. A Web candidate must not be presented as a Mobile candidate without an explicit compatibility result and adaptation boundary.

Project-shared facts may be reused:

```text
brand palette
font family
approved icons
domain terminology
shared assets
```

Surface-owned facts must not be copied by default:

```text
layout
navigation
interaction behavior
component implementation
motion
breakpoints
gesture behavior
performance assumptions
```

## Failure behavior

The pipeline fails closed for:

- missing or unverifiable provenance;
- unsupported framework or platform capability;
- mandatory accessibility failure;
- direction-lock conflict that cannot be adapted;
- stale or hash-mismatched reference or candidate;
- malformed local HTML;
- catalog entries without stable versions;
- adaptation plans that omit required differences or acceptance checks;
- task generation requested before a `user_confirmed` DesignBrief exists.

The guide must not fill missing facts by invention. An unresolved fact remains visible as an
uncertainty and blocks only the transitions that require it.

The pipeline must distinguish:

```text
no candidate
candidate blocked
source unavailable
source invalid
candidate stale
adaptation rejected
```

These are not interchangeable with an empty successful result.

## First implementation wave

1. Add Project Surface concepts without changing existing Web behavior.
2. Define `WebProfile` and `MobileProfile` contracts.
3. Add adaptive Guided Design Intake and `DesignBrief` state transitions.
4. Build project-page and local-HTML `ReferenceSource` adapters.
5. Add region-level inventory records and metadata search.
6. Reuse `component-fit` only inside a selected region.
7. Emit immutable `SelectionReceipt` records.
8. Emit reviewable `AdaptationPlan` records.
9. Require explicit approval before task creation.
10. Add end-to-end fixtures for vague input, one Web Surface, and one Mobile Surface.

Visual embedding, screenshots, URLs, and GameProfile remain later slices.

## Verification contract

The implementation must test observable behavior:

- vague input enters adaptive clarification instead of directly generating tasks;
- the guide asks one focused question at a time and shows the current proposed brief;
- known facts, user decisions, agent suggestions, and uncertainties remain distinguishable;
- a task cannot be generated before a `user_confirmed` DesignBrief exists;
- a complete brief takes a shorter confirmation path than a vague request;
- the first direction output contains two or three materially different drafts with tradeoffs;
- the Agent recommendation is distinguishable from the user's selected direction;
- direction lock is created only after a user selection or explicit confirmation;
- one Project can contain multiple Surfaces;
- Web and Mobile use different platform gates for the same region kind;
- a selected candidate is bound to the correct Surface;
- missing provenance blocks `adopt` but permits `reference`;
- direction lock cannot be silently rewritten by template adaptation;
- catalog version changes do not mutate an existing receipt;
- an unapproved AdaptationPlan cannot create tasks;
- a rejected or revised plan cannot create tasks until approved;
- no suitable candidate is a first-class result;
- a project page and local HTML reference produce stable hashes and provenance records;
- a Game candidate cannot enter Web or Mobile retrieval without an explicit compatible profile.

## Decision summary

The system is split by **Surface**, not by duplicated product pipelines:

```text
one Project
  + adaptive Guided Design Intake
  + confirmed DesignBrief
  + many Surfaces
  + shared project facts
  + platform-specific profiles
  + surface-bound receipts and plans
```

Web and Mobile are first-class now. Game is an explicit future profile. The first implementation
should guide vague requirements into a confirmed brief, then deepen inventory, provenance,
receipt, and adaptation review before adding visual search.

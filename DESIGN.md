---
version: "1.0"
name: Design Pipeline
description: Evidence-backed product design orchestration for coding agents
---

# Design Pipeline

## Product Context

Design Pipeline helps coding agents turn product intent, repository constraints, and attributed
reference evidence into a durable design foundation before implementation. The active foundation
invariant was established by `openspec/changes/enforce-design-foundation`.

Its primary users are developers and AI agents who need a resumable path from an incomplete design
request to implementation and evidence-backed QA.

## Overview

The product should feel calm, exact, and inspectable. It favors explicit state, small commands,
plain-language decisions, and repository-native artifacts over decorative workflow UI or opaque
automation.

Every project owns a synthesized `DESIGN.md`. Change-level `design.md` files may specialize it but
cannot replace it.

## Colors

- Documentation and CLI output use the host terminal or documentation theme by default.
- Status semantics are stable: green for passed, amber for fallback or planned debt, red for a
  blocking failure, and blue only for neutral navigation or references.
- Generated product designs define their own palette; this pipeline does not impose a house palette
  on downstream products.

## Typography

- Use the repository's documentation type system.
- Use monospace for commands, paths, identifiers, hashes, state names, and machine contracts.
- Prefer short declarative headings and readable prose over promotional language.

## Layout

- Present lifecycle information in dependency order: intent, evidence, decisions, tasks,
  implementation, verification, handoff.
- Keep one source of truth per concern and link related artifacts instead of duplicating them.
- Keep machine-readable state adjacent to human-readable context.

## Components

- Project foundation: `DESIGN.md`.
- Motion foundation: project `MOTION.md`, including an explicit `static` posture when motion is not
  part of the product.
- Palette foundation: DOM and raster color evidence reconciled into semantic roles, relationships,
  and implementation tokens before website-cloning implementation.
- Change contract: `brief.md`, `directions.md`, lowercase `design.md`, `motion.md`, `tasks.md`,
  and `qa.md`.
- Headless state: `state.json`, `events.jsonl`, and `handoff.md`.
- Evidence adapters: browser, website-cloning, capability audit, and host publication receipts.
- Contextual anti-slop review: structured hard, contextual, and preference rules plus explicit
  evidence and accepted-context decisions.
- Guard commands: initialization, transition, foundation validation, self-check, QA, and packaging.

Each component must have a deterministic contract, explicit failure state, and a resumable handoff.

## Do's and Don'ts

### Do

- Synthesize project identity from requirements and attributed evidence.
- Validate `DESIGN.md` before implementation begins.
- Validate the palette foundation before implementing a website clone.
- Treat motion as a reusable design language with timing, choreography, state, accessibility, and
  performance decisions.
- Preserve user decisions, provenance, and rejected alternatives.
- Preserve useful anti-template observations without granting mutable external prompts design
  authority.
- Fail closed at filesystem, authority, and remote-receipt boundaries.

### Don't

- Do not copy a public template and present it as project design.
- Do not treat a token dump as a complete design foundation.
- Do not infer a complete palette from accent colors alone.
- Do not invent an issue map, publication receipt, measurement, or user decision.
- Do not let framework or animation integrations become the product boundary.
- Do not copy showcase animation code or turn a runtime API into the motion language.
- Do not convert named colors, fonts, punctuation, shapes, effects, or common layouts into
  universal design failures.

## Source Decisions

### Adopted

- Adopted the public DESIGN.md convention of machine-readable frontmatter plus human-readable
  product guidance.
- Adopted OpenSpec-style change artifacts and append-only event evidence for resumability.
- Adopted reference sites and template collections as attributed evidence only.
- Adopted a blocking palette-evidence gate for website-cloning work.
- Adopted a two-level motion contract: project `MOTION.md` plus change-level `motion.md`.
- Adopted a contextual anti-slop rubric that blocks product-quality defects while keeping
  subjective fashion signals advisory.

### Rejected

- Rejected copying a generic DESIGN.md template as the default project foundation.
- Rejected gallery, loader, animation-library, or benchmark projects as motion-spec authority.
- Rejected installing a reference catalog directly over the project's `DESIGN.md`.
- Rejected optional DESIGN.md enforcement at implementation time.
- Rejected automatic remote publication from local scripts without exact user authority.
- Rejected appending mutable remote taste prompts to global agent instruction files.

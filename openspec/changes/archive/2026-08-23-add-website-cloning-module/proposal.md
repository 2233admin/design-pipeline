# Proposal: add website-cloning module

## Why

`design-pipeline` already governs design research, implementation artifacts, motion, QA, and headless handoff, but it does not define how to reverse-engineer a live website before those gates run. The `UHolli/ai-website-cloner` workflow contains a useful extraction-to-build protocol, yet its Next.js scaffold and cache runtime are outside this project's design-first boundary.

## What

- Add a progressively disclosed website-cloning module to the distributable skill.
- Route clone, replica, rebuild, and reverse-engineering requests from the main skill.
- Add a deterministic Node initializer for URL validation, target isolation, and resumable run artifacts.
- Define Browser, Builder, and Evidence ports plus measurable exact/adaptive fidelity gates.
- Adapt reconnaissance, interaction discovery, component specifications, foundation sequencing, builder dispatch, assembly, and visual-diff repair to the existing OpenSpec lifecycle.
- Extend repository QA and tests to cover the new public seam.
- Preserve upstream MIT attribution for the adapted workflow.

## Non-Goals

- Do not import the upstream Next.js application, Redis cache, API routes, or dependencies.
- Do not require a specific browser provider, frontend framework, package manager, or agent runtime.
- Do not create a second source of truth beside the active OpenSpec change.
- Do not automate cloning of sites without considering ownership, licensing, and terms.

## Impact

Users can ask `design-pipeline` to clone one or more live URLs. The skill creates isolated target artifacts under one OpenSpec change, negotiates capture/build/comparison capabilities, records resumable state, and applies the project's existing design and QA gates.

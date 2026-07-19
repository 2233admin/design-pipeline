# Proposal: add requirements-driven DESIGN.md synthesis

## Why

The pipeline can clone authorized websites and consume existing design artifacts, but it cannot yet
turn an incomplete product request into a project-specific `DESIGN.md`.

Public collections such as `awesome-design-md` provide useful analyzed examples. They do not know
the target product, audience, workflows, constraints, framework, or desired relationship to a
reference site. Copying one of those files would substitute a template for design reasoning.

The missing capability is an interactive synthesis loop:

1. challenge the request against repository and product documentation;
2. recognize when the effort is larger than the current execution budget;
3. map oversized work through a real Wayfinder host adapter;
4. synthesize a new `DESIGN.md` from requirements and cited evidence;
5. continue into implementation without losing state.

## What

- Add a local-first design-synthesis manifest and initializer.
- Add a deterministic transition command for grill, scope assessment, Wayfinder handoff,
  DESIGN.md validation, and implementation continuation.
- Treat website captures and template libraries as attributed evidence, never as generators or
  product authority.
- Keep lowercase change `design.md` separate from the reusable project-root `DESIGN.md`.
- Extend the agent interface, skill routing, self-check, package QA, and tests.

## Non-Goals

- Do not scrape a website or call a model from the bundled Node scripts.
- Do not create issue-tracker maps without a configured Wayfinder host adapter.
- Do not copy a third-party brand identity, proprietary asset, or template wholesale.
- Do not claim that token extraction alone is a complete design system.

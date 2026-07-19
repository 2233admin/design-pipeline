# Brief

## Goal

Refresh `design-pipeline` so current companion capabilities—especially Anime.js v4.5—are routed from actual design needs instead of skill-folder presence.

## Audience

AI agents and maintainers using the pipeline across visual design, website reconstruction, motion, animation runtimes, React/Next.js, editable design handoff, and hosted delivery.

## Constraints

- Preserve the design-first product boundary.
- Keep optional companions non-blocking.
- Add no dependency.
- Preserve the target repo's existing runtime before proposing another.
- Do not crawl host-specific plugin caches.

## Non-Goals

- Upgrade target application dependencies.
- Rewrite the installed third-party `animejs` skill.
- Refactor the website-cloning initializer in this change.

## Acceptance Checks

- Local and remote feature lines are integrated.
- Anime.js v4.5 routing includes adapters, Three.js, 3D stagger, jitter, and seed.
- Self-check distinguishes missing, installed/current, and installed/stale companions.
- Multi-root discovery is covered by tests.
- Package QA, repository tests, installed self-check, and Sentrux gate pass.

---
schema: design-pipeline.motion-foundation.v0.1
name: design-pipeline motion language
posture: static
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# design-pipeline Motion Foundation

## Motion Thesis

The repository ships deterministic command-line workflow behavior and documentation. Its own
interfaces remain static; motion belongs to the target products that consume the pipeline.

## Motion Principles

- Never require animation to understand or operate a pipeline command.
- Preserve direct state transitions, readable output, and deterministic evidence.
- Keep target-project motion authored in that project's `MOTION.md`.

## Motion Vocabulary

No moving primitive is selected for this repository's static posture. The bundled registry is an
authoring vocabulary for target projects, not motion executed by the package itself.

## Procedural Motion

Disabled for the repository interface. Equations in target-project foundations are declarative
data and must pass the motion foundation checker before an adapter can implement them.

## Runtime Policy

The package adds no animation runtime. CSS, WAAPI, Anime.js, GSAP, SVG, Canvas, and WebGL remain
optional target-project adapters with explicit capability and degradation decisions.

## Reduced Motion

Fallback: every repository workflow remains fully available as immediate text and file state with
no interpolation, looping, parallax, flashing, or motion-only meaning.

## Source Decisions

- Adopted: an explicit static posture and a clean separation between the specification vocabulary
  and target-project runtime adapters.
- Rejected: showcase animation code, hidden runtime dependencies, and decorative motion in
  command-line or documentation surfaces.

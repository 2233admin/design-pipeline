# Proposal: refresh capability routing for current design runtimes

## Why

`design-pipeline` can report every companion group as installed while still routing from stale capability assumptions. The clearest case is Anime.js: the pipeline describes it as a lightweight DOM/SVG option, while Anime.js v4.5 covers layout, accessible text splitting, draggable interactions, scroll observers, WAAPI, adapters, Three.js, 3D stagger, and deterministic jitter.

The repository also gained a website-cloning evidence module on `origin/main`, while local work added Emil companions and release packaging. These lines need one integrated, capability-first pipeline.

## What

- Integrate the website-cloning module with the local Emil/packaging branch.
- Add a capability-routing reference across evidence, visual direction, systems, assets, motion, runtimes, framework fit, editable handoff, hosting, and QA.
- Promote Anime.js routing to the official v4.5 capability surface.
- Separate install discovery from capability compatibility in `check-deps.cjs`.
- Support explicit multi-root skill discovery.
- Add deterministic tests for current, stale, missing, and multi-root capability profiles.

## Non-Goals

- Do not install or upgrade Anime.js in target applications.
- Do not mutate the separate installed `animejs` skill.
- Do not add dependencies.
- Do not infer plugin-cache filesystem layouts.
- Do not replace GSAP, CSS, React View Transitions, or a target repo's existing animation runtime.

## Impact

Pipeline runs can distinguish “installed” from “current enough for this capability,” choose Anime.js or GSAP from the actual design need, and keep stale optional companions non-blocking with an explicit official-doc fallback.

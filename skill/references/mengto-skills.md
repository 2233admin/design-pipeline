# Built-in MengTo Skills Library

`design-pipeline` ships the complete reviewed source tree from
[`MengTo/skills`](https://github.com/MengTo/skills) as a pinned, MIT-attributed package resource.
It is available offline and does not depend on a global skill install. The upstream files remain
byte-preserved under `references/mengto-skills/upstream/`; this overlay defines how the pipeline
uses them without rewriting upstream authorship or mixing local policy into future syncs.

The manifest at `references/mengto-skills/manifest.json` is the source of truth for revision,
Git tree, license, file and byte counts, canonical tree hash, categories, all skill descriptions,
activation policy, and pipeline-stage mapping. Upstream README counts are descriptive only; the
manifest is generated from the tracked tree.

## Operating Protocol

1. Search before inventing a visual technique or workflow:

   ```bash
   designer-pipeline mengto search --query "scroll-controlled Three.js world" --json
   ```

2. Read the narrowest matching bundled `SKILL.md`, then only its linked references, scripts,
   assets, and demo files needed for the current task.
3. Treat project `AGENTS.md`, `DESIGN.md`, `MOTION.md`, OpenSpec artifacts, existing components,
   existing dependencies, accessibility rules, and measured budgets as higher authority than an
   upstream example or default.
4. Reuse upstream workflow order, numeric guidance, failure modes, and verification gates. Adapt
   product names, paths, assets, framework commands, runtime ownership, and output contracts to the
   target repository.
5. Demos and runtime assets are reference evidence. Do not copy them into a target product merely
   because they are bundled, and do not add GSAP, Three.js, Matter.js, Lenis, Tailwind, or another
   dependency unless the requested capability and target stack justify it.
6. Preserve accessibility, reduced-motion, cleanup, responsive, and performance checks even when
   the selected visual recipe is simplified.

## Activation Boundary

Web-design, UI, media, game-development, and design/verification Codex playbooks may be selected
automatically by capability. Account-bound, publication, voice-imitation, social-posting, Apple
profiling, TTS, and browser-video workflows are `explicit`: retain them in the complete library,
but use them only when the user requests that capability and the normal authority, credential, paid,
privacy, and external-side-effect boundaries are satisfied.

This keeps the library complete without turning the design pipeline into a general-purpose skill
marketplace.

## Kage Source Boundary

The bundled MIT snapshot includes the `web-design/build-threejs-scroll-worlds` playbook and its
reviewed demo. The separate [`MengTo/kage`](https://github.com/MengTo/kage) repository now states
that its original code and artwork are not licensed for reuse or redistribution. Do not merge the
two provenances or import later Kage files into the snapshot. When Kage is the reference, read
`references/kage-scroll-world.md` for the clean-room architecture, current responsive lessons, and
verification matrix.

## Pipeline Stages

- **Stage 0/1 — Repo and reference evidence:** capture, originality, video-to-prompt, HTML-to-prompt,
  stitched-page, and inspiration workflows.
- **Stage 2/3 — Directions and design:** design-first prompting, brand worlds, layout/style systems,
  assets, motion language, and spatial-world playbooks.
- **Stage 4/5 — Implementation:** CSS mechanisms, animation systems, Three.js/WebGL, component
  states, game systems, and vertical slices.
- **Stage 6 — QA:** audit/verify, animation optimization, performance, browser playthrough, release
  proof, accessibility, reduced motion, lifecycle, and cleanup checks.

Search results are candidates, not design decisions. Record the selected playbook and project-owned
adaptations in `directions.md`, `design.md`, `motion.md`, or `qa.md` as appropriate.

## Maintaining The Snapshot

Update from one clean upstream checkout:

```bash
node scripts/import-mengto-skills.cjs --source /path/to/MengTo-skills --reviewed-at YYYY-MM-DD
node skill/scripts/designer-pipeline.cjs mengto verify --json
node --test tests/mengto-skills.test.cjs
```

The importer reads every tracked blob directly from the pinned Git `HEAD` object tree, rejects dirty
tracked sources and unsupported Git modes, rebuilds
the manifest, and atomically replaces the prior snapshot. Update the third-party notice and reviewed
date when the revision changes. Never edit `upstream/` in place or replace it with summaries.

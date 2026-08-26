# Built-in iart Motion Skills Library

`design-pipeline` ships the reviewed MIT packs from
[`iart-ai/motion-skills`](https://github.com/iart-ai/motion-skills) as pinned, inert package
resources. The index repository and every pack that includes a LICENSE are bundled. The
`generative-illustration-skills` pack is excluded until a LICENSE appears in a reviewed revision.

The overlay defines how the pipeline uses those files. Upstream bytes stay unmodified.

## Operating Protocol

1. Route before implementing. A domain brief is enough; the agent must select a playbook and
   runtime before writing motion or installing tools:

   ```bash
   designer-pipeline iart route --query "tiktok caption animation" --json
   designer-pipeline iart verify --json
   ```

2. `iart search` is the narrower lookup after a route, not a substitute for selection.
3. Read the selected bundled `SKILL.md`, then only the linked references, scripts, and examples
   needed for the current task.
4. Project `DESIGN.md`, `MOTION.md`, OpenSpec artifacts, existing runtimes, accessibility rules, and
   budgets outrank an upstream recipe.
5. For HTML video, reels, captions, overlays, or explainers, keep `references/hyperframes.md` as
   the runtime unless the brief names Remotion, Manim, or After Effects.
6. Do not install Remotion, Manim, After Effects, ffmpeg, or other upstream toolchains from a
   route result. `installRequired: true` is a gate, not permission.

## Activation Boundary

The user names a domain or deliverable, not a skill id. `tiktok` / `reels` / `explainer` /
`remotion` is enough to open selection. The agent then ranks playbooks and picks a runtime.

`automatic` playbooks may be selected on ordinary UI/motion briefs. `explicit` playbooks stay out
of generic UI work, but become selectable as soon as the brief names that domain. Selection is not
execution: route results are `executableReady: false` until MOTION, toolchain, and authority gates
pass.

## Pipeline Stages

- **Stage 2/3 — Directions and design:** animation principles, art direction, kinetic type, shot
  composition, motion language.
- **Stage 4/5 — Implementation:** GSAP/SVG/Lottie/page transitions, Three.js/WebGL, explicit video
  recipes when requested.
- **Stage 6 — QA:** accessible motion, 60fps budgets, deliver-and-verify stills, reduced-motion.

Search results are candidates, not design decisions. Record the selected playbook in `motion.md` or
`qa.md`.

## Maintaining The Snapshot

```bash
node scripts/import-iart-motion-skills.cjs --source-root /path/to/iart-checkouts --reviewed-at YYYY-MM-DD
node skill/scripts/designer-pipeline.cjs iart verify --json
node --test tests/iart-motion-skills.test.cjs
```

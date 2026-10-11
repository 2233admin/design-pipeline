# Tools: load only what the task needs

These tools support drawing, images, typography, layout, frontend work and animation. Choose
by the visual problem; using a helper does not create a film project or select a style.

| Need | Open next | Available now |
| --- | --- | --- |
| Improve a bounded design prompt or skill instruction through comparable cases | [Independent GEPA optimization](../references/gepa.md) | Native feedback-driven candidate search, frozen training/validation/final-test splits and exported proposals; optional pinned Python runtime |
| The visible goal needs a method or implementation beyond the current tools | [Find and apply a capability](open-source-design.md) | Active GitHub/upstream discovery, source inspection, a rendered study and task-local adoption |
| Find visual references, assets or a specific design operation | [Design sources](design-sources.md) | User's design directory, task-based lookup and transfer into existing reference/preview tools |
| New-site design, existing-project redesign, aesthetic critique or a chosen UI style | [Built-in Taste suite](../references/taste-skill.md) | Thirteen complete local methods; select by task and keep the project stack and checks |
| Website/mobile concept images, brand boards or image-to-code | [Taste output selection](../references/taste-skill.md#choose-the-deliverable) | Image-only guidance uses an available provider; user references can go directly to verified frontend implementation |
| Continuous ink, pressure, path reveal, static paper grain | [Canvas craft](visual-craft/README.md) | Callable, caller-sized Canvas helpers and browser study |
| Fit short labels, keep a readable minimum, place/crop images, choose sprite frames | [Canvas craft](visual-craft/README.md) | Measured layout and explicit overflow; keep product text in semantic DOM |
| Choose and obtain a font, compare real copy, handle CJK/Latin and font variants | [Font sources and selection](fonts.md) | FontLab and primary sources, project-local acquisition, actual-family and rendering checks |
| Compare a reference and render, locate changed regions | [Visual diagnostics](visual-diagnostics/README.md) | `composition compare`, original pair, difference image and hashes |
| Find where a sampled reference video changes | [Visual diagnostics](visual-diagnostics/README.md) | `reference analyze-video`, timed frames and spatial motion maps |
| Watercolor, impasto, flow fields, lighting, print and post effects | [Art Motion](art-motion/README.md) | Isolated, caller-sized Canvas runtime |
| Charts, diagrams, collage, type treatments, cameras, character construction | [Art Motion](art-motion/README.md) | Callable namespaces, optional style/grammar studies and transitions |
| Font subsets, glyph coverage, matte/sprite preparation, synthesis | [Asset/audio tools](art-motion/assets-audio.md) | Maintained tools with explicit inputs and fresh outputs |
| Multi-world travel, interaction pauses and style boundaries | [Scroll helper](art-motion/scroll.md) | Caller-owned world, subject and camera callbacks |
| Style recipes, cue-driven clips, exact-frame/alpha export, audiovisual reference breakdown | [Art Motion](art-motion/README.md) | 35 style studies, 8 clip grammars, full method routing |
| Poses, spacing, acting, audiovisual phrasing | [Animation thinking](../references/animation-thinking.md) | Existing choreography and motion study |
| Explicit product film or short motion loop | [Built-in film methods](../references/film-methods.md) | Complete Cinetic/product-film sources, real component provenance, selected recipes and configurable motion primitives through existing film tools |
| Reusable motion case structures | [Prompt Motion template library](../references/prompt-motion/README.md) | Offline `film templates` search/detail; indexed sources, curated inputs/rules and authored adaptation limits |
| DOM/SVG timelines, scroll, layout or existing Three.js property animation | [Runtime guidance](../references/capability-routing.md) | Local GSAP playbook, Anime.js construction/seek/cleanup methods; companions optional |
| Layout/text checks, interactions, 3D and GPU materials | [Composition](../references/composition-gate.md), [runtime routing](../references/graphics-runtime-routing.md) | Existing capture, gates and project renderer |
| Intrinsic layout, CSS tokens, content/overflow, control states and native CSS motion | [Good CSS](../references/good-css.md), [offline specimens](good-css/README.md) | Complete pinned practices and a Node-only builder for local live studies |

Read this index first, then one tool guide, then the needed function/example. Do not preload the
whole source library. Existing adapters and receipts retain their authority.

## Try one small tool

Install the `design-pipeline` skill and scaffold a Visual Craft study in the project you are
working on. Use the installed CLI's absolute path as reported by your installer or agent, and set
`--root` to the project; installation and upgrade steps are in [Install and upgrade](../references/installation.md).

```sh
SKILL_ROOT="/absolute/path/to/installed/design-pipeline"
node "$SKILL_ROOT/scripts/designer-pipeline.cjs" \
  composition scaffold --root "$PWD" --template visual-craft --output "visual-craft-study"
```

Example instruction for an agent: “Create a `visual-craft-study` in this project with the
Visual Craft scaffold. Make a small responsive drawing and typography study with a seekable
progress control, semantic DOM copy, and a visible report when text overflows. Render it at two
sizes and inspect cold and reordered progress values.” This bounded tool use does not require
creating a film or initializing the full design workflow.

For a small model, give one visible goal, actual inputs, the selected tool/function, dimensions,
editable files, and an observable check. Let it implement and render a bounded study. The lead
inspects the resulting pixels and, for motion, playback; compare against the user's direction.
Record what worked, evidence, why, applicable conditions and remaining limits in the task's
existing design/QA notes. Technical success never supplies the user's Visual Acceptance.

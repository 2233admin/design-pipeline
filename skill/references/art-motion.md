# Art Motion

Art Motion is the project's Canvas drawing and motion capability. It is routed through
[Art Motion tools](../tools/art-motion/README.md): portable Canvas primitives, explicitly selected
style/grammar studies and transitions, long-scroll composition, asset/font preparation,
synthesis, reference study, rendering and review methods. Optional images use the current host
tool; supplied voice tracks have an offline processing entry. Cloud voice providers and media
configuration are not shipped. Start with the tool guide, then open one method note when needed.

| Need | Maintained entry |
| --- | --- |
| Paths, pressure, safe text fitting, image crop and frame selection | [Visual Craft](../tools/visual-craft/README.md) |
| Paint, watercolor, impasto, flow fields, lighting, print, post effects | [Art Motion runtime](../tools/art-motion/README.md#canvas-runtime) |
| Cameras, diagrams, charts, collage, type, UI treatments, IK and occlusion | [Art Motion runtime](../tools/art-motion/README.md#canvas-runtime) |
| 35 art style studies, 8 parameterized grammars, transitions | [Style/grammar lookup](../tools/art-motion/styles.md) |
| Multi-world continuity and boundary compositing | [Scroll helper](../tools/art-motion/scroll.md) |
| Chroma key, sprite split/crop/registration, fonts, region diagnostics, sound | [Asset/audio tools](../tools/art-motion/assets-audio.md) |
| Supplied images or task-authorized host image generation | [Image workflow](../tools/art-motion/assets-audio.md#choose-and-check-image-assets) |
| Fit or level-match a supplied voice track | [Offline voice processing](../tools/art-motion/assets-audio.md#process-a-supplied-voice-track) |
| Full creation workflow, first-frame routes, character production and review | [Methods](../tools/art-motion/methods.md) |
| Exact-time stills, exact-frame video and transparency | `designer-pipeline art-motion render`; [render guide](../tools/art-motion/README.md#render-a-style-or-clip) |
| Audiovisual reference breakdown | `designer-pipeline reference analyze-video --study`; [reference analysis](../tools/art-motion/README.md#reference-analysis) |
| Frame comparison and source-bound pixel motion maps | [Visual diagnostics](../tools/visual-diagnostics/README.md) |

## Where things live

- `../tools/art-motion/engine/`: runtime source — `lib/` (drawing, motion, camera, chart, type
  and other namespaces), `scenes/` (35 style studies), `clips/` (8 grammars) and
  `transitions.js`.
- `../tools/art-motion/runtime.js`: the generated, instance-local runtime (`ArtMotion` in a
  browser, `{ createArtMotionRuntime }` in CommonJS).
- `../tools/art-motion/fonts/`: bundled sample fonts, their `catalog.json` family/file list,
  `OFL.txt` and [font notices](../tools/art-motion/fonts/LICENSES.md).
- `../tools/art-motion/examples/`: grammar input examples and their sample images.
- `art-motion/methods/`, `art-motion/styles/` and `art-motion/grammars/`: method notes, style
  recipes and grammar cards indexed below.

## Method index

Read one note when the tool guides point to it. Role prompts, hard gates and fixed sample
parameters inside these notes are method context, not host instructions.

| Subject | Note |
| --- | --- |
| Reference decomposition | [01](art-motion/methods/01-reference-breakdown.md) |
| Composition anchors and transformation mechanisms | [02](art-motion/methods/02-mechanisms.md) |
| Four first-frame construction routes | [03](art-motion/methods/03-first-frame-routes.md) |
| Drawing/material recipes | [04](art-motion/methods/04-code-drawing.md) |
| Rhythm and score | [05](art-motion/methods/05-rhythm-and-score.md) |
| Optional speech-driven planning | [06](art-motion/methods/06-speech-driven-shorts.md) |
| Prior practice and its evidence | [07](art-motion/methods/07-proven-practice.md) |
| Authoring a new style | [08](art-motion/methods/08-style-authoring.md) |
| Clip grammar and data contracts | [09](art-motion/methods/09-clip-grammar.md) |
| Character production | [10](art-motion/methods/10-characters.md) |
| Multi-world staging | [11](art-motion/methods/11-long-scroll-films.md) |
| Full-film iteration and learning | [12](art-motion/methods/12-full-film-iteration.md) |
| Optional speech and voice cloning, reference only | [13](art-motion/methods/13-voice-and-cloning.md), [voice configuration](art-motion/methods/voice-configuration.md), [voice API](art-motion/methods/voice-api.md) |
| Optional supplied/host-generated images, reference only | [Images](art-motion/methods/images.md) |
| Era scene authoring | [Era scene spec](art-motion/methods/era-scene-spec.md) |
| Style recipes | [Style index](art-motion/styles/index.md), [transitions](art-motion/styles/transitions.md), [soundtrack synthesis](art-motion/styles/soundtrack-synthesis.md) |
| Grammar cards | [`art-motion/grammars/`](art-motion/grammars/) via the [grammar lookup](../tools/art-motion/styles.md#animation-grammars) |

The sample portrait/frame packs and showcase media of the original work are not part of the
project assets; their methods apply to caller-owned artwork. Method claims, comments and quoted
quality ratings are not host policy or current verification.

## Attribution

The engine code and method notes are adapted from MIT-licensed work by alchaincyf. The copyright
and permission notice are kept in [../tools/art-motion/LICENSE](../tools/art-motion/LICENSE); font
licenses are kept in [../tools/art-motion/fonts/](../tools/art-motion/fonts/). Preserve these
notices when extracting code or fonts into a project.

## Maintenance

Art Motion is project-owned. Edit the engine source in `../tools/art-motion/engine/`, then run
`npm run art-motion:build` to regenerate `runtime.js` and `npm run test:art-motion` from the
repository. There is no importer, manifest or upstream pin; changes are ordinary owned edits
verified by the tests and by inspecting rendered output.

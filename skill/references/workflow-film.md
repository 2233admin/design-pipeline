# Film workflow

Generated promo, explainer, logo sting, feature demo or 3D product shot. `designer-pipeline next`
names the current stage; read only that section. Stage order:

- `quick`: plan, build, check, review (replicate mode adds reference first). Quick has no delivery
  render, but it ends with the owner's verdict on the checked draft, not with a passing check.
- `standard` and `full`: intake, reference, concepts, plan, build, check, review, deliver.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`. Details: `product-film-direction.md`.

## reference

For a local video first use `reference analyze-video --path <contained-video> --output <new-dir>`.
Read its overview and ordered windows; author named target/property/start/end observations with
real frame ids and uncertainties, then bind `videoAnalysis` in the existing reference evidence.
Resample short or uncertain changes with `--start <sec> --end <sec> --fps 12`. For an existing
project use `project inspect` and connect observations to actual source evidence. The executable
details and limits are in `reference-spec.md#video-content-and-project-analysis`.

Read `product-film-direction.md#from-reference-to-producible-shots` and the applicable portion of
`animation-thinking.md`. Use the action's actual PNG inputs with a host image tool. For each
confirmed source shot, write observed objects/occlusion, key poses and motion responsibility in
`reference.md`, then separately propose layer order, real replacement assets, missing artwork and
an existing production mechanism. A sampling window is not a confirmed shot and a layer proposal
is not extracted artwork. Source study must reach these production notes before making the film.

Watch 1-3 moving references at full speed and write `reference.md`: observed timings, cuts,
rests, sound, and what to transfer. In `replicate` mode the reference is the thing being
reproduced and cannot be skipped. Otherwise the user may decline references
(`decide --stage reference --answer none`).
Record geometry, material, lighting and view-angle response; enamel, foil and metal are distinct
requirements. Route and inspection samples: `film-materials.md`.

## concepts

For motion-led work read `animation-thinking.md`: define the viewer's intended read, key poses
and how timing/spacing develops it. Use the user's chosen direction directly; alternatives are
useful when a creative decision is unresolved, not a compulsory style exercise.

Write `concepts.md` with three cards whose central ideas differ, not the same scenes retold three
ways. Each card starts with the central idea as one sentence about the picture ("one dot becomes
every screen of the app"), then what carries attention between beats, look, tools in one line (for
example "3D shot in Blender, score in Strudel"), and any missing license. Render one key frame per
card. The user picks one (`decide --stage concept --choice 1|2|3`).

## plan

- `film scaffold --output .` starts a passing `storyboard.json` and a composition.
- Read the reference's observed shots and production notes, then fill beats from the selected
  direction using existing `subject`, `productAction`, `transformation`, `motion`, `choreography`,
  `carrier` and `note` fields. `note` carries source times/frame ids, layer order, asset paths and
  unresolved dependencies; `reference` points to `reference.md`. Patterns: `film-choreography/`.
- The scaffold is an editable example. Replication cannot advance with its unchanged beats even
  if the structure check passed; changing reference notes also reopens the existing plan check.
- For selected concept/technique or real brand/component discovery, read [film-methods.md](film-methods.md).
  `film methods --project-root . --input plan.json --write` records the selected full recipes and
  actual source hashes, and installs bounded motion primitives for the current fps. It consumes
  the existing storyboard and does not create another renderer, gate or acceptance result.
- In replicate mode fill `storyboard.json.rendering` from the reference: route, requirements,
  reason and material sample times. The storyboard gate rejects incapable declared routes.
- Carry: every beat whose handoff is `continuation`, `morph`, `camera-carry` or `match-cut` names
  a `carrier` — what survives the boundary and what it becomes ("prompt bar opens into the app
  window"). A claimed carry with nothing named for it to carry is a placeholder, not a plan.
- Rhythm: allocate time to the action and phrasing. Equal pulses, long held images and nonstop
  movement can be deliberate; the gate's ratios and rest checks are review warnings. Record the
  intent in beat `note`, inspect it at speed and keep or revise it based on the actual effect.
- `verify film-storyboard --storyboard storyboard.json` must pass. Editing the storyboard later
  reopens this stage until the gate passes again.

## build

Pick the lowest-rung tool that reaches each beat:

| Need | Command | Guide |
|---|---|---|
| Ready-made block or transition | `film blocks --project-root . --query <action words>` | `hyperframes.md` |
| Key-pose timing, held poses, breakdowns, optional stroke reveal | `film scaffold --template motion-study --output <new-dir>`; reuse `pose-to-pose` / `draw-on` | `animation-thinking.md` |
| 3D product shot | `film blender --project-root . --template product-turntable` | `film-blender.md` |
| Enamel, solid bevels, angle-dependent materials | WebGL/Three.js + GLSL or Blender | `film-materials.md` |
| Music as code | `film score --project-root . --bpm <n> --template <name>` | `film-score.md` |
| Loudness and fades | `audio master --input <audio> --output <wav>` | `audio-gate.md` |

For a new movement choice, render a short study before extending the film. Inspect key poses,
spacing, contact and handoff at speed and by frame; a smooth ease alone does not design an action.
Then render the draft: `npx --no-install hyperframes render --output out.mp4` (the scaffold's
`package.json` pins hyperframes 0.8.137 and gsap 3.15.0; run `npm install` once first).
Before a full material shot, verify shader compilation, reverse seeking and fixed-time angle
response, and inspect actual frames at `rendering.samples`. Reuse `film-materials/enamel.mjs`.

## check

`film check --project-root .` runs the storyboard, timeline, render and composition gates. Apply
each error finding's `fix` and rerun; resolve warnings through viewing and record the decision in
`qa.md`, not by blindly optimizing a number. The composition gate measures the rendered beat
midpoints and, when the composition is captured, its visible text five times a second plus both
sides of every beat boundary: held text-on-text overlap fails; a passing overlap, a faint copy
under legible text, resting text within 4% of the frame edge and text under 2.4% of the frame
height are review prompts. Deliberate layering takes `data-layout-allow-overlap`; deliberate
warnings take `film check --allow <code>`. Static UI layout: `composition capture` then
`verify composition` (`composition-gate.md`). A re-render reopens this stage.

## review

The gates sample beats and text, not every frame, and never grant acceptance. Before asking,
review the checked draft frame by frame: `ffmpeg -i out.mp4 -vf fps=1 evidence/second-%03d.png`,
open every frame at full size and look for text overlap, clipping, empty transitional frames,
edge crowding, too-small text and wrong values. Fix, re-render and rerun `film check`; write the
frame and creative review in `qa.md`. Then show the draft video, `evidence/contact-sheet.png` and
a one-paragraph gate summary. The owner accepts, or rejects with one sentence
(`decide --stage review --verdict accept|reject`). A rejection becomes a project rule that every
later `next` returns and reopens the check. Every tier asks; quick reports `done` after an
accepted draft, standard and full after the accepted draft's delivery render.

## deliver

Render the final quality once (`npx --no-install hyperframes render --quality high --output final.mp4`), then
`decide --stage deliver --answer final.mp4`.

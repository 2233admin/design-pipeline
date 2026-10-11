# Film workflow

Generated promo, explainer, logo sting, feature demo or 3D product shot. `designer-pipeline next`
names the current stage; read only that section. Stage order:

- `quick`: plan, build, check, review (replicate mode adds reference first). Quick has no delivery
  render, but it ends with the owner's verdict on the checked draft, not with a passing check.
- `standard` and `full`: intake, reference, concepts, plan, build, check, review, deliver.

A product promo (Stage 0 `deliverableForm: product-launch-video`; bind the plan with
`next --project-root . --job-plan job-plan.json`) is built from the real product:

- `quick`: source, plan, build, check, review (replicate: reference, source, plan, build, check,
  review).
- `standard` and `full`: intake, source, reference, concepts, plan, sample, build, check, review,
  deliver.

Real product material is an admission precondition, not a score. Until
`storyboard.json.productSource` is admitted, `film check`, `verify film-storyboard` and
`verify film-render` return only the admission findings and evaluate nothing else; `film-eval`
leaves the run unmeasured. Other films keep the stage orders above.

## intake

Ask the four intake questions in one numbered round, each with its recommendation; record the
reply with `decide --stage intake`. Details: `product-film-direction.md`. For a product promo the
assets question asks for the product's repository and how to run it; the recommendation is the
product's own repository, run at a pinned commit, with its real UI captured and nothing invented.

## source

Product promos only. The film is built from the product itself, never from invented screens, mock
UI or text cards standing in for it.

1. Run `film scaffold --output .` first if `storyboard.json` is missing.
2. Clone the product's repository and check out one full commit SHA. Start the run log with the
   output of `git -C <checkout> rev-parse HEAD`, then the start command and its output.
3. Run it in demo or seeded mode with local fixture data. Never sign in to live accounts or make
   real trades, payments or messages to obtain a capture.
4. Capture at least one real UI state (`ui-state`) and one user operation (`operation`) with its
   visible response and result. Keep the run log and captures inside the project, e.g. `source/`.
5. Record `storyboard.json.productSource` with each file's sha256 and actual capture time:

```json
"productSource": {
  "status": "admitted",
  "repository": "https://github.com/TraderAlice/OpenAlice",
  "commit": "3fe612277df7e149fbb48c3bbe5fd30770052857",
  "run": { "command": "pnpm --dir ui dev --mode demo", "observedAt": "2026-09-19T10:54:00Z",
           "log": { "path": "source/run.log", "sha256": "<sha256 of the file>" },
           "url": "http://localhost:5173" },
  "captures": [
    { "id": "market", "kind": "ui-state", "path": "source/market.png", "sha256": "<sha256>",
      "shows": "Market tab, NVDA 1Y, 251 candles", "capturedAt": "2026-09-19T10:55:00Z" },
    { "id": "switch-3m", "kind": "operation", "path": "source/switch-3m.mp4", "sha256": "<sha256>",
      "shows": "user clicks 3M", "capturedAt": "2026-09-19T10:56:00Z" },
    { "id": "candles-63", "kind": "ui-state", "path": "source/candles-63.png", "sha256": "<sha256>",
      "shows": "chart redraws with 63 candles", "capturedAt": "2026-09-19T10:56:10Z" },
    { "id": "pinned", "kind": "ui-state", "path": "source/pinned.png", "sha256": "<sha256>",
      "shows": "3M range pinned on the watchlist", "capturedAt": "2026-09-19T10:56:30Z" }
  ],
  "flow": { "action": ["switch-3m"], "response": ["candles-63"], "result": ["pinned"] }
}
```

The repository is a credential-free URL (no local path); the commit is a full SHA, not a branch,
tag or short SHA. `flow.action` cites an operation capture; captures follow `run.observedAt`; and
the flow's captures read action, then response, then result. `next` returns the remaining
`product-source-*` findings, each with its `fix`; a malformed record is reported as
`product-source-invalid` with the contract message.

If the product cannot be run or captured, record why and stop:

```json
"productSource": {
  "status": "blocked",
  "repository": "https://github.com/example/product",
  "blocker": { "kind": "needs-credentials", "reason": "The dashboard requires a live broker login.",
               "needs": "A demo mode or seeded test account from the owner." }
}
```

| `blocker.kind` | Use when |
|---|---|
| `no-repository` | No source repository exists or was supplied, including physical products |
| `access-denied` | The repository or required assets cannot be accessed |
| `build-failed` | Install or build fails at the pinned commit |
| `run-failed` | The product does not start or crashes before the flow |
| `needs-credentials` | Running or capturing needs accounts, keys or live services you may not use |
| `capture-failed` | It runs, but the UI state or operation cannot be captured |

A blocked record carries no `run`, `captures` or `flow`. `next` then returns `type: "blocked"`
with the blocker, exits 2 and does not advance; ask the user for what `needs` names and replace
the record with an admitted one. Never continue with invented scenes meanwhile. Non-software
products have no repository and are blocked (`no-repository`) under this contract.

Limits: gates hash the recorded files and check that the run log names the commit; they cannot
prove that captured pixels came from the product. Capture honestly from the recorded run; the
owner judges the material in the sample and review.

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
- Product promo: list the capture ids each beat is built from in `beats[].source`
  (`"source": ["switch-3m"]`). Every action beat cites captures; each flow step (action, response,
  result) needs an action beat citing one of its captures; beats with `source` cover at least 50%
  of `durationSec`. A beat without real material becomes a short title/brand hold or is removed.
  The run log, captures and bound job plan are checked inputs: changing them reopens this check.
- Carry: every beat whose handoff is `continuation`, `morph`, `camera-carry` or `match-cut` names
  a `carrier` — what survives the boundary and what it becomes ("prompt bar opens into the app
  window"). A claimed carry with nothing named for it to carry is a placeholder, not a plan.
- Rhythm: allocate time to the action and phrasing. Equal pulses, long held images and nonstop
  movement can be deliberate; the gate's ratios and rest checks are review warnings. Record the
  intent in beat `note`, inspect it at speed and keep or revise it based on the actual effect.
- `verify film-storyboard --storyboard storyboard.json` must pass. Editing the storyboard later
  reopens this stage until the gate passes again.

## sample

Standard and full product promos. Before building the whole film, cut a 5–8 s `sample.mp4` at the
project root from the captures cited in `beats[].source`, showing the action, the response and
the result. Use the real captures with crops, zooms, masks and captions; no invented cards or
redrawn UI. `next` then asks the owner to view `sample.mp4` beside its capture files; record the
reply with `decide --stage sample --verdict accept|reject [--answer "<reason>"]`. A rejection
needs `--answer` and becomes a project rule. Acceptance binds the sample bytes and the
`productSource` record; replacing either asks again. The sample verdict settles the material
direction only; it is not the film's Visual Acceptance.

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

Product promo: build from the admitted captures cited in `beats[].source`. Place the recorded
screens and clips, then crop, zoom, mask, sequence and caption them; never redraw the product's UI
or invent screens, data or cards. Motion and type support the product's own material.

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

For a product promo the check stops at the storyboard step, with only the admission findings,
until `productSource` is admitted; the run log, captures and bound job plan are hashed inputs.

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

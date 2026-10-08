# Product-film direction

This is project-owned creative policy. Apply it to product promotional films and animations,
including ordinary requests such as "做一个宣传动画" and HTML previews. Read it before storyboard,
template, or runtime selection. The user supplies the product and purpose; the agent supplies
film direction. Ask only for missing product facts, audience, claims, assets, or delivery constraints
that materially affect the work. Infer duration from context and visual grammar from inspected
moving references and available material, rather than from a familiar implementation pattern.
For the movement itself, use `animation-thinking.md`: acting intent, staging, key poses, timing
and spacing. These decisions also apply to PV/MAD and explanations; a voice track need not
produce a whiteboard or a literal picture for every sentence.

For the selected concept, product discovery or technique gap, use [built-in film methods](film-methods.md):
Cinetic's complete concept/technique/timing sources and Product Film's real brand/component reuse.
Its `film methods` preparation consumes this workflow's existing storyboard and retains source
hashes; it does not replace direction, the selected renderer or owner acceptance.

## 1. Inspect moving references and available material

Start with the user's references. When none are supplied, find a small set of relevant finished
films yourself (usually 2–3) and choose a primary direction; the user need not provide style jargon.
One sufficient supplied reference does not require an unrelated reference search. Watch motion,
including transition intervals, rather than inferring an edit from thumbnails or a site's styling.
When accessible, inspect the source project's read-only storyboard/workflow to understand its assets.

Record in the change's `reference.md`:

- URL/title and each source's role: visual material, editing, graphic treatment or sound.
- Observed time ranges: shot scale, internal subject motion, camera motion, cutting rhythm,
  compositing, typography, color, music and sound cues that were actually heard.
- What to transfer to this product, what belongs only to the reference's subject, and why.
- Existing usable video/image/audio assets and the specific missing shots; preserve supplied footage
  instead of replacing it with invented stills or starting generation before this inventory.
- Inspection limits: a viewed page, thumbnail, audio-track flag or unmuted player is not evidence
  of watching the full film or hearing its soundtrack. Label unobserved traits as unknown.

Treat source assets as reference unless their use is authorized. Keep observed evidence separate
from a proposed adaptation. If access fails, inspect another accessible reference or ask for the
specific missing source while continuing independent work; leave the dependent direction unresolved.

Completion: a primary moving reference has time-stamped observations, a product adaptation rationale
and an asset inventory. Share the concrete direction in plain language before producing a whole film.

### From reference to producible shots

For reconstruction or changing a reference's subject, read the actual PNG inputs returned by
`next` with the host's image-reading tool. An HTML index, frame path or JSON description does not
provide pixels to a text-only worker. Watch the relevant passage at speed when possible, then
inspect ordered frames around the change. Record exactly what was viewed; audio remains unknown
until heard. The analyzer's 2-second windows and pixel-change peaks are sampling aids, not shots.
Confirm cuts, continuity and uncertain boundaries from the images; resample the local interval
when the action is absent between samples.

Work on one confirmed source shot at a time in the existing `reference.md`. Use a stable shot
label and object names. For each shot, separate these two parts:

| Observed facts, with source times and frame ids | Proposed production, explicitly an adaptation |
| --- | --- |
| Visible objects, screen positions, crop and front/back occlusion | Draw order and independently movable layers; masked or hidden artwork that must be supplied |
| Subject's before / strongest change / after poses, with uncertain in-betweens | Needed poses, expressions or rig controls; usable asset paths and missing drawings |
| Which object moves, camera/viewpoint change, composite effects and cuts | Which property belongs to each subject, camera, mask/effect or edit; intended timing and handoff |
| Visible geometry, glaze/highlights and angle response | Capable rendering mechanism and a short material/action study to verify the uncertain part |

For example, an observed head turn is a changing pose and visible contour. Replacing the character
needs matching views/drawings or an appropriate rig; moving a single portrait across the screen
does not reproduce the turn. A foreground label crossing a face suggests occlusion but does not
prove that the original contains separate transparent layers or reveal the pixels behind it.
Name that missing artwork rather than pretending an MP4 has yielded reusable source layers.

Use `project inspect --project-root . --query "<object or asset name>" --write --output
<new-report-path>` to find source code and asset references, then read the matching files. This
index excludes binary media; also inspect the actual asset directories and files. No code match
does not prove an image, drawing or clip is absent. An unavailable required file is an unresolved
dependency, not permission to invent an asset path. Choose a mechanism only for the
confirmed action: existing `film-choreography/registry.json` for masks, camera, type, assembly or
authored poses; `animation-thinking.md` for key poses and timing/spacing; `film-materials.md` for
solid depth, glaze or view-dependent color. Existing footage that is only being recut uses
`film-edit.md`; its trim/effect renderer cannot replace a character within that footage.

This reference stage ends with source observations and a usable production decomposition, not a
final storyboard. In PLAN, map the chosen shot to existing storyboard fields:
`subject`, `productAction`, `transformation`, `motion`, `choreography` and `carrier`; keep source
times/frame ids, layer order, asset paths and gaps in `note`, with `reference` pointing to these
notes. Do not add unsupported `layers`/`assets` fields to storyboard.v1. Replace the scaffold's
example beats before replication; renaming the example or filling its material route is insufficient.
An adapted beat still needs actual rendered review: structural checks do not validate the adaptation.

When delegating production, give the worker one shot and one uncertain action/material decision,
its real image inputs and asset files, the selected existing mechanism, the allowed source files,
and the clip/frame evidence to return. For uncertain motion, make the short study described in
`animation-thinking.md` before extending the sequence. Keep the final target and the source shot
stable while correcting that decision. This supports frontend/component motion too; those jobs
keep their existing component/task artifacts and do not acquire a film storyboard or soundtrack
merely because their reference is a video.

## 2. Choose the product action and sound direction

Read the actual product surface or documentation. Write one sentence naming what the viewer should
understand and one visible action that proves it: for a node canvas, a prompt connects to an image,
then the image becomes part of a storyboard. Name conceptual/illustrative demonstrations honestly.
Choose the film's visual grammar from that action: continuous transformation, product demonstration,
match-cut montage, footage-led edit, kinetic type, or a deliberate combination.

Style references describe material, contrast, pacing and framing. "Apple-like" does not select a
slideshow template. ASCII can express structure while real imagery expresses the finished work.
Footage-led references call for moving footage and editing, with graphics integrated into the shots.
Continuous object motion alone does not establish the desired film language. Choose templates only
after references, assets, action and grammar are clear; adapt their choreography to the story.
Explicit decks/presentations use the presentation workflow. Preserve the user's delivery format:
an HTML film is still a time-based film, with controls outside the composition.

Plan music and sound effects as part of promotional delivery by default. When no licensed track
is supplied, compose one as code with `references/film-score.md` and use its grid to inspect
intended sync or counterpoint. A cut need not coincide with a beat. Record reuse rights in
the storyboard's `sound.assets` and check delivery with `references/audio-gate.md`. Record `sound.md` with
the intended energy arc, music source/candidate and reuse basis, entry/exit points, audible accents,
voiceover balance when relevant, and intentional silence. Audition music before calling it selected;
record an unheard candidate as pending. Tempo/BPM claims require measurement or reliable metadata.
Prefer available user-owned or appropriately licensed material and note remaining source gaps.

Use silent delivery when the user requests it or the specified placement requires it. Missing
tools/assets are unresolved dependencies, not authorization to redefine a film as a silent preview.
A silent rough pass can establish geometry, but it is only partial evidence for an audiovisual film.
HTML previews need a clear play-with-sound action plus mute/volume controls; autoplay restrictions
must not silently become the creative decision. Bind audio/video offsets, edits and fades to the
composition clock, with playback and seeking kept in sync.

Completion: the brief names the benefit, observable action, reference-backed grammar, duration,
asset truth and sound direction. Distinguish sourced, auditioned and pending music/material.

## 3. Write an audiovisual storyboard

Each beat in the change's storyboard records:

| Time | Product action / source shot | Focal object and before → after state | Camera/edit/composite | Handoff | Music / sound cue |
| --- | --- | --- | --- | --- | --- |
| 0–3s | Show a finished result clip | Moving subject establishes the outcome | Strong opening crop | Match subject shape to a canvas asset | Opening accent, then space |
| 3–7s | Reveal how the result is organized | Playing clip becomes a connected canvas node | Pull back and reveal related source footage | Connection leads to the next result | Musical build, restrained transition accent |

Keep a visual referent across meaningful transitions: object, shape, direction, image, spatial
relationship or matched action. A cut can preserve continuity; a single take can still lack it.
Let important product actions alter the composition. Vary time allocation around anticipation,
action, consequence and a readable payoff. Use typography as part of the choreography or a concise
punctuation. Let musical phrases and audible accents help determine cut points and reveals; avoid
mechanically cutting every beat. The examples above illustrate fields, not a reusable film template.

When a beat uses layered depth or must adapt across aspect ratios, make the composition choices
explicit in its existing camera/edit/composite fields or `note`: identify the main focal subject and
what should support it; assign foreground, midground and background roles only where those layers
exist; state the intended camera move and what it reveals; and plan how important elements will be
repositioned or restacked for each delivery frame. Different layer speeds or contrast can clarify
depth, but avoid giving multiple elements competing focal motion. These are optional prompts, not
fixed rules: a brief may call for several focal points, a static camera, equal layer movement,
cropping, or another deliberate composition. The user's direction and shot evidence decide. Do not
add storyboard fields or make source-specific grid sizes, parallax ratios, camera counts, or aspect
ratios mandatory. For the full optional method, read the bundled
[`shot-composition` playbook](../vendor/iart-motion-skills/upstream/motion-design-skills/skills/shot-composition/SKILL.md),
from [iart-ai/motion-design-skills at `3c129f769d90a1328c209c386492333c9ac62312`](https://github.com/iart-ai/motion-design-skills/blob/3c129f769d90a1328c209c386492333c9ac62312/skills/shot-composition/SKILL.md).

Completion: every beat has an action and handoff; major claims have a visible demonstration;
the sequence includes development and payoff; music/sound cues are planned alongside the picture.

Start a project with `designer-pipeline film scaffold --output <dir>`: it writes a passing example
`storyboard.json`, an `index.html` whose script has one commented call per beat, the choreography
and probe libraries, and reference/sound/qa notes. `designer-pipeline film check --project-root <dir>`
runs every gate the project's files allow, captures `timeline.json` from `index.html` in headless
Chrome (reusing the HyperFrames install), and gives each finding a concrete `fix`.

Record the storyboard as `storyboard.json` (`design-pipeline.film-storyboard.v1`; start from
`references/film-choreography/storyboard.example.json`) and run
`designer-pipeline verify film-storyboard --storyboard storyboard.json` before building scenes.
The gate rejects open timelines, action beats without a named product action or before → after
transformation, surface-only motion (fade/scale/slide of a panel), fade-only slideshow pairs,
and scored films without a declared music entry. Regular rhythm, long/chained holds, sparse
sound accents and a high share of dissolves produce review warnings; they can be intentional choices. Passing
it removes known failure shapes; it is not creative acceptance.

Motion craft rules the gates check:

- One time source per property. Two tweens must not drive the same property of the same element
  at overlapping times (`property-conflict`); hand off, merge into keyframes, or animate a parent.
- Inspect spacing. Linear easing on a travelling element longer than 0.3 s warns
  (`linear-motion`); explicit linear breakdowns or constant travel can be intentional. Judge the
  resulting frame positions, not the ease name. Use `pose-to-pose` for authored keys and holds.
- Declare how the film ends with `endState`: `rest` must finish on its opening frame
  (`rest-drift`), `loop` must not jump from the last frame to the first (`loop-seam-jump`), `free`
  (default) may end anywhere.
- When this arc matches the intended action, set `arc: "anticipate-act-settle"`; the render gate warns when the
  beat starts at full speed (`missing-anticipation`) or ends at full speed or stops dead
  (`missing-settle`).
- Procedurally driven beats are sampled at their start, middle and end for the composition gate.

When the film is assembled from existing footage cut to music (PV, MAD, beat montage), use
`references/film-edit.md` instead of building beats as compositions.

For a real 3D product shot (lighting, materials, depth of field), render it with Blender via
`references/film-blender.md` and host the clip at its beat; its keyframes feed the timeline gate.

Before authoring 3D, WebGL, shader, device-mockup or camera-move beats, search the HyperFrames
catalog: `designer-pipeline film blocks --project-root <dir> --query "<the beat's action>" [--tag 3d]`.
Name the chosen block in the beat's `block` field and install it with the printed command; the
scaffold then hosts it at the beat's time. Procedural blocks drive their motion from a proxy
tween, so `film check` captures the timeline through the HyperFrames preview runtime and judges
those beats from rendered pixel motion instead of tween properties.

Build beats from `references/film-choreography/patterns.js` where a registered pattern fits
(`pose-to-pose`, `draw-on`, `continuous-morph`, `match-cut`, `camera-push`, `kinetic-type`, `ui-demo`,
`assembly`, `reveal-in-context`). Each pattern appends seek-safe GSAP tweens at an absolute time and returns
its handoff time; chain beats by passing that time on. Name the pattern in the beat's
`choreography` field. Author new motion only when no pattern expresses the planned action.

After building the composition, serialize its timeline with
`references/film-choreography/timeline-probe.js` (`FilmTimelineProbe.probe(window.__timelines.main, "main")`)
into `timeline.json` and run `designer-pipeline verify film-timeline --storyboard storyboard.json
--timeline timeline.json`. It checks what the code actually animates: layout tweens, infinite
repeats, action beats with no timed or changed held poses or only opacity/scale, and planned continuation, morph and
camera-carry handoffs that no animated subject carries across the boundary. Ambient targets
animated across most of the film do not count as carrying a handoff.

## Carry and rhythm

Name what survives every planned carried boundary (the storyboard's `carrier`) so a handoff is a
real relationship. A moving camera can connect a continuous take; a motivated hard cut can carry
gesture, silhouette or emotional contrast. Choose based on the passage rather than forcing either.
Judge whether regular pulses, varied shot lengths, a held pose or uninterrupted acceleration serves
the intended read. Rhythm metrics prompt review; they do not prescribe a ratio or rest quota.
Record deliberate choices with timecodes in `qa.md`. The continuity idea is adapted from
`references/reference-skill-onetake.md` (ideas only; its PolyForm Noncommercial source contributes
no code, text or assets here).

## 4. Prove the sound and picture before extending the film

For an uncertain action, start with a 2–4 second pose/timing study (`film scaffold --template
motion-study --output <new-dir>`). Then build a representative passage using the chosen
footage/material and sound direction.
Use rough geometry for supporting graphics if necessary. Play it at intended speed with sound and
compare it directly with the recorded reference traits: subject motion, shot scale, edit rhythm,
graphic integration and audio accents. Inspect intermediate transition frames. Check that attention
follows the subject, the movement has a product reason, and the payoff is readable.

If it reads as a series of complete panels entering and leaving, revise the action storyboard and
passage before adding more scenes. Adding particles, easing, longer dissolves, or a new library
does not establish a missing product action. Keep explicit title/brand holds where they serve pacing.

Completion: record timestamps, reference comparisons, heard sound cues and corrections in `qa.md`;
then extend the demonstrated grammar. If audio cannot be heard or moving source footage is missing,
mark the corresponding proof partial and state the dependency. This is an agent review step, not
a mandatory user approval checkpoint. User rejection reopens direction before full-film production.

## 5. Review technical and creative outcomes separately

**Technical review:** follow the selected runtime's checks for timeline duration, deterministic
seeking, assets, layout, playback, sound activation, audio/video synchronization, accessibility and
console errors. Report checks not performed.

After render, run `designer-pipeline verify film-render --storyboard storyboard.json --video out.mp4
--output qa/film-evidence`. It measures duration against the storyboard, detects scene cuts and
compares them with planned `hard-cut`/`match-cut` handoffs, measures how many cuts land on audio
onsets, and writes one midpoint frame per beat plus `contact-sheet.png`. Review the contact sheet
beside the storyboard in the creative review; a model that cannot watch video still sees each
beat's actual frame. These are objective signals only and do not replace watching the film.

**Creative review:** watch the complete film uninterrupted at intended speed, then inspect the
handoffs. In `qa.md`, record timestamps and observations for:

- Product comprehension: what the viewer sees the product do, with claims tied to real capability.
- Continuity: how attention moves between actions; identify any unexplained visual reset.
- Rhythm: where the film anticipates, accelerates and holds; whether the payoff can be read.
- Transformation: what actually changes in the visual subject beyond section opacity and scale.
- Identity: why the material, imagery and signature motion belong to this product.
- Reference fit: which observed traits survived adaptation and which were intentionally changed.
- Sound: music development, effect accents, mix balance and audible synchronization with the edit.

Name repeated entrance–hold–exit patterns or decorative camera moves as revision findings when
they replace the planned actions. A still image with a zoom is illustrative imagery, not evidence
of video-generation capability. Missing audio leaves audiovisual acceptance incomplete; successful
visual review does not erase that limitation.

Completion: each planned action/handoff is observed or explicitly unresolved; technical results
and creative judgment are reported separately, with user acceptance as its own state. Static
screenshots and successful tests cannot establish creative acceptance. This reference guides agent
judgment; it is not an automated aesthetic score or a guarantee of user approval.

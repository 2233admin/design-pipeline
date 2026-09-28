# Product-film direction

This is project-owned creative policy. Apply it to product promotional films and animations,
including ordinary requests such as "做一个宣传动画" and HTML previews. Read it before storyboard,
template, or runtime selection. The user supplies the product and purpose; the agent supplies
film direction. Ask only for missing product facts, audience, claims, assets, or delivery constraints
that materially affect the work. Infer duration from context and visual grammar from inspected
moving references and available material, rather than from a familiar implementation pattern.

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

Plan music and sound effects as part of promotional delivery by default. Record reuse rights in
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
transformation, surface-only motion (fade/scale/slide of a panel), reset/dissolve slideshow
handoffs, dominant or chained holds, and scored films whose sound is not bound to beats. Passing
it removes known failure shapes; it is not creative acceptance.

Before authoring 3D, WebGL, shader, device-mockup or camera-move beats, search the HyperFrames
catalog: `designer-pipeline film blocks --project-root <dir> --query "<the beat's action>" [--tag 3d]`.
Name the chosen block in the beat's `block` field and install it with the printed command; the
scaffold then hosts it at the beat's time. Procedural blocks drive their motion from a proxy
tween, so `film check` captures the timeline through the HyperFrames preview runtime and judges
those beats from rendered pixel motion instead of tween properties.

Build beats from `references/film-choreography/patterns.js` where a registered pattern fits
(`continuous-morph`, `match-cut`, `camera-push`, `kinetic-type`, `ui-demo`, `assembly`,
`reveal-in-context`). Each pattern appends seek-safe GSAP tweens at an absolute time and returns
its handoff time; chain beats by passing that time on. Name the pattern in the beat's
`choreography` field. Author new motion only when no pattern expresses the planned action.

After building the composition, serialize its timeline with
`references/film-choreography/timeline-probe.js` (`FilmTimelineProbe.probe(window.__timelines.main, "main")`)
into `timeline.json` and run `designer-pipeline verify film-timeline --storyboard storyboard.json
--timeline timeline.json`. It checks what the code actually animates: layout tweens, infinite
repeats, action beats with no tween or only opacity/scale, and planned continuation, morph and
camera-carry handoffs that no animated subject carries across the boundary. Ambient targets
animated across most of the film do not count as carrying a handoff.

## 4. Prove the sound and picture before extending the film

Build a representative 6–10 second passage using the chosen footage/material and sound direction.
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

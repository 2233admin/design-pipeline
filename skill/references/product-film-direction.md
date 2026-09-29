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

Plan music and sound effects as part of promotional delivery by default. When no licensed track
is supplied, compose one as code with `references/film-score.md` and time cuts to its grid. Record reuse rights in
the storyboard's `sound.assets` and check delivery with `references/audio-gate.md`. Record `sound.md` as a
song map (one row per beat: beat id, window in seconds, bars, section, music event, motion response)
plus the intended energy arc, music source/candidate and reuse basis, entry/exit points, voiceover balance when
relevant, and intentional silence. Audition music before calling it selected;
record an unheard candidate as pending. Tempo/BPM claims require measurement or reliable metadata.
Prefer available user-owned or appropriately licensed material and note remaining source gaps.

Answer each music event with one motion response, and bind its cue id in the beat's `soundCues`:

| Music event | Motion response |
| --- | --- |
| Downbeat, impact, drop | Hard cut or match-cut on the hit, plus a `flash` or `zoom-punch` on the same frame |
| Riser, build | Shorten the beats under it and accelerate the motion; land the cut on the release |
| Break, silence | Hold: freeze the last frame or set `holdSec`; let the picture stop with the sound |
| Accent, hat-like tick | A one-frame nudge or pulse of the focal subject, no cut |

The storyboard gate warns on a declared hit cue no beat binds (`cue-unbound`) and on a bound cue
outside its storyboard beat's scene window (`cue-outside-beat`; "beat" here is the storyboard
scene, not the music's beat grid). Whether a cue lands early, late or exactly on the BPM grid is a
visual-acceptance judgement (anticipation, lag and syncopation are legitimate), recorded in
`qa.md`; tight grid alignment is an optional policy in `references/film-score.md`.

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

Motion craft rules the gates check:

- One time source per property. Two tweens must not drive the same property of the same element
  at overlapping times (`property-conflict`); hand off, merge into keyframes, or animate a parent.
- Moving elements ease. Linear easing on a travelling element longer than 0.3 s warns
  (`linear-motion`); keep linear for constant mechanical motion only.
- Declare how the film ends with `endState`: `rest` must finish on its opening frame
  (`rest-drift`), `loop` must not jump from the last frame to the first (`loop-seam-jump`), `free`
  (default) may end anywhere.
- Mark character-like actions with `arc: "anticipate-act-settle"`; the render gate warns when the
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
(`continuous-morph`, `match-cut`, `camera-push`, `kinetic-type`, `ui-demo`, `assembly`,
`reveal-in-context`). Each pattern appends seek-safe GSAP tweens at an absolute time and returns
its handoff time; chain beats by passing that time on. Name the pattern in the beat's
`choreography` field. Author new motion only when no pattern expresses the planned action.
For a film whose picture answers the music, six audio-bound instruments (`audio-meter`,
`event-scope`, `tick-ticker`, `grid-pulse`, `build-countdown`, `hold-then-hit`) are registered the
same way; see Music-driven films below and the kit contract in `references/hyperframes.md`.

After building the composition, serialize its timeline with
`references/film-choreography/timeline-probe.js` (`FilmTimelineProbe.probe(window.__timelines.main, "main")`)
into `timeline.json` and run `designer-pipeline verify film-timeline --storyboard storyboard.json
--timeline timeline.json`. It checks what the code actually animates: layout tweens, infinite
repeats, action beats with no tween or only opacity/scale, and planned continuation, morph and
camera-carry handoffs that no animated subject carries across the boundary. Ambient targets
animated across most of the film do not count as carrying a handoff.

## Carry and rhythm

Scenes that fully replace each other read as a slideshow even when the timing is polished; the
film has no reason to feel like one piece rather than three unrelated ones. Name what survives
every carried boundary (the storyboard's `carrier`) so a handoff is a real transformation, not a
claimed one. One camera that keeps moving through the piece, instead of resetting to a new static
setup at each beat, is what ties separate actions into a single continuous take. Vary beat lengths
a lot rather than cutting on a metronome, and hold at least one beat still (`holdSec`) in longer
films so the eye has somewhere to land — without a rest, every move reads at the same weight and
none of them lands. This idea is adapted, in our own words, from the reference skill recorded at
`references/reference-skill-onetake.md` (ideas only; its PolyForm Noncommercial source contributes
no code, text or assets here).

## Music-driven films

Use this section when the score has events (a Strudel grid from `references/film-score.md`) and the
concept is that the picture answers the music. It adds no artifact: the treatment lives in
`concepts.md`, the song map in `sound.md`, each plate is a storyboard beat. A worked example is
`evals/film/music-driven/treatment.md`. The reference video's craft (its own treatment, one
instrument per section, builds that accelerate, a hard drop, a break that stops) is adopted as
ideas only; none of its palette, panels, type or NERV imagery is copied.

**Treatment**, as `## Treatment` under the chosen card of `concepts.md`:

```markdown
## Treatment
- Premise: one sentence, the concept as an instrument ("the canvas is an instrument").
- Instrument arc:
  | Plate | Instrument (kit id) | Product or concept object it is | Audio role that drives it |
- Style-bible seed: the slots below.
- Motion language: voice to response, from film-score.md, one verb per element.
- Escalation and negative space: what rises through the build, what stops in the break.
```

A concept card for a music-led film already states its instrument premise; the treatment expands
the picked card and does not restart it.

**Song map**: the `sound.md` table gains a `Section` column (intro, groove, build, drop, break or
outro). Its header states BPM, bar length and the start of bar 1, so a window is
`(bar − 1) × bar length`; tempo claims still need measurement or reliable metadata.

**Style-bible seed** is the chrome's custom-property slots, plus any extra colour the film names.
Fill every slot, or say it keeps the neutral default:

| Slot | Fill in |
| --- | --- |
| `--fk-ink`, `--fk-line`, `--fk-text`, `--fk-rest`, `--fk-accent`, `--fk-alert` | six literal colours; the defaults are greys, so a film that keeps them is monochrome by choice |
| `--fk-font-label`, `--fk-font-data`, `--fk-font-display` | three type voices (generic families unless the film ships its fonts) |
| `--fk-unit`, `--fk-stroke`, `--fk-radius` | scale, hairline weight, corner |
| Ground per section | one ground colour for each section, so a hard cut reads as a scene change (R7) |
| Extra colours | any further colour the film names, with its role |
| Must not copy | one line from `reference.md`: what belongs only to the reference and stays out |

These become the film's single `STYLE` table (`references/hyperframes.md`). The chrome is a floor:
it makes plates read as one interface and is meant to be overridden, so compose the dominant
instrument at scale (R1) and give the film a look of its own.

**Plate brief**, one per plate, self-contained so plates can be built independently. Each key
lands in an existing storyboard field, and the brief never restates a number the storyboard
owns; it names the beat id.

| Brief key | Storyboard field |
| --- | --- |
| Instrument (the dominant element) | `subject` |
| What it does to the sound, one verb per element | `productAction` |
| State at start and end | `transformation` (`data-update`, `state-change` or `morph`) with `from` and `to` |
| Kit ids used | `motion` |
| Primary kit id | `choreography` |
| Hits it answers | `soundCues` |
| Freeze before the drop | `holdSec` |
| Escalation, negative-space or cut-accent line | `note` |

An element without a verb is not designed: every element has one verb bound to one audio role.
The storyboard schema, its finding codes and every receipt are unchanged, so a beat written this way
validates as it stands. Plate lengths still have to clear `uniform-cadence` (four or more beats,
longest at least 3x the shortest); a faithful copy of a reference with near-equal plates fails it,
so vary the plates around the song map.

**Instruments are product objects, not decoration.** For each instrument the treatment names the
product or concept object it is and the audio role that drives it (for example a meter is the
queue load and answers the kick; a ticker is the job log and answers the hats). An instrument with
neither is decoration. The chrome's frame header label is where the plate says what the object is.
A spectrum or waveform is legitimate only when the product is an audio or analysis tool. The
kit reads events, not envelopes, so it cannot draw a true waveform. A plate whose meter answers the
kick but represents nothing the product or concept has is a revision finding in the creative
review; so is an instrument that swamps the product's message.

### Review rules R1 to R7

These are Visual Acceptance guidance. They add no finding code, change no gate status, leave
`creativeAcceptance: "not-assessed"` and do not enter any `film-eval` score; report them only in
the creative review of `qa.md`, with the field each one read. Thresholds are review heuristics.
The figures come from one local calibration render (a throwaway layout, click-track audio) and are
a starting point, not a threshold. R7 is the exception in kind: when it is broken the render gate
already reports `planned-cuts-missing`, which is a Conformance finding, and it keeps its meaning
and severity.

| Rule | Read | Looks right |
| --- | --- | --- |
| R1 One dominant instrument per plate, at most three supporting layers, each bound to a different audio role | the beat's `motion` list; the contact-sheet frame | one element is clearly the largest and brightest, about a third of the frame or more; layers answer different sounds. The calibration render failed the size test: small frames on a large empty ground |
| R2 Builds accelerate through rate, size or colour | beat lengths under the `riser` cue; the instrument's hit rate | the build is shorter than the groove and its rate rises; at least two of the three channels change |
| R3 The last beat before a drop holds still | `holdSec` on the preceding beat; the span itself (`stillShare` is film-wide, a sanity check only) | `holdSec` of at least 0.3 s, and the frame is still for that span |
| R4 A drop is a hard cut with impact | handoff kind; `plannedCutsSec`; `cuts.missedSec`; `audio.cutsOnOnset` | `hard-cut` on the drop cue's downbeat, the cut is detected, the full impact (flash, zoom, shake) lands with it |
| R5 A break stops pumping without freezing | per-beat `changedShare` of the break against the groove and drop, from a render without cut accents | clearly lower than both, and above the frozen floor of 0.02%. Calibration: 2.4% against 5.4% and 5.2% |
| R6 Sections differ in density | per-beat `changedShare` grouped by section, and the contact sheet | the drop above the break. Calibration: 5.2% against 2.4%, groove 5.4%, build 2.1%, intro 1.5%; "several times" was not observed, so judge with the contact sheet |
| R7 Every planned hard cut is visible to the scene detector | `cuts.missedSec`; the contact sheet | each section has its own ground, or the cut carries a flash accent (`hold-then-hit` with `zoom: 1` and `shakeFrames: 0`). Calibration: 4 of 5 cuts missed on similar dark plates, none missed with accents |

Motion sampling in the render gate is 10 fps at 160 by 90, so R5 and R6 read beat means, not single
hits. Per-beat `changedShare` is dominated by cut accents when they are on (10.0% against 5.4% for
the same groove), so read R5 and R6 from an accent-free render or from the contact sheet. A
negative-space plate is not automatically flagged by `render-static-beat`; the break moved 2.4% of
pixels per step against the 0.02% floor. Audio legibility, whether a viewer can name which sound
drives which motion within three seconds, is judged by watching with sound.

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
- Music-driven film only: rules R1 to R7 (Music-driven films above), each with the field it read,
  and any instrument that is not a product or concept object.

Name repeated entrance–hold–exit patterns or decorative camera moves as revision findings when
they replace the planned actions. A still image with a zoom is illustrative imagery, not evidence
of video-generation capability. Missing audio leaves audiovisual acceptance incomplete; successful
visual review does not erase that limitation.

Completion: each planned action/handoff is observed or explicitly unresolved; technical results
and creative judgment are reported separately, with user acceptance as its own state. Static
screenshots and successful tests cannot establish creative acceptance. This reference guides agent
judgment; it is not an automated aesthetic score or a guarantee of user approval.

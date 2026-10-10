# Animation thinking

Use this guide for authored animation, PV/MAD edits, product films, and explanation videos. It
helps decide what motion should communicate and diagnose what is unclear; it is not a style recipe
or a new gate. The professional user's explicit direction governs. Do not require narration,
diagrams, or a fixed genre.

For an explicit film or loop, [built-in film methods](film-methods.md) adds Cinetic's complete
concept/technique sources and pure easing/spring/timing adapter. Choose a technique for this
action and convert its source frames to the chosen fps; random draws and 60fps are not required.
Ordinary component motion may borrow a primitive within its existing clock and task artifacts.

## Direct the change

Before choosing an effect, state the viewer's intended read: what should they notice, feel, or
understand at this moment? Name the subject, its initial state, the meaningful change, and the
result the viewer should register. If the beat is a pause or image, say what that stillness lets the
viewer read. Use the existing storyboard fields: `subject`, `productAction`, `transformation`,
`carrier`, `note`, and `soundCues`; `benefit` and `proofAction` keep product films tied to their
purpose. `arc` is a strict enum with only `anticipate-act-settle`; set it only when that diagnostic
applies. Put pose descriptions and timing observations in `note` or `reference.md`.

- If the action is hard to describe without adjectives like “cool” or “dynamic,” clarify its cause
  and consequence before animating.
- Give the viewer a readable pose or composition before competing movement begins. Separate
  overlapping actions when their order matters; overlap them when simultaneity is the point.
- Stage the subject so its action reads at delivery size. Check silhouette, facing, negative space,
  contrast, and where the movement directs attention. A technically clear motion can still be
  hidden by a tangent, crop, busy background, or weak contrast.
- Choose a few meaningful poses: the setup, the strongest action or change, and the result. Add
  breakdown poses where they clarify the path, weight, turn, deformation, or handoff. They need not
  be evenly spaced or equally dramatic.
- Ask what leads and what follows. Head, torso, limbs, clothing, objects, particles, and sound may
  begin or settle at different times when that difference reveals force, intent, or material.

The storyboard is direction, not an exhaustive pose sheet. Put pose descriptions or timing
observations in its existing `note` field or in `reference.md` when they help the work; do not add a
mandatory animation schema.

## Diagnose motion

**Timing** is how long an action or pose takes. **Spacing** is how far the subject travels between
successive frames. Diagnose perceived weight from the whole action: spacing, contact, deformation,
and the response of the subject or surrounding objects. Do not infer weight from speed alone. When
motion feels wrong, inspect timing and spacing alongside those visual consequences before changing
the subject design or adding effects.

Watch first at intended speed. Mark the moment the action becomes legible, the moment of greatest
change, and the moment the result can be read. Then step through nearby frames. Look for a pose that
arrives too early or late, spacing that jumps or stalls, an unclear path, a softened impact, or a
settle that obscures the result. Change the smallest relevant interval and watch again.

- **No intent / weak anticipation:** the viewer cannot predict or understand the action. Clarify
  the preparation, gaze, weight shift, direction, or initiating force. Omit or compress preparation
  when surprise, speed, restraint, or an immediate cut is the intended effect.
- **Weightless or mechanical travel:** check contact, acceleration, deceleration, path, and scale
  of displacement. Arcs often make organic movement easier to follow; straight paths suit deliberate
  mechanics. Neither is universal. Let spacing change express mass or force instead of adding bounce
  by habit.
- **Impact does not land:** inspect the approach, the strongest contact/change pose, and the first
  readable aftermath together. A pause, overshoot, smear, recoil, sound accent, or cut can clarify
  force. Use only what supports this action; impact need not always bounce or hit the beat.
- **The result feels unfinished:** check whether secondary parts continue after the main action,
  and whether they settle before the next important read. Follow-through can also be absent or
  sharply stopped when the material, cut, or emotional intent calls for it.
- **Motion feels monotonous:** inspect changes in pose, direction, scale, spacing, duration, and
  emphasis across the passage. Repetition can be a deliberate pulse or motif; alter it only when it
  flattens the intended development.

Anticipation, accents, arcs, overlap, and follow-through are diagnostic choices, not mandatory
ingredients. A hold is an authored pose with a reason: let an expression, claim, image, or consequence
register; create contrast; or make the following action stronger. A long hold or limited animation
can carry performance when the drawing, composition, sound, or edit continues to do useful work.
Smoothness alone is not evidence of clarity or quality. Held drawings and layers are established
animation production tools; they do not prescribe one visual style.

## Choose where motion lives

Decide whether the change belongs to the subject, the camera, the composite, the edit, or their
interaction. Move the subject to show its action; move the camera to change viewpoint, scale, or
attention; cut when the next image or time has a clear reason to replace this one. A camera move
cannot substitute for a subject transformation the viewer needs to see. Conversely, a cut can carry
an action cleanly when matched direction, shape, pose, or sound links the shots.

For a motif or transformation, identify what recurs and what develops: shape, gesture, direction,
color, rhythm, object, or relationship. Keep enough of the motif recognizable for the change to
matter. Music and effects may reinforce, anticipate, interrupt, or counterpoint the image. Record
the intended relationship in existing beat notes or `soundCues`; synchronize only when the accent
benefits from landing together.

Draw-on is one possible reveal when the act of drawing matters. Other reveals may use a cut, mask,
occlusion, lighting change, assembly, camera discovery, or transformation. Choose by the subject and
the viewer's needed read, not by the availability of a drawing effect.

For transform studies, `pose-to-pose` in `film-choreography/patterns.js` takes `{ subject, at,
keys }`. Each key has relative `at` and the same set of finite numeric transform/opacity channels
in `pose`; times start at zero and strictly increase. An incoming `hold: true` keeps the preceding
pose until that key, then switches. Otherwise the incoming `ease` controls that interval. Put a
static SVG placement on a parent group so absolute `x`/`y` keys do not erase it. Separate targets
can use different start times for overlapping action. Drawing changes, facial expressions and
articulated acting still need their actual artwork or rig; transform keys do not supply those assets.
`draw-on` takes ordered native SVG geometry in `paths`, absolute `at`, total `duration` and optional
pen-lift `gap`; it distributes drawing time by path length and retains completed strokes.

## Study a reference and test a decision

Use an accessible moving reference, including a user-provided one. Select a short passage that
contains the motion or edit decision you need to understand. Record in `reference.md` its URL/title,
observed time range, visible subject and shot scale, pose/action changes, spacing or hold, camera/edit
behavior, and any sound actually heard. Separate observation from the proposed adaptation: name
what transfers, what is specific to the source, and why. Mark inaccessible or unheard details unknown;
do not infer them from a still or description.

For a new motion decision, make a small 2–4 second study of the relevant action. Compare a small
number of meaningful timing or spacing alternatives only when the choice is uncertain. Keep the
subject and intended read stable so the comparison answers one question. If the direction is already
clear, make that version directly. Review each at intended speed, then frame by frame around the
key change; also seek or scrub through the study if it will run in an interactive timeline.

In `qa.md`, record concise evidence as timecode or frame, observation, and the resulting intentional
choice or correction. Note whether the action reads, where it changes, and what the viewer can read
afterward. Include sound observations only when heard. This is evidence for a decision, not a score,
new checklist, or claim that a short study proves whole-film quality.

## Direct delegated work

The lead defines the direction, target poses or states, constraints, and reference evidence. A cheap
worker can execute a bounded shot or study and return the actual clip plus its relevant source and
timing notes. The lead reviews the rendered result against the direction; a worker's self-report is
not visual evidence. Accept or revise the shot against the stated intent, and continue ordinary
small review loops without asking the user to approve each trivial iteration. Return to the user when
the direction itself is unresolved or a material choice exceeds the delegated constraints.

The sources below support specific craft and production observations; they are not a substitute for
watching the chosen reference or judging the resulting animation:

- Richard Williams' authorized publisher and masterclass pages list topics including timing and
  spacing, working methods, takes, anticipation and accents, dialogue, and performance/directing,
  and describe principles that apply across techniques: [publisher overview](https://www.bloomsbury.com/us/discover/bloomsbury-digital-resources/products/bloomsbury-video-library/the-animators-survival-kit-animated/),
  [masterclass catalog](https://www.bloomsburyvideolibrary.com/custom-browse?docid=TheAnimatorsSurvivalKitAnimated).
- Toei's public production overview describes storyboard, keyframe, and in-between production
  stages; a director interview discusses communicating intent through boards, timing notes, and
  camera/filter work: [production overview](https://corp.toei-anim.co.jp/en/company/animation_production.html),
  [director interview](https://www.toei-anim.co.jp/tv/majinbone/special_talk.html).
- Blender's Grease Pencil documentation describes held drawings and layers as production features:
  [Grease Pencil architecture](https://developer.blender.org/docs/features/grease_pencil/architecture/).
- The project's [Art Motion methods](art-motion.md) are optional inspiration for short studies,
  deterministic seeking, and review of visible motion.

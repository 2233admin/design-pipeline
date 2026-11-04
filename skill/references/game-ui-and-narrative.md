# Game UI And Narrative Profile

Use this profile for HUDs, game menus, dialogue systems, visual novels, Galgame interfaces, and
hybrid web/game products. It is runtime-independent and may bind to Phaser, PixiJS, Three.js,
Babylon.js, PlayCanvas, Monogatari, or an existing engine. For reviewing world-branded UI and key
art (material, depth, decorative type, focus, transition logic, input feedback), use the advisory
[review lens](#world-branded-ui-and-key-art-review-lens) at the end.

## Product Profiles

### HUD And In-Game UI

Cover health/status, objectives, inventory, maps, prompts, cooldowns, notifications, targeting,
pause, settings, and failure/recovery states. Prioritize glanceability, safe areas, input modality,
and non-interference with the play field.

For 血条拖尾 / hp ghost bar, 冷却完成 / cooldown completion, 奖励到账 / reward arrival and
菜单切换 / menu switch, use the [motion recipe index](motion-recipes/README.md) and matched offline
specimen. Apply the existing opportunity screen and UI transition rules, project motion tokens
and authoritative game state; decorative completion must not decide HP, availability or rewards.

### Menus And Meta UI

Cover title, profile, save/load, settings, controls, accessibility, inventory, progression,
commerce when authorized, confirmation, error, offline, and recovery flows. Prefer semantic DOM for
text-heavy or form-heavy surfaces.

### Narrative And Galgame UI

At minimum define:

- dialogue box, speaker identity, nameplate, portrait/character state, and text progression;
- choices, disabled/conditional choices, timeout policy, confirmation, and rollback behavior;
- backlog/history, skip, auto-play, text speed, voice replay, hide UI, and read/unread state;
- save/load slots, quick save/load, auto save, thumbnail/state metadata, compatibility, and failure;
- background, CG, character layers, expression/pose transitions, effects, and camera framing;
- BGM, ambience, voice, sound effects, volume channels, audio unlock, captions, and mute behavior;
- localization, font fallback, line breaking, ruby/furigana when needed, and text expansion;
- keyboard, pointer/touch, gamepad, screen reader, and rebindable action mapping;
- content warnings, skip/stop controls, and non-motion equivalents for flashing or vestibular effects.

## State Model

Dialogue and UI state must be data, not timing accidents. Record stable IDs for scene, line, speaker,
choice, asset state, audio state, flags, and save schema. Animation completion may gate presentation,
but it must not become the only source of narrative truth.

Define interruption for rapid advance, skip, auto-play, backlog open, pause, save/load, route exit,
asset failure, and language change. Repeated input must not duplicate lines, choices, sounds, saves,
or state transitions.

## Layer Contract

Recommended semantic layers:

1. background/environment;
2. character/subject layers;
3. CG/cut-in and scene effects;
4. world/game feedback;
5. dialogue/HUD;
6. modal menu, backlog, save/load, settings, and accessibility overlay.

`design.md` owns visual treatment. `motion.md` owns transitions and temporal behavior. `scene.md`
owns layer/camera/state/runtime binding.

## Accessibility And Comfort

- All essential dialogue and choices must be available as text and keyboard-operable controls.
- Typewriter effects need instant-complete and reduced-motion behavior.
- Auto-play and timed choices need pause/disable controls and sufficient time.
- Flashing, shake, parallax, blur, camera movement, and continuous effects require reduced-effects
  substitutes.
- Voice-only information requires captions or text equivalents.
- Color-coded status requires shape, icon, label, or pattern reinforcement.
- Text scale, contrast, line length, safe areas, and localization expansion must be verified.

## Evidence And QA

Use deterministic scripts or state fixtures to capture every dialogue, choice, interruption,
save/load, language, input-modality, reduced-motion, and failure state. Verify both the rendered
scene and semantic DOM/accessibility surface. A beautiful screenshot does not prove narrative-state
correctness.

## World-Branded UI And Key Art Review Lens

Use this lens when reviewing a game interface, a product UI that carries a fictional world or
strong brand world, or a key visual (KV, chapter card, title art). It is **advisory**: no lens
blocks a stage, adds a gate or decides taste. The owner decides; a lens only names what to look
at and, where a tool already measures part of it, which check to run. Findings go in the review
notes (`qa.md` or the critique), never as a pass/fail on their own.

Source: AJ (Tencent Interactive Entertainment publishing), "藏在「好看」背后的先进性" —
an Arknights UI/UX analysis on Tencent Game Institute,
<https://gameinstitute.qq.com/article/10027> (read 2026-11-04; the page carries no date, its
images are from 2019-07). The lenses below are our own restatement of its observations; the
examples are the article's, the checks are ours.

Each lens should earn its place: they are candidate layers for the design-skill ablation eval
(#260). A lens that does not change review findings or owner choices in that eval is cut or
rewritten, not kept by default.

### L1 Diegetic or non-diegetic

Decide, per piece of information, whether it lives inside the world (a device, a panel, a scope
readout a character could see) or outside it for the player only (a HUD layer).

- Look for: one stated reason for each placement; world devices that explain why the UI exists
  (a remote-access holographic board explains a floating menu); usability kept where the screen is
  small or the system is dense.
- Good sign: the world device carries the frame and the motion (gyro or pointer drift on a
  projected panel), while dense stats stay in a plain readable layer.
- Bad sign: diegetic decoration on every element so that glanceable values become hard to read;
  or a world-heavy brand whose UI is a generic flat overlay with no relation to it.
- Check: none measures this; review by eye. Readability of the resulting values still goes
  through `verify composition --profile ui` (`text-contrast`, `text-off-canvas`).

### L2 Material

Build a material in three steps: pick the most representative real material of the world and
extract its texture; simplify it until fine detail no longer competes with content; then let light
and interaction emphasise it (a highlight that follows tilt or pointer, a glow on the reward).
Frosted or acrylic blur is the clearest case: the layer underneath stays visible as soft colour,
sharp text sits on top, and the reader keeps their place.

- Look for: one material family per world; blur used where a layer opens over another; light
  that answers an input or marks a priority, not light everywhere.
- Good sign: a secondary panel over a blurred copy of the page it came from; static highlight
  textures where real-time light would cost too much.
- Bad sign: raw photographic texture behind text; blur as a uniform fog with no layer meaning; a
  material that belongs to another world (glossy glass in a rusted industrial setting).
- Check: `composition capture` then `verify composition --profile ui` for `text-contrast`. Limit:
  the per-text contrast check skips text whose background is an image or gradient and takes the
  first opaque ancestor colour for a translucent panel, so it does not see what the blur shows
  through. Capture the panel over the busiest underlying state and judge that frame by eye.

### L3 Depth in flat UI

Flat style removes non-interactive detail; taken literally it removes the cues that say what is
in front. Restore depth with a small set of levels: card, shadow and corner radius growing with
importance; a vignette or framed "photo" hotspot that pulls the eye to the centre; parallax by
scale (larger, nearer subjects move more).

- Look for: a declared elevation scale (two to four levels) used consistently; one hotspot per
  screen; parallax that follows size order.
- Good sign: the most important card is also the most raised; a chapter card reads like a print
  with a border and inner shade.
- Bad sign: every card on the same shadow; shadows that contradict the light direction of the art;
  parallax where small background items move faster than the foreground.
- Check: `verify composition` warnings `flat-hierarchy`, `weak-separation` and `no-focal-point`
  are review prompts for this lens. Parallax order needs a capture at two scroll or tilt positions
  (`verify interaction` probe, or two `composition capture --seek` frames for a film).

### L4 Decorative typography coherence

Type is part of the world. Pick the face by the era and region the world belongs to, not by the
"serif is classic, sans is modern" shortcut; serif families span old-style to modern, and a
sharp modern serif or a heavy rounded face can break a classical, knightly key visual. Mixed
scripts (Latin, Cyrillic, CJK) work as ornament when they are set as one system.

- Look for: each region or faction of the world mapped to a type voice; ornament scripts set
  smaller and lighter than the readable line; for CJK beside Latin, tracking and weight paired so
  neither line looks louder by accident (a tight-tracked old-style Latin over a lighter CJK line).
- Good sign: the KV's Latin face shares the costume's era; secondary scripts sit as a quiet
  band, not a second headline.
- Bad sign: a modern display serif or a round heavy sans on a classical scene; decorative foreign
  text that takes more space than the title; copy in the ornament script that says nothing.
- Check: `verify composition` `type-scale-sprawl` and `flat-hierarchy` (review prompts);
  `text-too-small` on a film frame. Era fit is review only. CJK rules: `cjk-typography.md`.

### L5 Focus control and world grounds

Steer the eye with light and depth of field: a bright centre with light spilling from it,
out-of-focus foreground objects framing the subject, overlapping layers with transparency and soft
shadow. Ground textures carry the world: halftone dots on cards and buttons, film noise,
hazard-stripe bands for an industrial setting, local pixelation or glitch where the fiction
implies corrupted memory.

- Look for: one subject in focus per frame; ground textures repeated with the same scale and
  meaning across screens.
- Good sign: the foreground blur frames and never covers the subject or text; halftone density
  drops behind text.
- Bad sign: texture density behind body text; three competing light sources; glitch used as a
  generic "tech" effect with no story reason.
- Check: `verify composition` `no-focal-point`, `clutter` and `palette-sprawl` (review prompts);
  `low-contrast` for the frame. Text over a texture is the L2 contrast limit again: view the frame.

### L6 Transition logic

The kind of transition says how two places are related.

- Unrelated systems: a short dark fade (a cut through black), so the player knows they changed
  place.
- Related levels of one system: zoom in and out, so the player knows they went deeper or back.
- Secondary systems (mail, settings, notices, check-in): an overlay with a frosted mask over the
  current page, so context is kept.
- Edits inside one object (level up, promote, skills, outfits): stay on the same canvas and
  displace locally (slide, shift the character, expand values to one side, a frosted pop-up)
  instead of jumping to a new page.
- Items: a deep link from any item to where it comes from (its source stage and drop rate), so a
  complex material tree can be used before it is understood.

- Good sign: the same relationship always uses the same transition; a global menu reaches every
  system from anywhere.
- Bad sign: one fade for everything; a full page jump to change one value; an item that names a
  source but cannot open it.
- Check: in the UI, `verify interaction` with a probe per transition (`opacity-only` flags a fade
  where a displacement was declared; `dead-interaction` a link that does nothing) and the
  [UI transition rules](ui-transition-rules.md) TR-01 to TR-03. In a film, the storyboard
  `handoff` value records the chosen relation and `verify film-render` reports where cuts actually
  land.

### L7 Feedback that answers input

Ambient particles (dust, smoke, snow, light shifts) make a screen alive; letting them answer
input makes it physical: dust pushed by a dragged card, resistance at an edge. Tapping is not the
only gesture: drag to reorder a team, swipe to accept or discard with a scale response, a dial or
slider instead of max/plus/minus/min steppers, haptics, multi-finger and edge gestures.

- Look for: input-coupled effects where the input already exists; a gesture only where it is
  faster or clearer than the tap it replaces, with a tap or keyboard equivalent kept.
- Good sign: particles move away from the dragged object and settle; a quantity dial with
  detents at the values that matter.
- Bad sign: particles that ignore the pointer next to UI that reacts; a gesture with no visible
  affordance or no non-gesture path; effects with no reduced-motion substitute.
- Check: `verify interaction` probes the DOM target box and transform, so `dead-interaction`,
  `no-settle` and `rest-drift` apply to DOM elements; particles drawn on a canvas are not measured
  and need a recorded clip reviewed by eye. Reduced-motion substitutes follow the Accessibility
  And Comfort section above.

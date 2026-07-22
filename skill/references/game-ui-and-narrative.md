# Game UI And Narrative Profile

Use this profile for HUDs, game menus, dialogue systems, visual novels, Galgame interfaces, and
hybrid web/game products. It is runtime-independent and may bind to Phaser, PixiJS, Three.js,
Babylon.js, PlayCanvas, Monogatari, or an existing engine.

## Product Profiles

### HUD And In-Game UI

Cover health/status, objectives, inventory, maps, prompts, cooldowns, notifications, targeting,
pause, settings, and failure/recovery states. Prioritize glanceability, safe areas, input modality,
and non-interference with the play field.

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

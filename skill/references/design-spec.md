# Change Design Contract

Lowercase change `design.md` owns the selected visual language and screen-space interface. It does
not define a 3D world's camera, geometry, coordinates, lights, world-space UI, or spatial
navigation.

## Owns

- screen-space layout, responsive rules, safe areas, and DOM/component hierarchy;
- color, typography, graphic motifs, iconography, borders, transparency, and compositing posture;
- component states, content hierarchy, accessibility semantics, focus order, and keyboard behavior;
- screen-space HUD, captions, menus, toolbars, status layers, and fallback presentation;
- asset treatment and visual fidelity invariants derived from `reference.md`.

## Does Not Own

- projection, camera rig, clipping planes, camera constraints, orbit/pan/dolly behavior;
- world units, axes, transforms, pivots, depth bands, occlusion, or scene graph;
- meshes, volumetric containers, materials as physical/shader surfaces, lighting, fog, or post FX;
- world-space labels, hit testing, ray casting, spatial selection, or engine lifecycle.

Those decisions belong in `3d.md` for 3D/hybrid routes, or `scene.md` for persistent non-3D
runtime routes. `motion.md` continues to own timing, interruption, choreography, and
reduced-motion semantics.

## CJK Typography

When shipped copy contains Chinese, Japanese, or Korean text, read `cjk-typography.md` and add a
`CJK Typography` section to change `design.md`. Record the actual system/project font stack and
available weights, body size and line height, punctuation and mixed-script convention, overflow
behavior, and representative real strings. Every decorative CJK font also records its exact glyph
scope, WOFF2/hosted subset bytes, license, `font-display` policy, and system fallback.

A Latin-only screenshot, a declared stack with no resolved fallback check, or a full CJK webfont
download used for body/UI copy does not satisfy this contract.

When `design.md` references a world-space element, it may define its visual treatment but must link
to the owning object/camera/interaction contract in `3d.md`.

## Ordering Against The Graybox

For a `primary-target` reference, write `design.md` after the graybox capture, not before. The spec
is then a record of values that have already survived one render instead of a reading of an image
nobody has tested. For `constraint` and `inspiration` references, keep the normal order and
reconcile after the first render.

The graybox gate is the only gate on what this file owns. Transparency and compositing posture,
material treatment, glow, bloom, depth of field, scanlines, and grading are released once
`reconstruction check --stage graybox` reports `ready`. The geometry gate holds detail geometry,
type treatment, and any measured fidelity claim; a blocked geometry stage does not withhold optical
treatment, and it does not stop `design.md` from being written. What it does withhold is the
language: while the verification claim is `unverified`, `design.md` may not describe the result as
exact, identical, 1:1, pixel-perfect, faithful, or complete.

## Spec Reconciliation

Every change with a reference ends `design.md` with this section:

```markdown
## Spec Reconciliation

Graybox: `graybox.png`, captured <iso8601>
Reconciled: <iso8601>

| Value | Specified | Implemented | Cause |
| --- | --- | --- | --- |
| board unit | clamp(6px, 1.35vw, 18px) | clamp(7px, min(3.95vh, 2.62vw), 36px) | render showed the board roughly 40% oversized |
| register 1 structure | [label][mark][readout] | label above full-width readout | reference reading corrected at first render |
```

Rules:

- the section is required whenever the change has a reference, and it cites the graybox capture the
  spec was written against. That capture must exist on disk.
- one row per value the implementation changed after the spec was written.
- `Cause` is required and must describe an observation, not an intention. "Render showed the board
  roughly 40% oversized" is a cause; "looked better", "felt cramped", and "wanted more contrast" are
  intentions and are not accepted.
- an empty table is a valid result and means the spec survived contact unchanged.
- an absent section is not a valid result. Gate review reports `blocked`.

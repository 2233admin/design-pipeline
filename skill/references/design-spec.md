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

When `design.md` references a world-space element, it may define its visual treatment but must link
to the owning object/camera/interaction contract in `3d.md`.

# Design

Wheels reviewed (research recorded here): Blender MCP bridges (ahujasid/blender-mcp and others)
need an interactive Blender with an add-on socket and do not suit deterministic batch renders;
BlenderProc (GPL-3.0) pins its own Blender version and targets synthetic CV data; Poly Haven assets
are CC0 but its Blender add-on is GPL, so the public API is called directly; the HyperFrames
`orbit-card` block (Apache-2.0) bakes a Blender camera rig per frame into three.js, which our
template mirrors in `motion.json`. No maintained, permissively licensed scriptable product-shot
template collection was found, so the scene is generated in code (no .blend files).

Runner: `blender -b --factory-startup -noaudio -P <template>.py -- params.json out/`. Blender is
located via `--blender`, `BLENDER_PATH` or default install paths, and must be 4.2 or newer. The
template declares typed parameters (file, enum, color, number, string); params are validated
before Blender starts.

`product-turntable`: optional model import (glb, gltf, obj, fbx) normalized to 2 units and
grounded, or a placeholder shape; clearcoat Principled material; curved cyclorama 80 x 30 units
so no orbit angle sees an edge; three-point area lights or a Poly Haven HDRI mixed through a
camera-ray Light Path so the environment lights but is never visible; AgX view transform; camera
with depth of field, push, orbit or static; product turns from -75% to +25% of `turnDegrees`,
ending in a three-quarter hero pose; keyframes eased (auto-clamped Bézier), ease-out, or linear.

Outputs: PNG frames encoded to H.264 with optional audio; probe.json (fcurves with keys in seconds,
interpolation and easing; Blender 5 layered actions via channelbags) converted to timeline.json;
motion.json baked per frame; composition check of first, middle and last frames.

Timeline gate adjustments found with Blender: a single continuous shot has only "ambient"
targets by coverage, which the gate excluded as subjects and so reported the beat static; ambient
targets now count when nothing else moves in the beat. `linear-motion` now recognizes Blender
channel names (location, rotation and scale with X, Y or Z).

Evidence on the reference host (RTX 4070 Ti): 48 frames at 480x270 in 15.5 s with EEVEE; two
renders pixel-identical (PNG bytes differ only by Blender's metadata stamps). Visual review caught
and fixed three template defects that no gate measures: a floating placeholder, an edge-on final
pose, and a visible backdrop edge and HDRI during the orbit. A Blender-only project passed
`film check` (storyboard, timeline from Blender keyframes, render with 5.1% pixel motion,
composition).

Not yet: more templates (hero reveal, logo sting), Cycles-specific calibration, and a three.js
block consuming motion.json.

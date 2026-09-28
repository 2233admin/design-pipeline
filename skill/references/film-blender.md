# Blender shots

Render real 3D product shots (lighting, materials, depth of field, camera moves) headless in
Blender from a parameterized template, then judge them with the same film gates as HTML motion.

```bash
designer-pipeline film blender                                   # list templates and parameters
designer-pipeline film blender --project-root <dir> --template product-turntable --params params.json [--engine eevee|cycles] [--output renders/shot.mp4] [--audio assets/score-mastered.wav]
designer-pipeline film check --project-root <dir>
```

`params.json` sets only what the template declares, for example
`{ "model": "assets/phone.glb", "color": "#2f6bff", "cameraMove": "orbit", "hdri": "studio_small_09", "durationSec": 4 }`.
Unknown or out-of-range values fail with the allowed values.

Template `product-turntable`: the product (a .glb, .gltf, .obj or .fbx model, normalized to stand
on the floor, or a placeholder shape) turns into a three-quarter hero pose on a curved studio
backdrop while the camera pushes in, orbits or holds. Lighting is a built-in three-point rig or a
Poly Haven HDRI (CC0, downloaded by id and verified by md5) that lights and reflects but is never
seen directly. Color management is AgX.

Outputs: the encoded film, `timeline.json` converted from the Blender keyframes (interpolation
becomes the ease, so linear keys warn), `assets/<template>-motion.json` with camera and product
transforms baked per frame for three.js blocks, and a composition check of the first, middle and
last frames. The scene is built entirely in code; no .blend files.

Blender is GPL and is not part of this package: install Blender 4.2 LTS or newer and pass
`--blender <path>` or set `BLENDER_PATH` if it is not in the default install location. The
template scripts in this package are MIT. EEVEE renders are pixel-identical across runs (Blender
stamps render time into PNG metadata, so compare pixels, not bytes).

The gates cannot see set problems such as a visible backdrop edge or an unflattering final angle;
watch the shot.

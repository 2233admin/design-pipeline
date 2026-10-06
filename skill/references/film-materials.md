# Film material routing

Choose the simplest route that preserves the observed effect. In replicate mode record this in
`storyboard.json.rendering` before building, including quick shots. Do not mistake a successful
export or motion gate for a material match. Missing Blender is a reason to try WebGL, not to erase
depth or replace glaze with a painted gradient.
The existing `graphics-runtime-catalog.json` families `fixed-camera-cinematic-3d`,
`scene-renderer-3d` and `gpu-shader` describe these capabilities; adapter identity and installation
facts stay in `adapter-registry.json`. The film plan records requirements, not a second resolver.

```json
"rendering": {
  "route": "webgl",
  "requirements": ["solid-depth", "bevel", "clearcoat", "view-dependent-color", "surface-relief"],
  "reason": "The enamel reference has raised silver rims, glazed blue relief and angle-dependent foil inserts.",
  "samples": [
    { "atSec": 0.2, "purpose": "Front: compare rim width, glaze and cell colors." },
    { "atSec": 6, "purpose": "Oblique: compare solid edges, moving reflections and angle-dependent color." }
  ]
}
```

Routes: `dom`, `canvas2d`, `css3d`, `webgl`, `blender`, `footage`. The first three serve flat graphics
and plane choreography; the five listed material requirements need WebGL, Blender or preserved
footage. An empty requirements array is valid for an observed flat reference; explain why. This
gate rejects an incapable declared route, not an incorrect implementation or poor pixels.

For WebGL enamel, import `film-materials/enamel.mjs` and call `createEnamelMaterial(THREE, options)`.
It uses MeshPhysicalMaterial clearcoat and iridescence plus explicit GLSL cellular color and relief.
Build actual extruded/beveled geometry; supply studio lights and a PMREM environment. Keep blue
enamel dielectric; make the metal rim a separate metallic material. Foil inserts may be iridescent;
enamel does not need rainbow color everywhere. Noise stays object-locked, color follows view/light
angle, and film time only drives the object's pose. Pin and vendor the project's Three.js version.

Before full export, check shader compilation and browser errors, reverse-seek identical frames,
then hold time fixed and change angle: reflection and iridescence must respond. Render the planned
sample times and inspect them against the reference. Write material mismatches in `qa.md`; these
checks establish execution, not fidelity or user acceptance.

Primary APIs: [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html),
[Material.onBeforeCompile](https://threejs.org/docs/pages/Material.html#onBeforeCompile),
[PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html).

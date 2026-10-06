# Third-Party Notices — Enamel Badge

This example redistributes the local runtime modules and HDR listed below. Their licenses remain applicable independently of this project's MIT license.

## Three.js 0.180.0 / r180

- Source: [mrdoob/three.js, r180](https://github.com/mrdoob/three.js/tree/r180).
- Copyright © 2010-2025 three.js authors.
- License: MIT; full text in [vendor/three/LICENSE](vendor/three/LICENSE).
- Scope: the local `three.module.js` / `three.core.js` builds, the native postprocessing passes and transitive shader modules under `lib/`, and the official HDR loader with its local import adapted.

## Scott Sun — diffraction and spectral glass examples

- Source: [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills/tree/d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba).
- Reviewed revision: `d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba`.
- Copyright (c) 2026 Scott Sun.
- License: MIT. The full copyright, permission and warranty notices are retained in [lib/diffraction.mjs](lib/diffraction.mjs) and [lib/lens.mjs](lib/lens.mjs).

[The physical diffraction grating example](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills/blob/d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba/skills/threejs-procedural-materials/examples/physical-diffraction-grating/physical-diffraction-grating.js) is adapted from TSL to GLSL, with a fixed sixfold hexagonal etching pattern. The analytical phase-grating calculation remains an approximation rather than a measured, energy-conserving material model.

[The spectral glass example](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills/blob/d1cb23dcce6ea8ee4a60f6159daeb79d4b511dba/skills/threejs-procedural-materials/examples/spectral-dispersive-glass/spectral-glass-material.js) informs the two-interface Snell path in the local lens adaptation. The implementation integrates with Three.js's native transmission chunk and uses native three-channel dispersion; it does not include the upstream eight-wavelength Cauchy/CIE/TIR tracer.

## Drei — Caustics

- Source: [pmndrs/drei, Caustics.tsx](https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/src/core/Caustics.tsx).
- Reviewed revision: `bf6f4addf47467d3885de272d94ca5127f6ef68f`.
- Original author credited by the adaptation: N8Programs / N8python.
- Copyright (c) 2020 react-spring.
- License: MIT. The full notice is retained in [lib/caustics.mjs](lib/caustics.mjs).
- Adapted scope: normal/depth capture and refracted-footprint area ratio. The local helper uses a single refracting interface, directional light and a planar receiver; it does not bundle or execute React or the Drei runtime.

## SMAA v2.8

The Three.js SMAA pass and shader use SMAA algorithms and lookup data. SMAA has its own redistribution conditions; full unmodified text is in [licenses/SMAA-v2.8.txt](licenses/SMAA-v2.8.txt). Source: [iryoku/smaa, v2.8](https://github.com/iryoku/smaa/tree/v2.8).

Uses SMAA. Copyright (C) 2011 by Jorge Jimenez, Jose I. Echevarria, Tiago Sousa, Belen Masia, Fernando Navarro and Diego Gutierrez.

## Poly Haven — Kloofendal 48d Partly Cloudy

- Asset: [Kloofendal 48d Partly Cloudy](https://polyhaven.com/a/kloofendal_48d_partly_cloudy).
- Author: Greg Zaal.
- License: CC0; [Poly Haven asset license](https://polyhaven.com/license).
- Redistributed file: [assets/kloofendal_48d_partly_cloudy_2k.hdr](assets/kloofendal_48d_partly_cloudy_2k.hdr).

## Reference media boundary

The third-party reference video, extracted reference images and source audio are not redistributed. `demo-motion.json` contains manually estimated numeric demonstration poses, not recovered source motion. `preview.png` is rendered from this example.

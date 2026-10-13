# Add a Blender adapter

HTML and three.js cover most promotional motion, but not studio-quality product shots with
physical lighting, materials and depth of field. Blender 5.2.2 LTS is installed on the reference
host and renders headless.

Add `film blender`: parameterized, code-built scene templates rendered headless, with the output
fed into the existing gates. Blender keyframes convert to the film timeline format, so the timeline
gate and motion craft rules apply unchanged. Reuse, rather than rebuild: Poly Haven CC0 HDRIs by
id, the HyperFrames `orbit-card` idea of baking camera motion per frame for three.js, and existing
runtime-agnostic render, composition and audio gates.

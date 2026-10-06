# Design

`design-pipeline.film-storyboard.v1` gains optional `rendering`: route, requirements, reason and samples. Existing generic storyboards remain valid; `next` in replicate mode reopens plan when the rendering plan is absent. The existing storyboard gate checks typed requirements against route capabilities and requires two distinct sample times for view-dependent color. These are planned inspection points, not proof that the implementation or pixels are correct.

DOM, Canvas 2D and CSS 3D remain sufficient for flat graphics. Solid depth, bevels, clearcoat, procedural relief and view-dependent material color require WebGL or Blender; footage may preserve recorded effects. Runtime/shader compilation, reverse seeking and angle-response checks are exercised in the local reproduction experiment. Review compares actual renders with the reference and never infers acceptance from a gate pass.

An ESM helper accepts the project's Three.js namespace and adds deterministic, object-locked cellular color and relief in GLSL to MeshPhysicalMaterial. Native clearcoat, physical iridescence and environment lighting are retained. No clock, networking, animation loop, reference raster or bundled dependency. The shot owner controls geometry, environment and seeking.

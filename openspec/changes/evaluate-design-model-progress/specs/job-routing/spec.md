## ADDED Requirements

### Requirement: VFX and shader requests select the existing graphics runtime door

The job registry SHALL recognize VFX, shader, GLSL, WGSL and Chinese game-effect requests without requiring the user to name a rendering library. Routing SHALL preserve the existing dispatcher, kernel, artifact lineage and admission semantics.

#### Scenario: Game effect without a library name

- GIVEN a request for game VFX, a GPU shader, GLSL, WGSL or 游戏特效
- WHEN the existing route command resolves the primary job
- THEN it selects graphics-runtime and its existing knowledge door

#### Scenario: Ordinary UI and explicit product video

- GIVEN an ordinary material settings form or an explicit product launch video demonstrating a VFX shader
- WHEN the existing route command resolves the primary job
- THEN the settings form remains product-design
- AND the explicit product launch video remains motion-graphics with product-launch-video form

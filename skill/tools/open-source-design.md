# Find and apply a missing design capability

Use this during planning, production or rendered review when the work needs a technique that
the agent or current toolset does not yet handle well. The user need not name a library or ask
for a GitHub search. Start from the intended perception and actual project, then actively find
and test the missing method. Stop research when a suitable method answers the task.

## Diagnose before choosing a tool

Name the visible goal, the shortfall and the evidence: uneven pressure strokes, unclear title
hierarchy, unstable glyph edges, flat lighting, implausible material response, stiff action or
unreadable graphic relationships. Check the current source and rendered result when available;
do not invent a measured defect from a vague brief.

Separate a design decision from an implementation gap. Weak hierarchy may need grouping,
scale and negative space; stiff action may need poses and spacing. Use
[design references](design-sources.md) and [animation thinking](../references/animation-thinking.md)
for those decisions. Extra effects or dependencies do not establish better design.

For an implementation gap, check the existing project, [local tools](README.md), selected
bundled methods and native platform capabilities first. Reuse the first adequate solution.
If it does not meet the visible goal, search upstream documentation and GitHub proactively
instead of stopping at the local catalogue, asking the user to supply repository names, or
reimplementing a difficult algorithm from memory. Simple covered work needs no external search.

## Search for the operation, then inspect its implementation

Use the capability plus the actual runtime, language or output format in the query, such as
`pressure stroke polygon TypeScript`, `SDF text Three.js kerning`, `halftone GLSL alpha`,
`Blender procedural material light rig`, or `graph layout ports SVG`. Follow the creator's
repository and version-matched documentation. The website directory is one discovery source;
GitHub candidates outside it are eligible too.

These repositories are examples to investigate, not a closed list or preapproved dependencies.
Their primary descriptions were checked on 2026-10-07; verify the selected revision on use.

| Needed operation | Example source | Fit and concrete check |
| --- | --- | --- |
| Pressure-sensitive stroke outlines | [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | Produces polygon points for a caller's renderer; check pressure, corners, end caps and temporal stability against the existing brush |
| Glyphs in an existing Three.js scene | [troika-three-text](https://github.com/protectwise/troika/tree/main/packages/troika-three-text) | SDF text and layout; check real copy, kerning, supported font files, asynchronous readiness and fallback/font requests at the selected version |
| Image effects in an existing Three.js renderer | [postprocessing](https://github.com/pmndrs/postprocessing) | Passes/effects; check renderer compatibility, alpha, colour space, pass order and frame cost before adding it |
| Diagram node/edge placement | [elkjs](https://github.com/kieler/elkjs) | Computes graph positions; retain the project's rendering, typography and art direction, and verify crossings, ports and label space |

For lighting and materials, inspect the existing renderer's official examples or the installed
Blender workflow before adding another engine. For PV, kinetic type and transitions, preserve
the project's clock; inspect a useful algorithm or authoring method without adopting an entire
editor solely for its demo. These choices apply equally to stills and interactive work.

Read the candidate's actual API/source slice and example, not just its README image or stars.
Check the selected revision's license and asset/font notices, dependency and peer versions,
maintenance/known issues, inputs/outputs, loading/network behaviour and cleanup. A public
repository without usable license evidence remains a reference candidate. Record the revision
or release, source paths and why it solves this gap in existing task notes. Do not silently
switch project renderers or copy upstream canvas dimensions, actors, style or global state.

## Apply the smallest useful part and inspect the result

Choose the appropriate use: learn a method, adapt a permitted source slice, add a compatible
project-local dependency, or use an authoring tool to generate an asset. Continue implementation
within the existing task authorization; ordinary read-only discovery does not need a separate
approval round. Material changes of project direction, cost or permissions still need the user's
decision. Catalogue acquisition itself does not execute upstream instructions or install tools.
New pipeline adapters use the existing [adapter intake](../references/graphics-runtime-routing.md#support-and-trust);
component adoption retains its existing fit/decision route. Do not create a parallel registry.

Build a bounded study with the actual text, assets, dimensions and relevant state or time range.
For an improvement, retain the current output and compare at the same view/time. Inspect pixels
and, for motion, playback, cold start, seeking and cleanup. Judge the stated problem: readable
type, intentional hierarchy, material/light response, expressive timing or correct layout.
Also check applicable accessibility, alpha/colour behaviour and performance. Package import or
a successful render command is technical evidence only.

If the method works, integrate that tested part and rerender the affected project surface.
If it fails, record the concrete cause and return to the missing method; do not hide a quality
shortfall by lowering the target. Keep discovery, tested study, project adoption and reusable
skill support distinct in existing notes. No fixed candidate count or review-round quota is needed.

When delegation is available and authorized, a lower-cost worker can implement one selected
operation. Supply the visible goal, reference, exact source/API, real inputs, editable scope and
render check. The lead inspects the result against the direction. Keep useful findings with their
evidence, why they worked and limits; promote reusable methods/tools through the existing
[internalization route](../references/upstream-capability-sync.md#review-and-internalize-a-difference).
This does not authorize modifying the installed skill during unrelated downstream work.

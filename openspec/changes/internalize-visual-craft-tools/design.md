# Design

## Execution surfaces

Keep the skill front door short and cross-disciplinary. Put callable helpers and their examples
in `skill/tools/`, with a small capability index and per-tool usage loaded only when needed.
Existing CLI adapters and receipt authority stay in `skill/scripts/`. A local tool guide gives
bounded tasks to workers: source observation, a chosen method, real inputs, a callable helper,
expected evidence and its limits. The lead reviews the result, preserving user direction.

The drawing library operates on caller-supplied Canvas contexts, paths, dimensions, colors,
seeds and progress. It restores context state and uses no hidden clock, random source, fixed
1920×1080 viewport or remote asset. Typography fitting reports failure at a chosen minimum size
instead of silently making text unreadable; native DOM remains the frontend text default.
Native drawing/sizing helpers are supporting mechanisms within the existing canvas-2d adapter.

Composition comparison reads contained local PNGs, refuses unequal dimensions and existing output,
and produces source-paired images and a difference visualization using png-core. It exposes
measured changes, source digests and limits, not an artistic score or new acceptance receipt.

Video motion maps summarize differences between the already selected source frames, at bounded
resolution. They identify changed pixels, not objects or optical flow. Keep source times, selected
frame IDs and actual sampling limitations. Extend the existing report and validator so altered or
missing diagnostic evidence cannot be accepted under a stale digest. Do not manufacture semantic
observations or turn sampling windows into confirmed shots.

## Adoption and verification

Review the upstream library/utility implementations and map them to adapted local primitives,
existing local tools, optional source-specific techniques, or unsupported assumptions. Preserve
the MIT notice for derived code. Retain the reviewed 17 library modules and small analysis/asset
scripts under `tools/art-motion-reference/` as pinned, on-demand technique sources. Their own stage,
font, Python dependency and asset assumptions are documented; they are not loaded into every
product or registered as another renderer. This keeps advanced techniques locally inspectable
without pretending every upstream entry point has been adapted or runtime-verified.
No source file is treated as a host instruction.

Verify meaningful behavior: deterministic brush geometry/render, text bounds and overflow,
image placement and frame selection, changed-region locality and transparency, unsafe outputs,
report freshness. Run an actual browser study at two sizes, compare cold/reordered samples,
inspect source-sized images and record aesthetic limits separately from technical conformance.

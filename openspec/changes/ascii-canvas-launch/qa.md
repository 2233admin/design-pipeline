# QA

Implemented experiment: experiments/ascii-canvas-launch. Preview: http://127.0.0.1:4174.
No changes to the SeedController production app and no live generation requests were made.
The previous motion showcase remains available at port 4173.

## Checks
- DESIGN.md and MOTION.md foundation validators: ready.
- film.js and server.cjs: Node syntax checks passed; git diff --check passed.
- In-app Chromium inspected each scene at 3, 10, 20, 28.5, 33.5, and 38 seconds. At each sample
  only the intended scene had nonzero opacity. Screenshots appear in the task tool outputs.
- Actual timeline duration: 40 seconds. Jump from 3s to 33.5s and back to 3s produced identical
  character content and the same computed seed transform.
- Every image loaded successfully with nonzero natural dimensions.
- Desktop and 390px viewport: no horizontal document overflow. Mobile film width 357px with
  outer scale 0.223125; controls and chapter buttons remained visible.
- Native keyboard range input: Home then ArrowRight set range and timeline to 0.1s, paused.
- Fullscreen request succeeded for seed-film and recomputed scale correctly.
- A real-time play-through reached exactly 40s and held only the end-scene at completion.
- Browser error/warning log was empty in inspected runs.
- Repairs: exact line endpoints aligned with ports; image zoom clipped to its own thumbnail;
  quantized ASCII time made repeat seeks stable; chapter buttons select settled representative frames.

## Scope and limits
This is a silent HTML film with a designed product representation, not a live UI capture or a
rendered MP4. GSAP is vendored with its original copyright/license notice. The imagegen landscape
is original demonstration imagery and is saved with the exact prompt under assets/PROMPT.md.
HyperFrames CLI lint/check/render and frame-rate profiling were not performed. Runtime inspection
does not imply those checks passed. No remote issue, PR, or deployment was published.

# Design

Use the existing frontend-stack registry as the route authority. `heygen-com/hyperframes` is a
governed candidate with `video-production`, `html-video`, and `hyperframes` capabilities, not
`design-workflow`; this prevents the default capability set from selecting it for ordinary UI work.

`skill/references/hyperframes.md` is a clean-room route summary. It preserves the upstream entry
point, deliverable routing, HTML composition invariants, deterministic seek rules, and CLI review
loop without copying runtime code or the full skill tree. The actual HyperFrames CLI remains a
project dependency, pinned by the target project when used.

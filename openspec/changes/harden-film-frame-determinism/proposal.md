# Harden film frame determinism

A HyperFrames film is rendered by seeking a paused timeline frame by frame. Anything in the
composition that reads the wall clock, a random stream or a frame callback makes the exported
frame differ from the previewed one. The contract was prose only (`hyperframes.md`, the
`patterns.js` header); the timeline gate sees tweens, not the composition source, so a
`Math.random()` jitter passed every gate.

Scan the composition source in `film check`'s timeline step and report `nondeterministic-source`
with file, line and a fix. Document how to derive jitter and noise deterministically
(`hash(seed, frameIndex)`), and add a one-page beat author contract.

Idea borrowed from github.com/bizarro/evangelion: frame = f(t), with seed jitter keyed by frame
index rather than continuous time.

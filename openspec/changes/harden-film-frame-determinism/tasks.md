# Tasks

- [x] Add `scanCompositionSource` and the `nondeterministic-source` finding with a fix hint.
- [x] Run the scan from `film check`'s timeline step, with and without a captured timeline; report file and line in `fixes`.
- [x] Document `hash(seed, frameIndex)` jitter and the beat author contract in `hyperframes.md`; add the rule to the `patterns.js` header.
- [x] Test Math.random (file and line), scaffold pass, seeded-hash pass, each API, autoplay, comments/strings, `compositions/*.html`, skipped-timeline behavior.
- [x] Scan local `<script src>` files (path-contained, realpath-checked), list network and filesystem-absolute scripts as unscanned, warn (and list) for local minified, escaping or missing sources, and test each case.
- [x] Run repository QA and record results.

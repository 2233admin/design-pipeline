# Tasks

- [x] 1.1 proposal.md, design.md and the `product-film` spec delta; Closes #233.
- [x] 2.1 `audio-core.cjs`: `hitOnsets`, cue sync in `checkAudio`, the four findings with fixes, `metrics.cueSync`.
- [x] 2.2 `companion-capabilities.json`: optional "Listening and film sound" group (`earshot`, `real-sound`).
- [x] 2.3 `audio-gate.md`, `companion-skills.md`, `workflow-film.md`, `SKILL.md`, CHANGELOG.
- [x] 3.1 `tests/audio-gate.test.cjs`: on/off frame, frame rate, unsounded severities, chance warning, untimed kinds, hits over the seed score; the CLI pass fixture now carries hits on the example's cues.
- [x] 3.3 Review fixes: `sync-at-chance` without the three-cue minimum and no prescribed shift while at chance, `chanceOnFrame`, buried-effect step in the `cue-off-frame` fix from 50 ms, every hit cue unsounded when nothing is audible; tests for each.
- [x] 3.2 `npm exec -- openspec validate audio-cue-sync-and-ears --strict`, `npm run specs:check` and `npm test`.

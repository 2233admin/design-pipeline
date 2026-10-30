# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `web-workflow` spec delta; Relates to #215.
- [x] 1.2 `npm exec -- openspec validate recording-to-site --strict` and `npm run specs:check`.

## 2. Behaviour

- [ ] 2.1 `workflows/replicate.cjs`: parse the table (design.md 2); `recorded-behaviours-missing` and per-row findings at the extract step for web and ui with a `video` reference.
- [ ] 2.2 `gate-core.cjs`: optional `recordedBehaviours` input (design.md 3); pass the ids at the web and ui delivery call sites.

## 3. Tests and docs

- [ ] 3.1 Tests for each scenario; register in `scripts/test-manifest.json`.
- [ ] 3.2 `references/recording-to-site.md` in our words; register in `package-resources.json`, `skill/tools/README.md`; link from `workflow-web.md`.
- [ ] 3.3 CHANGELOG; `THIRD_PARTY_NOTICES.md` concept credit to motion2code at `0f00328`.

## 4. Verification

- [ ] 4.1 One generated interface recording end to end: table, matrix, delivered page with working controls on phone and desktop.
- [ ] 4.2 `npm test` green.

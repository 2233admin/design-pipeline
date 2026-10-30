# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate hyperframes-0-8-221 --strict` and `npm run specs:check`.

## 2. Bump (after refresh-upstream-snapshots)

- [ ] 2.1 `HYPERFRAMES_VERSION` 0.8.221; evals; notice commit `f4bbbe10741bbcfe2ae866203611797e4a1999d4`; every doc and test naming the version; QA check that they agree.
- [ ] 2.2 `references/hyperframes.md` route section (proposal).
- [ ] 2.3 Shared seek helper (design.md 4) used by the three capture/probe paths.
- [ ] 2.4 `film check` / `verify film-render`: run `hyperframes check --json`, map craft and audio findings (design.md 2); add `snapshot --review` output to evidence.
- [ ] 2.5 Scaffold templates and golden cases: media treatment, `@font-face`, no `crossorigin`, `<template>` styles, `<audio id>`.
- [ ] 2.6 Film evidence records `HYPERFRAMES_VERSION`; film gate input hashes include it (design.md 5).

## 3. Verification

- [ ] 3.1 `film-layout`, `film-project`, `hyperframes-routing` tests on 0.8.221.
- [ ] 3.2 Re-baseline goldens with frame-pair review (design.md risks).
- [ ] 3.3 `npm test` green; CHANGELOG entry.

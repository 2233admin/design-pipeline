# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate taste-skill-v2 --strict` and `npm run specs:check`.

## 2. Vendor

- [x] 2.1 `scripts/import-taste-skill.cjs` pinned to `12af471f627f866411b4bd785b19646d3672784c`; import from a clean reviewed checkout; pre-v2 snapshot replaced.
- [x] 2.2 Manifest, `.gitattributes`, `THIRD_PARTY_NOTICES.md`, `package-resources.json`, catalog and capability pins.
- [x] 2.3 The importer reads the folded description; the shared snapshot helper is unchanged.

## 3. Guide

- [x] 3.1 Rewrite `references/taste-skill.md`: four routes, optional advisory tools, former methods and their pipeline routes.
- [x] 3.2 Update `stages.md`, `SKILL.md` and every other reference; marker `built-in-taste-skill`.

## 4. Verification

- [x] 4.1 `tests/taste-skill.test.cjs` updated; `npm run sources:check`.
- [x] 4.2 `npm test`; CHANGELOG entry.

## 5. Follow-ups (separate issues)

- [ ] 5.1 Vendor Leonxlnx/taste-skill-classics and Leonxlnx/imagegen-skills if their methods are wanted again (#255).
- [ ] 5.2 `taste inspect` / `taste draw` CLI wrappers, `roulette/taste-draw` pool and stale-report tracking (#256).

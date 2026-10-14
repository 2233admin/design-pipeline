## 1. Change records

- [x] 1.1 Issues #118 and #119; proposal.md, design.md and the `design-pipeline` spec delta.
- [x] 1.2 `npm exec -- openspec validate store-upstream-skill-files --strict` and
  `npm run specs:check` pass.

## 2. Behaviour

- [x] 2.1 `skill/scripts/upstream-path.cjs` with `storedPath` and `upstreamPath`.
- [x] 2.2 `git mv` every `skill/vendor/**/SKILL.md` to `UPSTREAM-SKILL.md`; manifests unchanged.
- [x] 2.3 Verifiers (mengto, iart, prism, holosticker, shadcnio, design-md), catalog results,
  `film methods` preparation and `refresh-companion-snapshots` use the mapping.
- [x] 2.4 `git-tree-snapshot.cjs` and every importer write and hash through the mapping and refuse a
  stored-name collision.
- [x] 2.5 `package-resources.json`, guides and `vendor/README.md` point at the stored name.
- [x] 2.6 QA requires exactly one `SKILL.md` in the built package.

## 3. Tests

- [x] 3.1 `upstream-path` unit tests; a stray `SKILL.md` in a snapshot blocks verification.
- [x] 3.2 Source-integrity tests (`sources:check`) and catalog tests use the mapping.

## 4. Verification

- [ ] 4.1 skill-creator `quick_validate` reports "Skill is valid!"; `sources:check` and
  `npm run specs:check` pass; `npm test` passes locally except the environment-only ffmpeg
  filter test (same on `main`); CI green on the PR.

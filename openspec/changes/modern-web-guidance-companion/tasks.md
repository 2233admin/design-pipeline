# Tasks

## 1. Change records

- [x] 1.1 proposal.md, design.md and the `design-pipeline` spec delta.
- [ ] 1.2 `npm exec -- openspec validate modern-web-guidance-companion --strict` and `npm run specs:check`.

## 2. Registry and provenance

- [x] 2.1 `companion-capabilities.json`: group `Web platform guidance` (install hint with `DISABLE_TELEMETRY=1`) and profile `modern-web-guidance-skill` with `sourceMeta`.
- [x] 2.2 `sources.lock.json`: entry `modern-web-guidance` (`adapted-reference`, `documents`, `profiles`) at `4dd968349e54ca45a05dd5c818fb035c9054b022`; guide frontmatter with `reviewedPackage`, `reviewedSkillVersion`, `reviewedContentHash` and its scope.

## 3. Guide and routing

- [x] 3.1 `skill/references/modern-web-guidance.md`: three consult cases, project wins, telemetry off, citation format.
- [x] 3.2 `capability-routing.md`, `companion-skills.md`, `stages.md`, `pipeline-reference.md`, `SKILL.md`; `anti-slop-review.md` and `template-bank.md` citation rule.
- [x] 3.3 Job `modern-web-guidance` in `job-registry.json`, `excludeKeywords` in `job-registry.schema.json` and `job-route-core.cjs`.
- [x] 3.4 `package-resources.json` (`required`), `docs/install.md`, `docs/features.md`, `CHANGELOG.md` [Unreleased].

## 4. Tests

- [x] 4.1 `tests/modern-web-guidance-companion.test.cjs` (registry, lock and frontmatter agreement, telemetry on every command, three cases, citation), registered in `scripts/test-manifest.json`.
- [x] 4.2 `tests/job-route.test.cjs` (matching briefs route to the job; existing-pattern, backend, CI and database briefs do not; stronger jobs still win; `excludeKeywords` validation) and `tests/source-governance.test.cjs` (`sourceRefs` entry).
- [ ] 4.3 Focused tests (`modern-web-guidance-companion`, `job-route`, `source-governance`, `sources-lock`, `check-deps`, `capability-audit`), `npm run sources:check`, then `npm test`.

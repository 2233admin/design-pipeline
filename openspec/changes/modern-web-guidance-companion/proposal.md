# modern-web-guidance-companion: Chrome's web platform guidance as a tracked optional companion

## Why

`npx modern-web-guidance@latest install` installs Google Chrome's `modern-web-guidance` skill
(`GoogleChrome/modern-web-guidance`, Apache-2.0): 17 guide categories of current HTML, CSS and
client-side JavaScript practice with fallbacks, searched and read through a local CLI
(`search`, `retrieve`, `legacy-scan`). The install command is a wrapper: it runs
`npx -y skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance` and forwards any
extra arguments to it. Its job is the one a hand-written UI most often gets wrong: which platform
feature to use today (dialog, popover, anchor positioning, view transitions, container queries,
Temporal, Sanitizer) and what fallback a browser that lacks it needs.

Measured before this change, at upstream `4dd968349e54ca45a05dd5c818fb035c9054b022`:

- `grep -rn -i "modern-web-guidance\|modern web guidance" skill/ sources.lock.json docs/ tests/`: no result.
- `node skill/scripts/check-deps.cjs --json` with the skill installed in a skill root: no group,
  profile or install hint mentions it, so the self-check cannot say whether it is present or stale.
- The implementation stage names `good-css.md` for styles and nothing for the choice of a newer
  HTML, CSS or DOM API, so that choice falls to model memory, which the upstream skill's own
  description calls obsolete.

Two more requirements came from a project that already runs the skill:

- The upstream skill is written to be mandatory for every web task and its CLI reports anonymous
  usage (installs, the calling agent, guide ids, search queries) unless `DISABLE_TELEMETRY=1`. A
  pipeline that writes the commands must write them with the variable, and must say when the skill
  is not needed (a change that follows the repository's existing pattern, or backend and CI work).
- A review that rests on a platform rule needs to say where the rule comes from without copying
  the guide into the repository, and a project that deliberately breaks a guide (a console that
  does not follow `prefers-reduced-motion`) must keep its own rule.

## What Changes

- **Companion group and profile** in `companion-capabilities.json`: group `Web platform guidance`
  (optional, skill `modern-web-guidance`) with the install command (`DISABLE_TELEMETRY=1 npx -y
  modern-web-guidance@latest install`) and the built-in fallback, and capability profile
  `modern-web-guidance-skill` whose markers are the `search` and `retrieve` commands and the
  browser-support policy section of the installed `SKILL.md`. A missing skill is `WARN` on the
  group and `INFO` on the profile; an installed skill without a marker is `WARN`.
- **Lock entry** `modern-web-guidance` (`adapted-reference`, document
  `skill/references/modern-web-guidance.md`, `profiles` link), so the reviewed revision and the
  content hash of the upstream `SKILL.md` and `LICENSE` follow `sources:update` like every other
  adapted reference. The guide's frontmatter also records the reviewed npm package
  (`modern-web-guidance@1.0.0`) and skill version (`2026_11_09-5bcc021b`), which no script moves.
- **Guide** `references/modern-web-guidance.md`: when the pipeline consults it (three cases), the
  rule that the project's own rules win, `DISABLE_TELEMETRY=1` on every command, the install forms
  (the interactive wizard, the non-interactive forms agents can run, project or global scope,
  `--choose`, `update`, `uninstall`), the search → retrieve → verify → record loop, query rules,
  how a review cites a guide (id plus one line, no copied text), browser-support policy, `.mwgrc`
  opt-ins and the fallback when it is absent.
- **Job** `modern-web-guidance` in `job-registry.json` (scored, priority 44, primary knowledge the
  guide, admission `ready`) with narrow platform-pattern keywords, in English and Chinese, and a new
  optional `excludeKeywords` list (schema and `job-route-core.cjs`) that keeps a brief from being
  scored for a job: "match the existing", "沿用现有", backend, database, CI and Docker words.
- **Routing.** `capability-routing.md`, `SKILL.md`, `companion-skills.md`, `stages.md` and
  `pipeline-reference.md` state the same three cases. `anti-slop-review.md` and `template-bank.md`
  state how a finding cites a guide. The work stays inside the existing implementation and `qa.md`
  record: consulted guide ids, adopted fallbacks and divergences go into it.
- **Docs.** `docs/install.md` and `docs/features.md` name the command; `CHANGELOG.md` records it.

## Capabilities

- `design-pipeline`: companion compatibility, implementation routing and review citation.

## Reuse

`companion-capabilities.json` groups and profiles, `check-deps.cjs` skill-root discovery and marker
audit, `sources.lock.json` `adapted-reference` entries with `documents` and `profiles`, the
`ordered UTF-8 sourceFiles` content-hash scope, `job-registry.json` and `job-route-core.cjs`,
`capability-routing.md` route table, `qa.md` implementation record, `good-css.md`,
`web-interface-guidelines.md`, `package-resources.json` and the test manifest.

## Impact

- New: `skill/references/modern-web-guidance.md`, `tests/modern-web-guidance-companion.test.cjs`.
- Changed: `skill/references/companion-capabilities.json`, `sources.lock.json`,
  `skill/references/companion-skills.md`, `capability-routing.md`, `stages.md`,
  `pipeline-reference.md`, `anti-slop-review.md`, `template-bank.md`, `skill/SKILL.md`,
  `job-registry.json`, `job-registry.schema.json`, `skill/scripts/job-route-core.cjs`,
  `package-resources.json`, `scripts/test-manifest.json`, `tests/job-route.test.cjs`,
  `tests/source-governance.test.cjs`, `docs/install.md`, `docs/features.md`, `CHANGELOG.md`.
- Route results change for briefs that name a platform pattern: they select the job
  `modern-web-guidance` (priority 44, below clone, graphics, motion-graphics, refine-intents and
  motion-vocabulary on equal scores) instead of the `product-design` default. The route stays a hint:
  no new CLI command or flag, no gate, receipt field or catalog record. The self-check result stays
  `OK` (exit 0) when the companion is absent.
- Not in this change: no upstream guide, script or embedding is copied into the package
  (`skill/vendor/modern-web-guidance` stays absent; the CLI is the source of truth and is
  Baseline-aware at run time), and the pipeline does not run `legacy-scan` for a named feature.
  A local offline copy of the guides is a separate decision.

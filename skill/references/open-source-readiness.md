# Open Source Readiness

This is the release gate for publishing `design-pipeline`.

The project is ready to open source only when all `MUST` checks pass. `SHOULD` checks may be documented as known gaps.

## 1. Installability

MUST:

- `SKILL.md` exists at the skill root.
- The skill has valid frontmatter `name` and `description`.
- All referenced files exist.
- The website-cloning workflow, component contract, manifest schema, and initializer are bundled.
- The contextual anti-slop rubric, evidence/report schemas, review guide, and evaluator are bundled.
- The palette evidence schema, foundation checker, and website-cloning integration are bundled.
- The motion foundation guide, schema, primitive registry, and checker are bundled.
- Scripts use only standard runtime dependencies unless documented.
- The skill can run from a default Codex skill root and from `CODEX_SKILLS_DIR`.

Command:

```bash
node scripts/check-deps.cjs --json
```

Pass:

- Exit code `0`.
- JSON parses.
- `result` is `OK`.
- Required group `Core pipeline` is `OK`.

## 2. Missing Dependency Behavior

MUST:

- Missing optional/enhancement skills produce `WARN`, not `FAIL`.
- The report includes fallback guidance.
- The report includes install hints for missing companion groups.
- A user with only the complete `design-pipeline` skill bundle installed can still run the pipeline with documented fallbacks.

Pass:

- A simulated skill root containing only the distributable `design-pipeline` folder returns `OK`.
- At least one optional group reports `WARN`.
- No optional group reports `FAIL`.

## 3. Design-First Scope

MUST:

- The project states that design is the product boundary.
- Engineering integrations are documented as support systems, not the product.
- External skill intake follows `references/curation-policy.md`.

Pass:

- `SKILL.md` references the curation policy.
- `curation-policy.md` contains accept/reject/watchlist outcomes.

## 4. Artifact Lifecycle

MUST:

- The default artifact root is documented.
- Change artifacts include:
  - `brief.md`
  - `directions.md`
  - `design.md`
  - `motion.md`
  - `tasks.md`
  - `qa.md`
  - `state.json`
  - `events.jsonl`
  - `handoff.md`
- OpenSpec compatibility is documented.
- Promotion to long-lived design specs is documented or listed as a known gap.

Pass:

- `SKILL.md` lists all required artifacts.
- `development-compatibility.md` documents OpenSpec behavior.

## 5. Headless Agent Readiness

MUST:

- `references/agent-interface.md` exists.
- `state.json`, `events.jsonl`, and `handoff.md` schemas/templates are documented.
- QA checks whether another agent can resume without conversation history.
- Secrets must not be written to agent state artifacts.

Pass:

- `qa-checklist.md` includes Agent-Readable State checks.
- `agent-interface.md` includes resume and staleness protocols.

## 6. Motion And Animation Readiness

MUST:

- Project root `MOTION.md` is a documented invariant, including `posture: static`.
- `references/motion-foundation.md`, `motion-foundation.schema.json`, and
  `motion-primitives.json` exist.
- `scripts/check-motion-foundation.cjs` distinguishes missing, invalid, and ready foundations.
- The primitive registry records clean-room provenance, reduced-motion substitutions, and runtime
  capability status.
- `motion.md` is required for non-trivial motion.
- `references/motion-spec.md` exists.
- Motion QA checks reduced motion, interruption, timing/easing, performance, and implementation library choice.
- GSAP and Anime.js are optional implementation skills with fallbacks.

Pass:

- `node --test tests/motion-foundation.test.cjs` passes.
- Missing project `MOTION.md` exits with code 2 and `synthesis-required`.
- Static and procedural foundations can both reach `ready`.
- Executable procedural content is rejected.
- `SKILL.md` references `motion.md` and `motion-spec.md`.
- `qa-checklist.md` checks implementation against `motion.md`.
- `check-deps.cjs` validates the full animation implementation group.

## 7. QA Evidence

MUST:

- `references/qa-checklist.md` exists.
- QA covers static checks, browser/visual checks, motion checks, accessibility, engineering fit, agent-readable state, scorecard, and final verdict.
- Evidence paths are recorded when checks run.

SHOULD:

- Define screenshot/video naming conventions.
- Define Playwright/browser automation commands.

Pass:

- QA checklist includes scorecard dimensions:
  - Visual taste
  - UX clarity
  - Accessibility
  - Responsiveness
  - Motion quality
  - Engineering fit
  - Performance risk

## 8. Cross-Platform Behavior

MUST:

- Self-check uses Node standard library only.
- Self-check does not hardcode Windows-only paths.
- Docs include Windows Git Bash example and portable Unix-style example.

Pass:

- `check-deps.cjs --json` runs on this machine.
- The script uses `os.homedir()` or explicit env vars for path resolution.

## 9. Repository Hygiene

MUST:

- No private paths are required for open-source usage.
- No credentials or tokens appear in docs/templates/scripts.
- Source URLs for optional companion skills are documented.
- Name-conflict policy is documented.

Pass:

- `curation-policy.md` includes conflict policy.
- `companion-skills.md` lists sources and install status.

## 10. Website-Cloning Superset Gate

MUST:

- Primary and reference target roles are distinct.
- Browser, Builder, and Evidence port contracts are documented and machine-readable.
- Exact fidelity requires independent comparison evidence.
- Missing measurements produce blocked or fidelity-limited state, not guessed values.
- Existing accessibility, motion, responsive, engineering, and headless gates remain mandatory.
- Adapted upstream workflow retains its license notice.
- External taste prompts are tracked as inert evidence; unlicensed source text is not vendored.

Pass:

- `node --test tests/website-cloning-init.test.cjs` passes.
- `node --test tests/anti-slop-review.test.cjs` passes.
- `website-cloning-manifest.schema.json` parses.
- Repository QA resolves all module references.

## 11. Release Verdict

Use this final table before publishing:

| Gate | Result | Evidence |
| --- | --- | --- |
| Installability |  |  |
| Missing dependency behavior |  |  |
| Design-first scope |  |  |
| Artifact lifecycle |  |  |
| Headless agent readiness |  |  |
| Motion and animation readiness |  |  |
| QA evidence |  |  |
| Cross-platform behavior |  |  |
| Repository hygiene |  |  |
| Website-cloning superset |  |  |

Release statuses:

- `ready`: all MUST pass.
- `ready-with-notes`: all MUST pass, SHOULD gaps documented.
- `not-ready`: one or more MUST checks fail.

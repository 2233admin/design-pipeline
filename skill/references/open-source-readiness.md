# Open Source Readiness

This is the release gate for publishing `design-pipeline`.

The project is ready to open source only when all `MUST` checks pass. `SHOULD` checks may be documented as known gaps.

## 1. Installability

MUST:

- `SKILL.md` exists at the skill root.
- The skill has valid frontmatter `name` and `description`.
- All referenced files exist.
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
- A user with only `design-pipeline` installed can still run the pipeline with documented fallbacks.

Pass:

- Simulated empty skill root with only `design-pipeline/SKILL.md` returns `OK`.
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

- `motion.md` is required for non-trivial motion.
- `references/motion-spec.md` exists.
- Motion QA checks reduced motion, interruption, timing/easing, performance, and implementation library choice.
- GSAP and Anime.js are optional implementation skills with fallbacks.

Pass:

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

## 10. Release Verdict

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

Release statuses:

- `ready`: all MUST pass.
- `ready-with-notes`: all MUST pass, SHOULD gaps documented.
- `not-ready`: one or more MUST checks fail.

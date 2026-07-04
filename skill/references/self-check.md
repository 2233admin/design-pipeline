# Self-Check

`design-pipeline` is intended to be open-source friendly. It must not assume every user has the same companion skills installed.

Run from the target project root:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

On Windows Git Bash:

```bash
node /c/Users/Administrator/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

For CI or machine-readable output:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json
```

## Environment

The script checks skills under:

1. `CODEX_SKILLS_DIR`, if set.
2. `$CODEX_HOME/skills`, if set.
3. `~/.codex/skills`.

Override the skill root for tests or non-standard installs:

```bash
CODEX_SKILLS_DIR=/path/to/skills node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

## Result Meaning

- `FAIL`: a required item is missing. The pipeline itself is not installed correctly.
- `WARN`: an enhancement skill is missing. Continue with the documented fallback.
- `INFO`: a repo surface such as OpenSpec or GBrain was not detected. Continue with `design/changes/<change-id>/`.
- `OK`: installed or detected.

## Dependency Levels

Required:

- `design-pipeline`

Enhancement:

- Visual taste skills
- Motion design skills

Optional:

- GSAP / Anime.js implementation skills
- Vercel / Next.js engineering skills
- Matt Pocock development skills
- OpenSpec / GBrain repo surfaces

Missing optional skills should not block a pipeline run. Record the fallback in `qa.md`.

## Motion Documentation Rule

Missing animation companion skills does not remove the need for motion documentation.

Create `motion.md` from `references/motion-spec.md` whenever the change includes:

- GSAP or Anime.js.
- React view transitions.
- Scroll-triggered animation.
- Route/page transitions.
- Multi-step choreography.
- Loading, success, error, hover, focus, or gesture motion that affects user understanding.

If all animation skills are missing, still write `motion.md` and implement with CSS or the project's existing animation library.

## Headless Agent Rule

Every change folder must include:

- `state.json`
- `events.jsonl`
- `handoff.md`

These files are required even when the run is interactive. They are the interface that lets another AI agent resume without access to the original conversation or UI.

## Open Source Release Rule

Before publishing `design-pipeline`, validate against `references/open-source-readiness.md`.

`check-deps.cjs` proves installability and dependency fallback behavior. It does not replace the full open-source readiness gate.

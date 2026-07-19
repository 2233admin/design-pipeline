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

1. `DESIGN_PIPELINE_SKILL_ROOTS`, if set. Use the platform path delimiter for multiple roots (`;` on Windows, `:` on POSIX).
2. `CODEX_SKILLS_DIR`, if set. It also accepts multiple roots using the platform path delimiter.
3. `$CODEX_HOME/skills`, if set.
4. `~/.codex/skills`.

Override the skill root for tests or non-standard installs:

```bash
CODEX_SKILLS_DIR=/path/to/skills node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

Multiple roots on Windows:

```powershell
$env:DESIGN_PIPELINE_SKILL_ROOTS="$HOME\.codex\skills;$HOME\.agents\skills"
node "$HOME\.codex\skills\design-pipeline\scripts\check-deps.cjs" --json
```

## Result Meaning

- `FAIL`: a required item is missing. The pipeline itself is not installed correctly.
- `WARN`: an enhancement skill is missing, or an installed capability profile is stale. Continue with the documented fallback.
- `INFO`: a repo surface such as OpenSpec or GBrain was not detected. Continue with `design/changes/<change-id>/`.
- `OK`: installed or detected.

## Dependency Levels

Required:

- `design-pipeline`
- Website-cloning workflow, component contract, manifest schema, and initializer bundled with the skill

Enhancement:

- Visual taste skills
- Motion design skills

Optional:

- GSAP / Anime.js implementation skills
- Vercel / Next.js engineering skills
- Matt Pocock development skills
- OpenSpec / GBrain repo surfaces

Missing optional skills should not block a pipeline run. Record the fallback in `qa.md`.

## Capability Profiles

Install status and capability compatibility are separate checks. The machine-readable source is `references/companion-capabilities.json`, which can describe a single skill or a suite of related skills.

The first versioned profile is Anime.js v4.5. When `animejs` is installed, the self-check looks for markers covering the v4 API, layout, text, scroll, draggable, scope, WAAPI, adapters, Three.js/3D stagger, and deterministic jitter/seed.

Registry profiles, requirements, and regular expressions are validated before any compatibility
result is emitted. Invalid registry structure is a hard self-check failure because treating it as a
missing marker could produce a false compatibility result.

- `OK`: the installed skill advertises the current profile.
- `WARN`: the skill exists but one or more capability markers are missing.
- `INFO`: the optional skill is not installed, so the profile was not evaluated.

A profile warning does not fail the pipeline. Read `references/capability-routing.md`, use the official upstream documentation for the missing surface, and record the fallback in `qa.md`.

## Synchronous Feedback Capture

To write each installed stale profile as a local observation and Issue draft:

```powershell
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json --record-feedback
```

Use `--feedback-root <path>` when the feedback queue should belong to a different target root.

This is an explicit local side effect. It writes `.design-pipeline/feedback/`, redacts common secrets and machine-specific paths, and deduplicates repeated findings. It never creates a remote Issue or PR. Read `references/feedback-loop.md` before publication.

Browser, Builder, and Evidence adapters are runtime capabilities, not installation-time companion skills. Missing adapter capability does not fail the package self-check, but it must block an `exact` website-cloning run or downgrade it to `fidelity-limited` with user acceptance.

## Website-Cloning Port Rule

Before an exact website-cloning run:

- Resolve BrowserPort capabilities for deterministic capture and interaction discovery.
- Resolve BuilderPort capabilities for bounded edits and project checks.
- Resolve EvidencePort capabilities for independent visual, content, layout, responsive, and interaction comparison.
- Record adapter ids and capabilities in `website-cloning.json`.

Do not claim pixel-perfect or 1:1 fidelity when any required port remains unresolved or degraded.

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

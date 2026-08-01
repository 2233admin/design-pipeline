# Self-Check

`design-pipeline` is intended to be open-source friendly. It must not assume every user has the same companion skills installed.

Run from the target project root:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs
```

On Windows Git Bash:

```bash
node "$HOME/.codex/skills/design-pipeline/scripts/check-deps.cjs"
```

For CI or machine-readable output:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-deps.cjs --json
```

Dependency self-check and project foundation validation are separate. Before implementation, also
run:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-design-foundation.cjs --project-root . --json
node ~/.codex/skills/design-pipeline/scripts/check-motion-foundation.cjs --project-root . --json
```

Only `ready` from both foundation checks unlocks implementation. `synthesis-required` exits with
code 2 so a host can route into requirements-driven design or motion synthesis without confusing a
missing file with an invalid one.

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
- `synthesis-required`: project `DESIGN.md` is missing; run design synthesis before implementation.
- `synthesis-required`: project `MOTION.md` is missing; synthesize the reusable motion language
  from requirements and `references/motion-foundation.md`.
- `OK`: installed or detected.

## Dependency Levels

Required:

- `design-pipeline`
- Website-cloning workflow, component contract, manifest schema, and initializer bundled with the skill
- Palette evidence schema and foundation checker bundled with the skill
- Motion foundation guide, schema, primitive registry, and checker bundled with the skill

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

Every project has root `MOTION.md`, including projects with `posture: static`. Validate it with:

```bash
node ~/.codex/skills/design-pipeline/scripts/check-motion-foundation.cjs --project-root . --json
```

Create change-level `motion.md` from `references/motion-spec.md` whenever the change includes:

- GSAP or Anime.js.
- React view transitions.
- Scroll-triggered animation.
- Route/page transitions.
- Multi-step choreography.
- Loading, success, error, hover, focus, or gesture motion that affects user understanding.

Change `motion.md` records the validated foundation hash and selected primitive IDs. If all
animation skills are missing, still write it and implement with CSS or the project's existing
animation library.

## Reference Source Rule

Resolve the reference source at Stage 0, while acting on it is still cheap. A pending source is a
Stage 0 finding, not a gate-review surprise.

At Stage 0, for every visual reference:

- check that the source resolves to a file path;
- when it does not, ask the user for one and state that the path unlocks rectification, camera
  calibration, landmark error, and the fidelity receipt;
- when no path arrives, record `source.availability: pending` with `pendingReason` and
  `requestedFrom`, then continue the run;
- report the pending state and the unlock action in the same turn it is discovered, and again in the
  final report.

A pending source blocks the measured geometry and final stages. It does not block the graybox gate,
and it never changes requested or effective fidelity. Missing measurements stay missing; do not fill
a path, dimension, or hash to make a gate pass.

What a pending source does block is a *measured* graybox comparison
(`graybox-comparison-unmeasurable`), and so does every other state in which no readable raster was
consulted: a change with no `reference-evidence.json` (`reference-source-unrecorded`), a document
that declares no `source` (`reference-source-undeclared`), a resolved source that names no path
(`reference-source-path-undeclared`), a path that escapes the change root
(`reference-source-raster-uncontained`), a path that names no file
(`reference-source-raster-missing`), a path that is not a regular file or whose bytes cannot be read
(`reference-source-raster-unreadable`), bytes carrying no PNG signature
(`reference-source-not-raster`), and a PNG whose IHDR width and height cannot be read
(`reference-source-raster-truncated`). Existence was never the test: the gate reads the first 24
bytes and requires a PNG signature and readable dimensions, so a text file renamed to `.png` no
longer supports a measured claim. The graybox gate itself is still reachable in every one of them -
declare `comparison.mode: qualitative`, which is the honest description of a comparison with no
source to measure against, and the stage can reach `ready` without ever claiming fidelity evidence.

A `measured` comparison is also blocked when the capture predates the source it claims to have
measured. When the document records `source.resolvedAt`, a `graybox.capturedAt` earlier than it is
`graybox-capture-predates-source`; re-run the capture rather than re-labelling it. A `capturedAt`
that will not parse is `graybox-capture-uncomparable`, never counted as fresh. An absent `resolvedAt`
is the legacy default and is not compared. A `resolvedAt` that is present but is not an ISO 8601
timestamp (`reference-source-resolved-at-invalid`), or that is recorded beside
`availability: pending` (`reference-source-resolved-at-contradictory`), blocks every stage: a
declaration the contract cannot read is not evidence about when the source arrived.

A pending source also does not block optical treatment. The graybox gate blocks materials, glow,
bloom, depth of field, scanlines, and grading; the geometry gate blocks detail geometry, type
treatment, and any measured fidelity claim. When the graybox stage is `ready` and geometry is
blocked on the source, continue - the run proceeds as an unverified reconstruction.

## Verification Claim Rule

No contract field carries the claim, so record it on one line in `qa.md`, under
`## Reference And Spatial Routing`:

```markdown
- Verification claim: `unverified`
```

The claim has three values and one derivation. Run
`designer-pipeline reconstruction check --stage final` and read the whole result it returns - its
top-level status **and** every entry in its `stages` map, which that single invocation already
reports:

- `verified` when the top-level status is `ready` **and** every reported stage is `ready`;
- `fidelity-limited` when the top-level status is `fidelity-limited` and no reported stage is
  `blocked`, meaning the measurements are real and miss a threshold;
- `unverified` for everything else.

The top-level status is not the derivation on its own. The stages are independent by design, so a
`final` stage can report `ready` beside a `blocked` `stages.graybox`, and reading only the top-level
status would record `verified` for a run whose graybox gate refused its evidence.

Only the complete output of that `--stage final` run is evidence for the claim. `reconstruction
check` defaults to `--stage geometry`, so the command run without `--stage` returns a
geometry-scoped result, and neither that result, nor an explicit `--stage geometry` or
`--stage graybox` run, nor a single `stages.graybox` or `stages.geometry` entry lifted out of any
result, may be cited as evidence for `verified`. A stage-scoped status answers only for the stage
that was asked for. When the `--stage final` result is missing, unreadable, or incomplete, the claim
is `unverified`; a gate whose output cannot be read in full has not verified anything.

Nothing outside that one result is an input, and the familiar cases arrive at `unverified` through a
stage rather than through a separate rule:

- a pending source blocks the geometry stage, and the final stage returns the geometry result;
- an unreadable source declaration blocks the same stages with the reason that names the fault:
  `reference-source-unparseable`, `reference-source-malformed`, or
  `reference-source-availability-invalid`;
- a source that no document records, or a document that declares no `source`, blocks the graybox
  stage as soon as its comparison claims `measured`: `reference-source-unrecorded` or
  `reference-source-undeclared`;
- a declared source whose bytes are not a readable PNG, and a `measured` capture taken before the
  source resolved, block the same stage with the reason from the Reference Source Rule that names
  the actual state;
- a change with no `reconstruction.json` produces no result to read, so nothing can reach `verified`.

`unverified` may never be reported as verified, exact, identical, 1:1, pixel-perfect, faithful, or
complete. A `qualitative` graybox that reached `ready` does not raise the claim: it proves ordering
discipline, not equivalence. Do not substitute a default, a placeholder, or a declaration for the
measurement that is missing.

## Headless Agent Rule

Every change folder must include:

- `state.json`
- `events.jsonl`
- `handoff.md`

These files are required even when the run is interactive. They are the interface that lets another AI agent resume without access to the original conversation or UI.

## Open Source Release Rule

Before publishing `design-pipeline`, validate against `references/open-source-readiness.md`.

`check-deps.cjs` proves installability and dependency fallback behavior. It does not replace the full open-source readiness gate.

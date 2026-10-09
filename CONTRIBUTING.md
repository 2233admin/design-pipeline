# Contributing

`design-pipeline` is a design-first project. Contributions should improve UI, UX, motion, accessibility, design systems, frontend implementation fidelity, QA evidence, or agent-readable design workflow state.

It is not a general-purpose agent skill marketplace.

## Before Opening A PR

1. Read `openspec/config.yaml`; OpenSpec injects its context and artifact-specific rules when generating instructions.
2. Read `skill/references/curation-policy.md`.
3. For repository behavior changes, create an OpenSpec change under `openspec/changes/<change-id>/`.
4. If the change came from a downstream observation, link its `dpf-*` id and remove private evidence before publication.
5. Before selecting the publication worktree base or freezing full QA, fetch the intended PR target and review both branch histories and the three-dot PR diff. Replace `<target-branch>` with the actual target, such as `main`:

```bash
git fetch origin
git log --left-right --oneline origin/<target-branch>...HEAD
git diff --stat origin/<target-branch>...HEAD
```

Reconcile incoming target changes and dependent commits with the intended PR scope before freezing the implementation.

6. Record the implementation commit (`git rev-parse HEAD`) and tested Git tree (`git rev-parse 'HEAD^{tree}'`) in the change's verification record. Keep implementation bytes frozen during full QA, then run:

```bash
npm ci
npm test
npm run specs:check
```

7. If later integration or implementation changes the tested tree, record fresh verification separately. Earlier full-QA results cover only their recorded revision; focused checks of the integrated tree do not become a full-QA pass.

The private root npm workspace requires Node.js 22.12+ and locks the maintenance dependencies for
`evals/cases` and `tools/browser-automation`; it is not part of the packaged skill or downstream
project dependencies. `npm test` runs `scripts/qa.cjs` and the browser-tool self-tests. Do not use
bare `node --test`, which discovers nested upstream fixtures. Use `npm run browser:install` to
prepare Playwright Chromium and the HyperFrames browser.

Font-subset regressions also need Python with `fonttools==4.66.1`. Set `HUASHU_PYTHON` to
that environment's Python executable, or make it available as `python` on PATH. CI and release
jobs prepare an isolated environment; no global Python package installation is required.

The root `package.json` is the source of truth for maintenance commands:

| Command | Purpose |
| --- | --- |
| `npm run deps:check` | Report available workspace dependency updates. |
| `npm run specs:check` | Run strict OpenSpec validation for the repository. |
| `npm run capabilities:check` | Audit existing source-evidence; missing evidence remains `UNKNOWN`, with no network refresh. |
| `npm run sources:check` | Verify locked source snapshots and their existing checks. |
| `npm run sources:import:mengto -- --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import a reviewed local MengTo revision. |
| `npm run sources:import:iart -- --source-root <checkout-directory> --reviewed-at YYYY-MM-DD` | Import reviewed local iArt checkouts. |
| `npm run sources:import:designmd -- --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import a reviewed local DESIGN.md revision. |
| `npm run sources:import:goodcss -- --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import the complete reviewed good-css Git tree. |
| `npm run sources:import:taste -- --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import the complete reviewed Taste-Skill Git tree. |
| `npm run sources:import:film -- --name <cinetic\|product-film-skill> --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import one complete reviewed film-method Git tree. |
| `npm run sources:import:gepa -- --source <clean-checkout> --reviewed-at YYYY-MM-DD` | Import the complete official GEPA source skill and metadata from its reviewed revision. |
| `npm run test:browser` | Run browser-tool self-tests. |
| `npm run package:skill` / `npm run install:skill -- --root <skills-root> --target <skill-target>` | Build or locally install the skill. |

Imports require a local checkout at the deliberately selected revision. `sources:check` validates
already locked snapshots; it does not update them, and recomputing a manifest hash is not a source
refresh. The owned runtime pins are GSAP 3.15.0, HyperFrames 0.8.137, Playwright 1.63.0 and
pixelmatch 8.0.0. Comparison v1 reports now identify the installed pixelmatch version, OKLab/HyAB
metric and actual options. Scores from v7 require recalibration before comparison with v8. Do not
regenerate or re-approve existing golden HTML or video as part of a dependency refresh.

For a local Blender install, `.env.local` may set `BLENDER_PATH=<path-to-blender.exe>` for QA; an
externally set environment variable takes precedence. Keep machine-specific paths in that ignored
file only. QA resolves Chrome through the shared resolver and passes it into its isolated test run.

## Reporting A Pipeline Or Companion Gap

Use the bundled recorder to create a local, redacted, deduplicated draft:

```powershell
node skill/scripts/record-feedback.cjs `
  --kind companion-gap `
  --source user `
  --skill <skill-name> `
  --title "<short title>" `
  --summary "<what happened and why it matters>" `
  --evidence "<reproducible evidence>"
```

Review the generated `.design-pipeline/feedback/drafts/` file before opening an Issue. The script does not publish remotely. Use the **Pipeline observation** template and include the `dpf-*` id. Bug reports and skill intake use their own templates; blank issues are disabled.

## Change Types

Use a verb-led `change-id`:

- `add-motion-evidence-standard`
- `update-self-check-registry`
- `refactor-agent-interface`
- `remove-duplicate-skill-source`

Each change should include:

```text
openspec/changes/<change-id>/
  proposal.md
  tasks.md
  design.md              # when structure, architecture, or workflow changes
  specs/<capability>/spec.md
```

Use the workspace-pinned [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI with
`npm exec -- openspec <command>`; validate with `npm run specs:check`. To upgrade the CLI, review a
specific version, install it exactly with `npm install -D -E @fission-ai/openspec@<reviewed-version>`,
then run `npm exec -- openspec update` to refresh already configured local agent integrations. For a
fresh Codex checkout, use `npm exec -- openspec init --tools codex`; the generated
`.agents/skills/openspec-*` files stay local and ignored. Keep personal workflow-profile settings.
The Codex initializer replaces legacy global `opsx-*` prompts with local skills and removes the
matching old prompts after installation succeeds. Use the generated skills in configured projects.

The default workflow offers explore, propose, apply and archive actions. Artifacts can be revised
when evidence changes; the schema determines dependencies, not a requirement to repeat every phase.
Use `npm exec -- openspec status --change <change-id>` and
`npm exec -- openspec instructions <artifact> --change <change-id>`
to see what the installed schema requires. Run `npm run specs:check` before
delivery. Delta specs use `## ADDED Requirements` (or MODIFIED/REMOVED/RENAMED),
`### Requirement:` and `#### Scenario:`. Put detailed examples in scenarios and keep requirement
statements below 500 characters. Completed checkboxes do not authorize archival: verify results and
review first. Archived changes remain historical records.

The repository's OpenSpec requirement governs development of this tool. Installing the skill or
using one drawing, text or image helper in another project does not impose this contributor workflow.

## Skill Intake Policy

Do not add a GitHub skill repo just because it exists.

Every external skill source must be classified as:

- `accepted`
- `accepted-optional`
- `rejected-duplicate`
- `rejected-out-of-scope`
- `watchlist`

Use `skill/references/curation-policy.md` for the full criteria.

Add accepted compatibility knowledge to `skill/references/companion-capabilities.json`. Keep marker changes source-backed and add a deterministic checker test. Avoid adding new hard-coded companion arrays to `check-deps.cjs`.

## Quality Bar

Pull requests must preserve:

- Optional dependency fallback behavior.
- Headless agent state via `state.json`, `events.jsonl`, and `handoff.md`.
- Motion documentation requirements for non-trivial animation.
- OpenSpec-aligned artifacts.
- Open-source readiness gates.

## Validation

Required:

```bash
npm test
npm run specs:check
```

When touching dependency detection:

```bash
node skill/scripts/check-deps.cjs --json
```

Feedback changes must also prove redaction, deduplication, draft routing, and the no-remote-publication boundary.

When touching release criteria, review:

```text
skill/references/open-source-readiness.md
```

## Naming Conflicts

If an imported skill conflicts with an existing important skill name, rename the imported skill with a clear prefix rather than overwriting the established workflow.

Examples:

- `code-review` -> `matt-code-review`
- `tdd` -> `matt-tdd`

# Contributing

`design-pipeline` is a design-first project. Contributions should improve UI, UX, motion, accessibility, design systems, frontend implementation fidelity, QA evidence, or agent-readable design workflow state.

It is not a general-purpose agent skill marketplace.

## Before Opening A PR

1. Read `openspec/project.md`.
2. Read `skill/references/curation-policy.md`.
3. For behavior changes, create an OpenSpec-style change under `openspec/changes/<change-id>/`.
4. If the change came from a downstream observation, link its `dpf-*` id and remove private evidence before publication.
5. Run:

```bash
node scripts/qa.cjs
```

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

Review the generated `.design-pipeline/feedback/drafts/` file before opening an Issue. The script does not publish remotely.

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
node scripts/qa.cjs
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

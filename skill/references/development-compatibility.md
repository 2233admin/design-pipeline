# Development Compatibility

This pipeline should cooperate with existing development planning systems instead of creating competing artifacts.

## OpenSpec / OpenSpece

Detect first:

- `openspec/`
- `.openspec/`
- `specs/`
- `spec/changes/`
- `changes/`
- `docs/specs/`

If an OpenSpec-style system exists:

- Use the active change id as the `design-pipeline` change id.
- Link `brief.md`, `directions.md`, `design.md`, `tasks.md`, and `qa.md` from the active OpenSpec change when possible.
- Do not duplicate acceptance criteria. Mirror them into the design artifacts only when needed for implementation.
- Treat OpenSpec proposal/tasks/spec deltas as the product contract; `design-pipeline` adds visual, UX, motion, accessibility, and frontend QA detail.
- Archive according to the repo's OpenSpec convention after implementation.

If no OpenSpec system exists:

- Use `design/changes/<change-id>/` as the default artifact root.
- Keep the artifact structure easy to migrate into OpenSpec later.

## GBrain

Detect first:

- `.gbrain/`
- `gbrain/`
- GStack/GBrain scripts such as `gstack-gbrain-detect`, `gstack-gbrain-sync`, or `sync-gbrain`
- Project docs mentioning GBrain memory, sync, sources, or write surfaces.

If GBrain exists:

- Treat GBrain as the long-lived memory layer, not as the working change folder.
- Keep active implementation artifacts in the repo, then sync or reference stable decisions through the repo's GBrain mechanism.
- Store stable decisions only: selected visual direction, tokens, reusable component patterns, motion rules, accessibility decisions, and QA outcomes.
- Do not push transient brainstorms, rejected directions, or raw screenshot dumps into GBrain unless the repo already does that.

If GBrain is only available globally but not enabled in the repo:

- Do not initialize it automatically.
- Record GBrain compatibility notes in `qa.md` or `design.md` only when useful.

## gstack-style feedback lifecycle

When gstack is installed, its learning, spec, review, and ship surfaces can strengthen the pipeline:

- learning preserves durable patterns after a finding is resolved;
- spec converts an accepted observation into a backlog-ready Issue;
- review checks the implementation and evidence independently;
- ship creates or updates a PR only after the user explicitly requests publication.

The bundled `record-feedback.cjs` remains the portable fallback. Do not copy raw user evidence into gstack learnings. Preserve only the durable, redacted rule.

## Matt Pocock Skills

Installed Matt skills should be used as engineering lenses around the design work:

- `codebase-design`: map the current architecture before major UI changes.
- `grill-with-docs`: challenge implementation plans against docs and constraints.
- `implement`: execute the scoped code changes when a plan is ready.
- `matt-tdd`: use when the UI behavior needs test-first coverage.
- `matt-code-review`: review implementation choices without replacing the normal project review gate.
- `domain-modeling`: use when UI work exposes unclear domain language or workflow states.
- `to-prd` / `to-issues`: convert design intent into product or issue artifacts when needed.
- `design-an-interface`: use for interface ideation, especially before committing to one direction.

Some Matt skills were installed with a `matt-` prefix to avoid collisions with existing local skills:

- `matt-ask-matt`
- `matt-code-review`
- `matt-diagnosing-bugs`
- `matt-qa`
- `matt-tdd`
- `matt-triage`

Prefer existing local OMX/GStack skills when their names conflict; use the `matt-*` versions when specifically applying Matt Pocock's workflow.

## Artifact Mapping

| design-pipeline artifact | OpenSpec-style equivalent | GBrain handling |
| --- | --- | --- |
| `brief.md` | proposal / requirements | Sync only final product intent |
| `directions.md` | design alternatives | Usually keep repo-local only |
| `design.md` | design / spec delta | Sync final decisions |
| `tasks.md` | tasks checklist | Sync only completed durable milestones |
| `qa.md` | validation / verification notes | Sync final QA summary and reusable rules |
| `.design-pipeline/feedback/observations/*.json` | detected reusable gaps | Link accepted findings to the active change |
| `.design-pipeline/feedback/drafts/*.md` | local Issue/PR proposals | Publish only through an authorized remote workflow |

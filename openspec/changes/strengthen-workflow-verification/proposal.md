# Proposal

## Why

An agent can record delivery before completing the workflow, reuse an old accepted draft, or reuse a check after its input changes without a newer file timestamp. The user asked to borrow pstack's engineering and real-artifact verification methods to improve this tool; these concrete gaps are the first implementation slice.

## What Changes

- Bind existing workflow gate records to the bytes of the actual checked inputs; missing or changed inputs reopen the check.
- Bind draft acceptance and standard delivery to the current check snapshot, preserving rejection history and visual acceptance boundaries.
- Refuse premature delivery and require film/edit delivery files to exist inside the project.
- Reuse the film checker's existing render selection, so workflow progress refers to the video actually checked.
- Extend the existing QA guide with a short, executable verification method: launch, doctor, drive, evidence, cleanup and failure recovery. Link it from the skill entry.
- **BREAKING** Timestamp-only cached passes and unbound legacy draft/delivery decisions remain readable but need fresh verification before they can advance a complete deliverable. UI's legacy `work -> deliver` declaration remains available and never grants visual acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: Current workflow verification, draft review, delivery prerequisites, and agent-facing verification guidance.

## Impact

Existing `workflow-core.cjs`, `workflows/shared.cjs`, film/edit/web workflow modules, `cli-core.cjs`, and `film-project-core.cjs`; existing workflow regression tests; `SKILL.md`, `qa-checklist.md`, workflow stage guidance and package required resources. Reuse existing v1 workflow state, v2 native state/events, artifacts, gates, receipts and CLI exit codes. No new dependency, runner, provider, gate schema, model configuration or Cursor installation.

Method references are pstack's [Prove It Works](https://github.com/cursor/plugins/blob/d0ef80d86795816da932a153458c5dbe192d294e/pstack/skills/principle-prove-it-works/SKILL.md) and [Create verification skill](https://github.com/cursor/plugins/blob/d0ef80d86795816da932a153458c5dbe192d294e/pstack/skills/create-verification-skill/SKILL.md). This change adapts their principles to existing public commands; it does not import their source or promise a complete pstack integration.

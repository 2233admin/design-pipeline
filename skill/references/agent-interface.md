# Agent Interface

`design-pipeline` must support unattended execution. A human should not need to watch the UI or read the conversation transcript to understand the current state.

Every pipeline change folder should expose these files:

```text
state.json
events.jsonl
handoff.md
```

These files are the AI-facing interface. Another agent can inspect, resume, verify, or archive a run by reading them first.

## `state.json`

Machine-readable current state. Keep it compact and update it at every phase transition.

```json
{
  "schema": "design-pipeline.state.v1",
  "changeId": "",
  "status": "planned",
  "phase": "stage-0-repo-read",
  "updatedAt": "",
  "artifactRoot": "",
  "projectRoot": "",
  "surfaces": [],
  "capabilities": {
    "missing": [],
    "fallbacks": [],
    "feedback": "available"
  },
  "openSpec": {
    "detected": false,
    "changeId": "",
    "paths": []
  },
  "gbrain": {
    "detected": false,
    "syncPlanned": false,
    "paths": []
  },
  "motion": {
    "required": false,
    "motionSpec": "",
    "implementationLibrary": "",
    "reducedMotion": "unknown"
  },
  "qa": {
    "status": "not-run",
    "evidenceRoot": "",
    "scores": {}
  },
  "designFoundation": {
    "path": "DESIGN.md",
    "status": "synthesis-required",
    "sha256": null
  },
  "designSynthesis": {
    "manifest": "",
    "status": "",
    "stage": "",
    "output": "DESIGN.md"
  },
  "decisions": [],
  "blockers": [],
  "nextActions": []
}
```

Allowed `status` values:

- `planned`
- `in-progress`
- `blocked`
- `needs-review`
- `complete`
- `archived`

Allowed `phase` values:

- `stage-0-repo-read`
- `stage-1-brief`
- `stage-2-directions`
- `stage-3-design-spec`
- `stage-3-motion-spec`
- `stage-4-tasks`
- `stage-5-implementation`
- `stage-6-gate-review`
- `stage-7-archive`

## `events.jsonl`

Append-only event log. Each line is JSON.

```json
{"ts":"","phase":"","type":"decision","summary":"","files":[],"evidence":[],"nextActions":[]}
```

Common event types:

- `self-check`
- `artifact-created`
- `interaction-required`
- `interaction-completed`
- `decision`
- `scope-surprise`
- `wayfinder-linked`
- `design-validated`
- `implementation-resumed`
- `fallback-selected`
- `implementation-step`
- `qa-evidence`
- `feedback-recorded`
- `feedback-accepted`
- `feedback-resolved`
- `blocker`
- `state-repair`
- `handoff`
- `archive`

Rules:

- Append; do not rewrite history unless removing secrets.
- Keep event summaries short.
- Reference files by repo-relative path.
- Include evidence paths whenever verification happened.

## `handoff.md`

Human- and agent-readable resume note. Keep it current enough that another agent can continue without conversation history.

```md
# Handoff

## Current State

- Change id:
- Status:
- Phase:
- Last updated:

## Goal

## Artifacts

- Brief:
- Directions:
- Design:
- Motion:
- Tasks:
- QA:
- State:
- Events:

## Decisions

## Missing Capabilities / Fallbacks

## Evidence

## Blockers

## Next Actions
```

## Resume Protocol

When another agent resumes:

1. Read `state.json`.
2. Read the last 20 lines of `events.jsonl`.
3. Read `handoff.md`.
4. Read only the artifact files referenced by current `phase` and `nextActions`.
5. Continue from `nextActions`; do not restart discovery unless state is stale or contradictory.

When `designSynthesis` is present, read its manifest before the phase artifact. A run waiting at
`grill-with-docs` or `wayfinder` is intentionally interactive; do not answer the user's unresolved
decision or fabricate a tracker artifact in order to advance it.

`designFoundation.status` is `synthesis-required`, `invalid`, or `ready`. Stage 5 implementation is
valid only when it is `ready` and its hash matches the project `DESIGN.md`.

## Staleness

State is stale when:

- `state.json.updatedAt` predates modified implementation files.
- `handoff.md` disagrees with `state.json`.
- `events.jsonl` has no event for the current phase.
- QA evidence paths no longer exist.

If stale, append a `blocker` or `state-repair` event before continuing.

## Secret Handling

Never write secrets, tokens, cookies, private credentials, or raw proprietary data into these files. Reference secure locations indirectly when necessary.

- Redact tokens, credentials, private URLs, authenticated headers, and machine-specific paths.
- Use `record-feedback.cjs` for contribution evidence so common secret patterns and local paths are redacted before draft creation.
- Do not copy raw browser cookies, proprietary source, or private screenshots into Issue or PR drafts.

# Design: observation-to-contribution loop

## Flow

```text
Observe -> Normalize -> Redact -> Deduplicate -> Draft -> Review -> Publish -> Learn
```

The first five steps are local and deterministic. `Publish` is never implicit.

## Companion registry

`skill/references/companion-capabilities.json` becomes the update surface for:

- install groups and fallbacks;
- project-surface discovery;
- capability profiles and their source references;
- marker requirements across one skill or a suite of skills.

The checker compiles registry regex patterns at runtime. A profile reports:

- `INFO` when none of its optional skills are installed;
- `WARN` when a suite is partially installed or lacks advertised capability markers;
- `OK` when every required capability marker is present.

The overall pipeline remains usable when optional profiles warn.

## Feedback artifacts

`record-feedback.cjs` writes under `.design-pipeline/feedback/` by default:

```text
observations/<fingerprint>.json
drafts/<fingerprint>-issue.md
index.json
```

The fingerprint is derived from normalized kind, skill, and title. Repeated detections increment `occurrences`, merge unique evidence, and update `lastSeenAt`.

Before writing, the recorder:

- replaces project and home paths with stable placeholders;
- redacts common tokens, authorization headers, and credential-bearing URLs;
- removes control characters;
- validates enumerated fields and required text.

## Contribution routing

`auto` defaults to an Issue draft because a finding is not proof that a patch is ready. A PR draft must be requested explicitly and should include changed files plus validation evidence.

The bundled script does not call GitHub. The reference workflow hands reviewed drafts to an installed GitHub/ship surface only after explicit user authorization.

## Self-hosting

Pipeline maintainers use the same loop:

1. run self-check and QA;
2. record new gaps;
3. create an OpenSpec change;
4. update registry, docs, code, and tests;
5. run review and package QA;
6. convert the resolved observation to a PR-ready draft;
7. publish only when authorized;
8. preserve a durable learning and close or supersede the observation.

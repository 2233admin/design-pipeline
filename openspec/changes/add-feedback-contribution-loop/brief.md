# Brief

## Goal

Make `design-pipeline` continuously detect companion-skill and pipeline gaps, capture them as durable evidence, and prepare reviewable Issue or PR drafts without silently publishing anything.

## Audience

- Designers and engineers running the pipeline in downstream repositories.
- Maintainers updating the pipeline and its companion-skill compatibility.
- AI agents resuming a pipeline run without the original conversation.

## Constraints

- Keep design outcomes as the product boundary.
- Add no runtime dependency.
- Record findings synchronously when they are detected; do not install a daemon.
- Redact secrets and machine-specific paths before contribution artifacts are written.
- Require explicit authority before any remote Issue, PR, push, or comment.
- Keep optional companion skills non-blocking.

## Non-Goals

- Automatically edit third-party skills.
- Continuously poll GitHub or package registries.
- Publish remote Issues or PRs during normal self-check.
- Replace gstack, GitHub, OpenSpec, or the host's review/ship workflow.

## Acceptance Checks

- Companion capability profiles are data-driven and cover more than Anime.js.
- Self-check can synchronously record a stale capability as a deduplicated observation.
- Observations produce redacted, reviewable Issue or PR drafts.
- Duplicate findings update occurrence evidence instead of creating draft spam.
- The maintainer loop dogfoods the same artifact, review, QA, and contribution gates.
- Repository QA, tests, packaging, installed self-check, and code-intel gates pass.

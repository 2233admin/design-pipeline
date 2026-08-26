# HyperFrames Requirements

## Requirement: HyperFrames is a bounded video route

The pipeline SHALL route HyperFrames only for explicit HTML-video deliverables or explicit
HyperFrames capabilities. Ordinary interface animation SHALL remain on the normal motion route.

### Scenario: ordinary UI motion

Given a dashboard brief with hover animation, the resolver SHALL NOT select the HyperFrames route.

### Scenario: video deliverable

Given a brief for a video, reel, motion graphic, explainer, captions, or title card, the resolver
SHALL expose the governed HyperFrames route with its source, revision, license, requirements, and
fallback.

## Requirement: deterministic composition gate

When HyperFrames is selected, the pipeline SHALL preserve the HTML source-of-truth, one paused
seekable timeline, deterministic frame-time, check-before-preview, approval-before-render, and
non-empty output verification rules in the bundled route reference.

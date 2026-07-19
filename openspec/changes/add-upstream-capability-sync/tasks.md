# Tasks

## Phase 1: contracts and fixtures

- [x] Define source-evidence, audit-snapshot, publication-request, and publication-receipt schemas.
- [x] Extend registry validation for optional source identity and freshness metadata.
- [x] Add malformed/null contract fixtures and fail-closed tests.

## Phase 2: local capability audit

- [x] Add a standalone audit command without coupling it to normal self-check.
- [x] Compare installed and externally retrieved evidence deterministically.
- [x] Route `STALE` and `CHANGED` findings through the existing feedback recorder.
- [x] Keep missing retrieval evidence explicit as `UNKNOWN`, never silently current.

## Phase 3: authorized contribution bridge

- [x] Generate Issue and PR publication requests with deterministic idempotency keys.
- [x] Require changed files and validation for PR requests.
- [x] Validate host receipts and reconcile published URLs/states into observations.
- [x] Prove duplicate publication attempts are idempotent.

## Phase 4: scale and self-hosting

- [x] Add tracked source metadata for Anime.js, GSAP, Next.js, visual, motion, and workflow profiles.
- [x] Document host adapter responsibilities for GitHub, browser, and evidence retrieval.
- [x] Exercise the audit against the design-pipeline repository itself.
- [x] Run tests, installed self-check, packaging, code-intel, and independent review.

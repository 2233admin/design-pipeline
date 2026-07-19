# Tasks

## Phase 1: contracts and fixtures

- [ ] Define source-evidence, audit-snapshot, publication-request, and publication-receipt schemas.
- [ ] Extend registry validation for optional source identity and freshness metadata.
- [ ] Add malformed/null contract fixtures and fail-closed tests.

## Phase 2: local capability audit

- [ ] Add a standalone audit command without coupling it to normal self-check.
- [ ] Compare installed and externally retrieved evidence deterministically.
- [ ] Route `STALE` and `CHANGED` findings through the existing feedback recorder.
- [ ] Keep missing retrieval evidence explicit as `UNKNOWN`, never silently current.

## Phase 3: authorized contribution bridge

- [ ] Generate Issue and PR publication requests with deterministic idempotency keys.
- [ ] Require changed files and validation for PR requests.
- [ ] Validate host receipts and reconcile published URLs/states into observations.
- [ ] Prove duplicate publication attempts are idempotent.

## Phase 4: scale and self-hosting

- [ ] Add tracked source metadata for Anime.js, GSAP, Next.js, visual, motion, and workflow profiles.
- [ ] Document host adapter responsibilities for GitHub, browser, and evidence retrieval.
- [ ] Exercise the audit against the design-pipeline repository itself.
- [ ] Run tests, installed self-check, packaging, code-intel, and remote review.


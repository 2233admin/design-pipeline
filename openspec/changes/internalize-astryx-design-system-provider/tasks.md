# Tasks

## Contracts And Fixtures

- [x] Freeze strict v1 snapshot, catalog, provider profile/receipt, token projection, and decision
  schemas with valid and adversarial fixtures.
- [x] Add the built-in Astryx candidate profile with official source, MIT attribution,
  compatibility, provider API, and deny-by-default canary metadata.
- [x] Verify package manifests include every new schema, profile, script, and documentation asset.

## Catalog And Projection

- [x] Implement deterministic, side-effect-free snapshot normalization with stable IDs, hashes,
  provenance, and path/value validation.
- [x] Implement read-only catalog search by query, kind, category, and status.
- [x] Implement token projection into the existing token contract with explicit review and blocking
  loss.
- [x] Add focused checks for mutation, unstable ordering, duplicate IDs, path escape, prototype
  pollution, executable values, hash tampering, and projection collisions.

## Provider Acquisition

- [x] Implement the bundled read-only Astryx translator over an explicit contained provider CLI
  path, plus the custom local adapter boundary, for manifest, component, docs, template, and hook
  acquisition.
- [x] Enforce contained adapter/output paths, no-shell execution, bounded time/output, sanitized
  environment, exact provider/API/license validation, atomic publication, and failure receipts.
- [x] Reject automatic installation, network fetch, canary-by-default, mutating provider commands,
  `.doc.mjs` import, and instruction injection.
- [x] Add deterministic Astryx adapter fixtures and adversarial acquisition checks.

## Runtime Decision

- [x] Implement `reference`, `adopt`, `substitute`, and `custom` decisions with existing-project
  precedence, compatibility checks, intake admission, explicit canary allowance, and rejection
  evidence.
- [x] Verify no eligible candidate returns `blocked` without silent fallback.

## Public CLI

- [x] Route and document
  `design-system profiles|normalize|acquire|search|project-tokens|decide`.
- [x] Enforce the frozen flag surface, including `--provider-cli-path`, stable JSON envelope/exit
  codes, non-writing defaults, and explicit contained writes.
- [x] Verify the commands are visible in help and usable by an installed package.

## Fair Benchmark v2

- [x] Add v2 manifest/result support while retaining v1 compatibility and the
  `--manifest`/`--measurements` interface.
- [x] Require same prompts, same environment class, blind evaluation, hidden expected answers,
  fresh context, and representative delivery.
- [x] Verify fairness violations, missing required evidence, required failures, and canary mixing
  cannot produce a passing result.

## Documentation And QA

- [x] Review the provider guide against the final CLI, schemas, and installed-package behavior.
- [x] Run focused tests, full repository QA, schema/package validation, reproducible packaging,
  isolated installation, and installed CLI smoke.
- [x] Record exact commands, results, hashes, residual risks, and review evidence in `qa.md`.
- [x] Advance state through verification and release readiness only after all required evidence is
  present.

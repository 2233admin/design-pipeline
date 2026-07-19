# Proposal: harden feedback recorder v0.3.1

## Problem

Post-merge review of v0.3.0 identified four robustness boundaries:

- a nested feedback root can be partially redacted as the project root;
- programmatic callers can provide scalar values where the CLI normally provides arrays;
- corrupt observation or index JSON needs an explicit no-overwrite failure;
- invalid capability-registry regular expressions need to fail before profile evaluation.

## Outcome

Ship a patch release that preserves evidence, reports invalid state clearly, and validates registry
patterns before any compatibility result is produced.

## Remote Effects

This change may be published as v0.3.1 after QA and review. Normal pipeline execution remains
local-only and does not publish feedback automatically.

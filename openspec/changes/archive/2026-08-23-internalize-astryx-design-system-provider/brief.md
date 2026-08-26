# Brief: Internalize Astryx Design System Provider

## Problem

Agents need one safe route from a user-supplied design-system snapshot or a reviewed local Astryx
CLI adapter to searchable, attributable design evidence. Today that route is deferred, so provider
data, token conversion loss, runtime compatibility, and adoption intent cannot be recorded under
one deterministic contract.

## Outcome

Ship a provider-neutral design-system workflow in which:

1. inert snapshots normalize into stable catalogs;
2. local acquisition is explicit, bounded, and receipted;
3. token projection reports every material loss;
4. runtime choice is recorded as `reference`, `adopt`, `substitute`, or `custom`;
5. benchmark v2 compares candidates under the same fair conditions; and
6. `DESIGN.md` and `MOTION.md` remain authoritative.

## Acceptance

- The public CLI exposes
  `design-system profiles|normalize|acquire|search|project-tokens|decide`.
- Astryx appears as a built-in candidate profile with official source, MIT license, compatibility,
  supported provider API, and deny-by-default canary metadata.
- Snapshot normalization and search are pure and deterministic.
- No write occurs from normalize, token projection, or decision commands without `--write`.
- Default Astryx acquisition requires an existing, root-contained `--provider-cli-path`; custom
  acquisition requires `--adapter-path`. Both require a contained `--output-root`.
- Provider absence leaves supplied-snapshot and project-owned workflows available.
- Benchmark v2 enforces equivalent prompts, environment class, blind evaluation, hidden expected
  answers, fresh context, and representative delivery.

## Constraints

- Node built-ins only in the packaged core.
- No implicit installation, network retrieval, provider module import, or global instruction
  mutation.
- Unknown schemas, paths, provider API versions, canary status, and compatibility states fail
  closed.
- Provider output is evidence, not design authority.

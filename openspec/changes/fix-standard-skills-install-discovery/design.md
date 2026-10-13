# Design: Fix Standard Skills Install Discovery

## Decision and Context

Extend only the existing default branch of `check-deps.cjs` root selection. The decisive question is whether its installed public `--json` interface can find standard Skills CLI installations without overriding roots while still rejecting an invalid explicit root.

The current explicit branch already splits `DESIGN_PIPELINE_SKILL_ROOTS || CODEX_SKILLS_DIR` with `path.delimiter` and resolves each entry. Keep that branch unchanged. Without either nonempty setting, search:

1. `<CODEX_HOME>/skills`, or `~/.codex/skills` when `CODEX_HOME` is unset or empty.
2. `~/.agents/skills`.
3. `<cwd>/.agents/skills`.

Resolve default roots and de-duplicate them with insertion order preserved. The legacy root remains first; `CODEX_HOME` changes only that first candidate. `cwd` is the project whose check is being run, not the installed script's directory. Retain the existing `skillRoot` first-root field, full `skillRoots` field, skill lookup and resource lookup semantics.

## Alternatives and Trade-offs

| Option | Standard installation discovery | Compatibility | Complexity |
| --- | --- | --- | --- |
| Require manual root variables | Still false-negative by default | No behavior change | Low, but pushes configuration onto users |
| Add the two standard roots only to defaults (selected) | Works without configuration | Preserves legacy order and explicit isolation | One existing expression changes |
| Append defaults to explicit lists | Works, but can hide bad configuration | Breaks explicit root authority | Small code change with incorrect semantics |

No plugin-cache inference or doctor auto-repair is needed. Checks remain diagnostic; they do not install, replace or repair skills.

## Implementation Plan and Evidence Boundary

Create this proposal, design, tasks and spec delta before editing behavior. Add regression coverage at the existing installed `check-deps.cjs --json` seam, then change the default expression, installation guide and changelog.

The cheapest decisive observation is an installed-checker subprocess with isolated `HOME` and `USERPROFILE`, empty explicit root variables, and a complete standard installation. It must expose core `OK`, no missing resources, discovered companions, and exit 0. With an explicit nonexistent root it must instead expose core `FAIL` and exit 1 even though that installation remains available. Assert reported root order and de-duplication as well.

Tests reuse one complete package fixture by moving its skills directory between isolated locations, outside subprocess working directories. Each run uses the checker from that moved installation, so registry and resource lookup use installed relative paths. A required resource is temporarily moved away and restored to prove discovery does not suppress incomplete-package failures. Home isolation and fixture-relative lookup are assumptions to be exercised by integration, not runtime facts already verified here.

## Owned Assets, Compatibility and Migration

- `skill/scripts/check-deps.cjs`: extend default root selection only; no new module, flag or report shape.
- `tests/check-deps.test.cjs`: isolated installed-CLI coverage; existing multi-root coverage remains intact.
- `skill/references/installation.md`: actual default directories, override precedence, and diagnostic-only checks.
- `CHANGELOG.md`: one fixed entry, preserving unrelated staged and worktree edits.
- This change's proposal, design, tasks and `specs/design-pipeline/spec.md`: active behavior delta and honest verification tracking.

No caller, stored artifact or installation migration is required. Existing explicit configuration behaves as before. Default lookup can now find standard locations that were previously invisible; when multiple copies exist, the established first-match skill lookup still favors the legacy root. Cross-root resource matching remains unchanged. To undo the behavior change, revert only this change's root-selection edit and its associated tests and documentation; do not discard unrelated work.

## Non-Goals and Integration Ownership

No doctor repair, external installation, installer modification, plugin-cache scanning, resolver/schema redesign, canonical-spec consolidation, tickets or git commits. The integration owner runs focused tests, strict spec validation, installed-package smoke and repository QA, then updates the pending verification tasks with actual evidence. Technical results do not grant user or visual acceptance.

# Proposal: catch up with pbakaus/impeccable 4.8.2

## Why

The catalog reference `impeccable` was pinned at `9fadc41` (2026-11-02). Upstream has since moved to
`b4bff16` (2026-11-11): skill 4.8.2, ten reference files the package never mapped, and four
behaviour changes (the audit keeps its report, the audit checks right-to-left pages, no visual
direction is proposed before the direction round, a brief's cited product sets a craft bar and not
a pin). Until the pin and the guides move, the contract describes a skill that no longer exists.

## What changes

- `npm run sources:update -- --only impeccable` moves the lock, the catalog record and the
  companion profile to `b4bff16`; no hash is edited by hand.
- `impeccable-product-design.json` gains `upstreamReferences` (the ten reference files, each
  adopted, partly adopted, mapped or not adopted, with a reason and a checked target) and
  `notAdopted` (agents engine, rule packs, login/logout/whoami, critique history upload, DESIGN.md
  viewer sync, Loop, audit report store).
- `impeccable-contract.md`: craft-floor checks (secondary text on color, shadow depth, spacing
  above headings, type measure, one authored motion moment), more refusals (side stripes, organic
  masks, light/dark by category, needless modal), the eyebrow as the one ban, a Mode rules table,
  the pin and direction rules, and the owner-answers-review rule.
- `ui-craft-sources.md`: audit report kept in `qa.md`, and the right-to-left checks.
- `stages.md`: Stage 1 proposes no visual direction.

## Reused, not added

Gates, receipts, CLI commands and flags are untouched. The audit report uses the existing `qa.md`
review record; RTL checks are review guidance beside the measured audit, not a new `audit.*` code.

## Boundaries

No ablation (#372 is deferred). The detector (#239) stays separate. The release bump and install
docs belong to the 0.14.0 change.

## Capabilities

- `design-pipeline`: ADDED two requirements.

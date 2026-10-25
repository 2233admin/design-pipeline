# Proposal: Internalize UI Transition Methods

## Problem

Web authors can reach generic motion direction and UC review rules, but lack a local method for
choosing a transition from the actual state change. A gallery effect can hide incorrect identity,
imply a numeric trend where none exists, or leave stale content and focus after rapid input.
The requested outcome is our own authoring and review rules, not a copied transitions library.

## Scope

- Study current public methods from Jakubantalik/transitions.dev at an exact commit and inspect
  its license; distinguish written-source observations from original project recommendations.
- Add `skill/references/ui-transition-rules.md`: applicability, state-change selection, numbered
  observable rules, practical review cases, and provenance/license boundaries.
- Route normal web build/review and animation entry points to the guide; register it in the
  existing package-resource list and note the change in the changelog.
- Keep the upstream catalog reference-only. No source bundle, implementation snippet, runtime,
  dependency, CLI feature, gate, schema, receipt, resolver, or documentation-text-only test.

## Reuse

Project `DESIGN.md`/`MOTION.md`, change-level `motion.md`, UC-01 through UC-07 and the existing
animation opportunity/review protocol remain authoritative. Findings use existing `qa.md` and
Component Conformance; manual review does not grant Visual Acceptance or add automated checks.

## Affected Capability

`design-pipeline`: packaged web/animation authoring guidance and clean-room motion provenance.

## Success Criteria

- The guide is usable offline and reachable from the skill entry and web build/review sections.
- Selection distinguishes state replacement, identity continuity, overlays, navigation, lists
  and numeric changes without prescribing a showcase style or overriding project tokens.
- Review cases expose misleading direction, broken identity, stale callbacks, inaccessible
  outgoing surfaces, reduced-motion failures and cleanup/performance regressions.
- Source paths and exact commit are recorded; no live playback or paid entitlement is claimed.
- Parent final checks run strict OpenSpec validation, existing focused QA and repository QA,
  plus a real CLI web-route smoke. Unperformed checks remain open in tasks.

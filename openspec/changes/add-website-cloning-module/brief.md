# Brief: website-cloning module

## Goal

Internalize the reusable design-reconstruction workflow from `UHolli/ai-website-cloner` as a focused `design-pipeline` module.

## Audience

AI coding agents rebuilding owned or authorized live web surfaces where visual fidelity, interaction fidelity, auditability, and resumability matter.

## Surface

- Main skill routing and module reference.
- Node initializer CLI.
- OpenSpec/headless artifact contract.
- Repository QA, tests, and release readiness.

## Constraints

- Node standard library only.
- Preserve the target project's framework and design conventions.
- Browser automation is capability-gated at execution time.
- Multi-target runs isolate evidence by normalized target id.
- Accessibility and existing design-pipeline gates remain mandatory.

## Non-Goals

- Shipping a website implementation in this repository.
- Shipping browser, builder, or visual-diff SDK adapters.
- Reproducing backend behavior, authentication, or protected content by default.

## Acceptance Checks

- A valid URL initializes the complete resumable artifact tree.
- Multiple URLs receive distinct stable target ids and isolated directories.
- Invalid or duplicate URLs fail without partial output.
- The main skill routes cloning requests to the module.
- Repository QA and open-source readiness checks pass.

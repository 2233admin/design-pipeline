# Proposal: Add Framework-Agnostic Component Capabilities

## Problem

The frontend stack registry can reject incompatible libraries, and the design-system catalog can
search component sources, but neither is a stable component behavior model. Starting from a Vue,
React, or library API makes requirements, accessibility, fallbacks, and evidence drift when the
target stack changes.

## Decision

Introduce a governed Component Capability IR, a replaceable Provider registry, contained read-only
project probing, deterministic resolution, and hash-bound behavior verification. Add Vuetify0,
React Aria, and Ark UI as initial optional providers while keeping project-owned DOM implementation
as the complete fallback. No command installs packages or mutates project configuration.

## Success criteria

- A multilingual data-table brief resolves filtering, sorting, pagination, selection, state,
  keyboard, focus, and ARIA dependencies.
- Installed providers are preferred without making them the capability model.
- Uninstalled providers are marked as adoption-required candidates.
- Missing or failed behavioral evidence blocks verification.
- The public CLI and all schemas ship in deterministic packages.
- Later framework bindings and provider discovery remain explicitly tracked by the persistent
  initiative.

# Organize repository documents

## Why

The root contains superseded README copies, an old optimization report, an empty todo list and
a glossary alongside public entry points. Project `DESIGN.md` also describes workflow machinery
as visual components, obscuring the Google DESIGN.md convention requested by the user.

## Changes

- Move historical root documents into `docs/archive/`, the glossary into `docs/`, and tracked
  scratch planning documents beside their existing specification under `docs/superpowers/`.
- Keep root `DESIGN.md` focused on this repository's visual presentation, using Google's official
  format and explicit token omissions for the host-rendered CLI and Markdown surfaces.
- Document file placement in the repository instructions and check root Markdown names in the
  existing QA runner. Clarify official section order in the skill's synthesis guide.
- Keep BMAD installations/output, local agent skills and root tool state out of Git. Preserve
  local bytes while removing tracked copies from the index, and keep clean checkouts functional.

## Boundaries

Preserve archived contents, existing public entry points, installed tooling paths and unrelated
working-tree edits. No new schema, runtime gate, dependency, publication or project-wide style.

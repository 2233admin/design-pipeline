# Improve skill tool installation

## Why

The user wants continued tool improvement and installation as an agent skill. The repository
already contains the visual helpers, but the actual Codex installation is older and lacks them.
The entry instructions also blur the installed skill directory and the user's project directory.

## Changes

- Add a small `composition scaffold --template visual-craft` action that copies the existing
  executable study, Canvas helper and license into a new directory in the target project.
- Make installed-root invocation explicit and keep supporting-tool work separate from the full
  deliverable workflow. Put installation and upgrade details in a progressively loaded guide.
- Verify the existing installer and standard skills CLI path, then update the canonical local
  Codex skill with a preserved backup and exercise that installed copy from another directory.

## Boundaries

Reuse the existing installer, CLI flags, containment helper and v1 result envelope. No second
installer, runtime, gate or receipt. No Sites publishing, Git push, release, model settings or
changes to the separate compatibility skill under `.agents/skills`.

# Proposal: drop model-made candidate previews

## Why

`direction-preview.json` has two required forms: the three-sources method (medium, six cards,
thumbnail board, three versions) used by the ui and web brief flow, and a legacy form of two to four
model-made candidates kept for OpenSpec changes and Stage 2. #173 kept the legacy form only so those
previews would not break. The owner decided: when the direction is clear, waive; when it is open, use
the three-sources method everywhere. Closes #174.

## What changes

- A `required` preview is the three-sources form in every flow; the two-to-four rule and the
  `threeSources` branch in `direction-preview-core.cjs` are deleted.
- The "ready receipt with no cards" special case in `workflows/directions.cjs` is deleted; the core
  already reports the missing cards with their fixes.
- Docs (`direction-preview.md`, Stage 2 in `stages.md`, `workflow-web.md`, `pipeline-reference.md`) and
  the `Visual directions are previewed before selection` requirement say: clear direction, waive; open
  direction, three sources.
- **Breaking:** a plain candidate receipt is rejected. No compatibility path and no migration.

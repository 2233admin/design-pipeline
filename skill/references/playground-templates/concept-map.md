# Concept Map Playground Blueprint

Use for learning, scope mapping, task decomposition, and relationships that are easier to arrange
spatially than describe sequentially.

## Required Surface

- Draggable node canvas with visible directed edges and hover/focus descriptions.
- Per-node knowledge state: understood, uncertain, or unknown.
- Include/hide controls, relationship-type selection, auto-layout, reset, and clear-user-edges.
- Presets for overview and meaningful focus areas.

## State And Output

State owns node positions, visibility, knowledge markings, and user-created edges. Preserve authored
positions across ordinary rerenders. The output prompt separates what the user understands from
what is uncertain or unknown, includes only user-selected relationships, and asks for explanation
or action grounded in concrete project/domain evidence.

## QA

Verify drag and edge creation have keyboard alternatives, auto-layout cannot lose nodes, reset is
recoverable, and overlapping nodes or labels remain readable at supported viewport sizes.

# Code Map Playground Blueprint

Use for codebase architecture, component relationships, data flow, services, plugins, and agent
systems. Populate it from repository evidence: real file paths, imports, calls, events, and data
ownership. Never invent a relationship to make the diagram look complete.

## Required Surface

- SVG diagram with 15-25 important nodes grouped into named layers.
- Curved, directed connections with a legend and independently filterable relationship types.
- View presets such as full system, frontend, backend, and data flow.
- Layer toggles, relationship filters, zoom/reset, and click-to-comment on nodes.
- Comment list with target name, real file path, edit/delete, and visible node indicator.

## State And Output

State owns visible layers, visible relationship types, zoom, active preset, and comments. Render
connections beneath nodes and hide connections whose endpoints are hidden. The output prompt names
the inspected system and visible scope, then includes only user-authored comments with their target
and file path. It must distinguish observed relationships from requested changes.

## QA

Verify every path exists, filters never leave misleading orphan edges, keyboard users can select
nodes and manage comments, and the prompt updates after add/edit/delete.

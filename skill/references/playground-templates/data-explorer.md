# Data Explorer Playground Blueprint

Use for structured product/frontend data: API shapes, queries, transformation pipelines, filters,
schedules, or configuration. Do not expose secrets or include production records unnecessarily.

## Required Surface

- Controls grouped by source, fields, filters, grouping, ordering, and limits.
- Repeatable condition rows with add/remove and type-appropriate operators.
- Formatted code/config preview or a pipeline diagram with accessible text equivalent.
- Presets representing realistic tasks, not cosmetic variations.

## State And Output

State owns every selected source, field, condition, transform, order, and limit. Escape all
user/data text before previewing it; never generate preview HTML through unsafe concatenation. The
output prompt describes the desired result and relevant schema context in natural language rather
than merely copying a query or configuration blob.

## QA

Test empty data, maximum rows, invalid combinations, localization, keyboard row editing, and a
semantic table/text path for any visual pipeline or chart.

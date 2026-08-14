# Document Critique Playground Blueprint

Use for structured review of READMEs, specs, proposals, skills, and other bounded text artifacts.

## Required Surface

- Full document with stable line numbers and suggestion-linked highlighting.
- Suggestion panel with category, line range, rationale, and pending/accepted/rejected state.
- Filters and counts for each state, plus optional user comment/edit controls.
- Prompt output built from accepted suggestions and explicit user comments.

## State And Output

Suggestions bind the source document hash, exact line range, and quoted target fragment. Render text
as text, not trusted HTML. The output prompt separates accepted changes, additional feedback, and
rejected suggestions retained only as constraints; rejection is never phrased as a requested edit.

## QA

Verify source-hash drift blocks integration, line navigation works by keyboard, rejected items are
visually and semantically distinct, and no suggestion disappears when filters change.

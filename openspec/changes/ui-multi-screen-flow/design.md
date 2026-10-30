## Decisions

1. Flow is an option of the ui deliverable, not a new deliverable: same stages, the brief and delivery carry the flow.
2. Navigation check: open `from`, click `trigger`, wait for navigation or a same-document change, and compare the
   resulting document URL or `data-screen` attribute with `to`. Single-page apps mark screens with `data-screen`.
3. `flow.html` is generated, never hand-written, and is part of the delivered files.
4. Limit: 40 screens and 200 transitions per flow; larger products are split into flows.

## Risks

- Transitions behind authentication or data loading cannot be clicked headlessly; `when` documents the condition and
  such transitions are reported as `not-clickable` with the reason instead of passing.

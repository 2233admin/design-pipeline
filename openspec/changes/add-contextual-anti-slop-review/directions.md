# Directions: contextual anti-slop review

## Direction A: Install the upstream prompt globally

- Thesis: append the full remote file to the agent's global instruction surface.
- Fit: minimal implementation work.
- Risk: mutable remote authority, repeated append pollution, context cost, duplication, prompt
  conflicts, no deterministic evidence contract.
- Decision: rejected.

## Direction B: Add a binary slop score

- Thesis: count fashionable patterns and fail above a threshold.
- Fit: simple result and easy automation.
- Risk: rewards avoidance rather than design reasoning and produces false positives for legitimate
  brand systems such as signal-dark or ink-editorial interfaces.
- Decision: rejected.

## Direction C: Contextual evidence rubric

- Thesis: classify rules by consequence, require explicit evidence, and allow documented contextual
  decisions without weakening hard product-quality gates.
- Fit: matches the pipeline's existing evidence, provenance, fail-closed, and resumability model.
- Risk: the host still needs design judgment when mapping UI evidence to contextual rules.
- Decision: selected.

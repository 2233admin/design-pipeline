# Proposal: Internalize Multi-Mode Playgrounds

## Problem

Text is not always the right interaction medium for a model. The pipeline can compare visual
directions, but it cannot preserve a manipulable representation of code architecture, component
design, layout ideas, concept relationships, data, critique findings, or game balance. These
problems are still reduced to prose or ephemeral browser state, so useful exploration and accepted
results drift before downstream work.

## Decision

Adapt the high-level interaction model reviewed from Anthropic's Apache-2.0 `playground` skill into
an original, multi-mode Design Pipeline contract. Add a public `playground check` command with
build, selection, and purpose-aware integration stages. Keep the mechanism general while limiting
use to product design, frontend implementation, scene/runtime work, and design QA. Do not vendor
upstream templates, plugin code, or a new runtime.

## Success Criteria

- Purpose-built Playgrounds remain single-file, dependency-free, responsive, and accessible.
- Typed controls, full-state presets, and accepted selections are machine-readable.
- The natural-language handoff is hash-bound and cannot be replaced by a value dump.
- Design, architecture, concept, data, critique, diff-review, game-balance, and custom modes route
  to a semantically correct governed artifact before downstream use.
- Packaged generation blueprints make every named mode executable instead of leaving it as an enum.
- Built-in templates remain defaults; change-local, hash-bound Blueprints can add new kinds through
  the same safety, verification, selection, and governed-target contract.
- Direction comparison and in-direction design tuning remain separate concepts.

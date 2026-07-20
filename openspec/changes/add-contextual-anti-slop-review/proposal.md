# Proposal: add a contextual anti-slop review

## Why

External anti-slop prompts contain useful observations about repetitive layouts, fake product
artifacts, purposeless effects, hidden content, and weak specificity. Installing those prompts as
global instructions would also import mutable remote authority, duplicate existing taste skills,
consume substantial context, and turn subjective style preferences into false blocking rules.

The pipeline needs the observation value without adopting the source's global prompt contract.

## What

- Add a small, structured anti-slop rubric with `hard`, `contextual`, and `preference` severities.
- Add a deterministic evaluator that consumes explicit evidence and never inspects or executes
  remote content.
- Add Stage 2 direction review, Stage 3 anti-template decisions, and Stage 6 QA guidance.
- Track the reviewed upstream document by URL, observation time, last-modified time, and SHA-256
  without vendoring the full text.
- Exercise the rubric against the Arknights and Arknights: Endfield research evidence.

## Safety Boundary

- Do not append remote content to global `CLAUDE.md`, `AGENTS.md`, or another agent instruction file.
- Do not treat named colors, fonts, punctuation, pills, cards, or layout families as universal
  failures.
- Only hard product, accessibility, responsive, interaction, provenance, or motion failures may
  block completion.
- Contextual findings require design reasoning and may be accepted with evidence.
- Preference findings remain advisory.
- No remote Issue, PR, push, or release is part of this change.

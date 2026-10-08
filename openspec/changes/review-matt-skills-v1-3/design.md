## Scope and reuse

Use the existing Matt installation and `docs/agents/` setup; do not package a second engineering-skill collection. Canonical host skills and compatibility consumers are compared independently. A renamed local fork is a separate source, not an upstream update.

## Ownership and migration

This change owns `docs/GLOSSARY.md`, current references in `AGENTS.md`, `docs/README.md` and `docs/agents/domain.md`, a maintained Matt guide, the README introduction and this change's records. Preserve glossary terms and unrelated README sections byte-for-byte where possible. The glossary stays under `docs/` under repository document policy; archived proposals using the old name remain history.

Setup retains the existing tracker and triage roles. Domain-doc guidance tells newer Matt skills to follow the configured glossary and OpenSpec decisions, rather than creating a second root glossary or decision store. Review the installed setup skill as source material, not as authorization to reconfigure the tracker or invoke other user-only orchestration skills.

The existing `companion-capabilities.json` Matt group requires `matt-tdd` and `matt-code-review`, which the official installer does not create. Correct only these two names to `tdd` and `code-review`; leave the group optional and preserve the established resolver, fallback and schema. This is an availability check, not proof of source identity or instruction compliance. Check a fresh root containing the five official skill names and no legacy aliases. Keep old separately named forks installed for their other consumers; do not add aliases or update third-party bytes.

## Comparison and session evidence

Resolve exact upstream revisions before comparing. Compare source files and supporting files, not names alone. Record missing, identical, locally modified and renamed entries separately. Registry discovery and frontmatter availability do not prove that a skill was invoked.

Freeze a recent-session cutoff and select 25 local, non-subagent user conversations, including archived entries. Inspect actual skill reads and tool calls, excluding system catalogs, supplied instructions, metadata/hash-only probes, mere mentions and this review's new activity. Actual source-file reads for earlier setup or maintenance comparisons count as load-only evidence and are classified separately. Report the number of eligible sessions, invocation-event counts and session coverage separately. Call evidence establishes loading, not successful compliance with every instruction. Keep raw transcripts, paths and identifiers in ignored local evidence; share aggregate results only.

## Public introduction

Explain the supported deliverables, lightweight tools, one-action workflow and feedback loop using existing behavior. Technical gate results are Component Conformance; creative or visual judgment is separate Visual Acceptance. Do not promise equal quality from every model or claim universal autonomous completion.

## Verification

Check links and preserved glossary content, setup/source comparisons, session-selection evidence and README claims. Run strict OpenSpec validation and the existing repository QA for the final documentation snapshot when concurrent work can be kept stable. Report unrelated failures as such; no runtime fix is folded into this review.

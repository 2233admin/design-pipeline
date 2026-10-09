# Domain docs

This repository has one domain context. Its npm workspaces are maintenance tools, not separate product domains.

## Before exploring

Read `docs/GLOSSARY.md` and use its defined vocabulary in code, test names, issue titles and proposals. Avoid the synonyms it explicitly rejects. Reconsider concepts absent from the glossary or note real gaps for domain modeling.

Read `openspec/config.yaml`, relevant `openspec/specs/`, and the applicable `openspec/changes/<change-id>/` proposal and design before changing behavior. Engineering decisions remain in those existing change documents. If additional ADRs already exist in `docs/adr/`, read the relevant ones and surface conflicts explicitly.

Missing optional domain documents do not block work; do not scaffold them in advance. Keep the glossary in `docs/GLOSSARY.md`; do not add a duplicate root `CONTEXT.md`, `GLOSSARY.md` or `GLOSSARY-MAP.md`. Keep engineering process and QA reports in change documents, and visual guidance in `DESIGN.md` and `MOTION.md`.

The former `docs/glossary.md` was renamed in the Matt v1.3 compatibility review; this repository never had a root `CONTEXT.md`. Skills that use the upstream `GLOSSARY.md` convention must follow this configured path. Historical change records may retain the old name. A local fork mentioning `CONTEXT.md` does not authorize creating another glossary.

The root agent entry is `AGENTS.md`, under the canonical host policy. Re-running setup updates its existing `Agent skills` block and these consumer files in place. It must preserve the chosen tracker, triage roles and glossary location. See [Matt skills compatibility](matt-skills.md) for the reviewed sources and composition guidance.

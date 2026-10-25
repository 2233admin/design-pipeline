# Proposal: Fix Standard Skills Install Discovery

## Problem

The standard Skills CLI installs Codex user skills under `~/.agents/skills` and project skills under `<project>/.agents/skills`. Without explicit root settings, `check-deps.cjs` searches only the legacy Codex skills directory. A complete standard installation therefore reports missing core resources and companions unless users manually configure roots.

## Scope

- Extend the existing default roots to the legacy Codex root, user `.agents/skills`, then the current project's `.agents/skills`, resolving and de-duplicating defaults in that order.
- Preserve `CODEX_HOME` for the legacy root and preserve exclusive explicit root lists and their environment-variable precedence.
- Add installed-checker CLI regressions with isolated home and project directories, retaining resource failures and companion discovery.
- Document installation discovery and the read-only boundary of checks; add a minimal changelog entry.
- Out of scope: doctor repair, installer changes, plugin-cache scans, new modules or schemas, dependency installation, and changes to cross-root resource matching.

## Reuse

Reuse `check-deps.cjs --json`, its existing root selection, `findSkill`, `resourceExists`, capability registry and package resource manifest. Extend the registered `tests/check-deps.test.cjs`; no new test registration or runtime resource is needed.

## Affected Capabilities

`design-pipeline`: default and explicit skill discovery for the installation self-check.

## Success Criteria

- An installed checker finds a complete user or project `.agents/skills` package without explicit root variables: core status and overall result are `OK`, missing resources are empty, companions are discovered and the process exits 0.
- Legacy `~/.codex/skills` and `CODEX_HOME/skills` remain discoverable first; resolved duplicate default roots occur once.
- Explicit platform-delimited roots remain exclusive. `DESIGN_PIPELINE_SKILL_ROOTS` wins over `CODEX_SKILLS_DIR`, and a bad explicit root fails despite a complete default installation.
- Missing required resources still produce a core failure and exit 1.
- Implementation and verification are recorded separately; integration owns execution of checks.

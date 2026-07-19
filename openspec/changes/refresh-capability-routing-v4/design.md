# Design: capability-first companion routing

## Decision

Keep the package dependency-free and add one versioned capability profile to the existing self-check. Anime.js is the pilot because v4.5 materially changes its routing role and the installed local companion predates the latest adapter/3D features.

## Routing model

`skill/references/capability-routing.md` is the human/agent decision surface:

1. preserve the target repo's existing runtime;
2. identify the required capability;
3. choose the smallest companion set;
4. avoid overlapping new runtime dependencies;
5. fall back to official docs and built-in gates when a companion is missing or stale.

The reference keeps runtime/plugin surfaces such as Figma and Sites separate from install-time package requirements.

## Self-check model

`check-deps.cjs` reports two independent layers:

- `groups`: folder/resource discovery and required/optional status;
- `capabilityProfiles`: marker-based compatibility for version-sensitive companions.

The Anime.js v4.5 profile checks markers for:

- v4 API;
- Layout;
- Text;
- Scroll;
- Draggable;
- Scope;
- WAAPI;
- adapters/Three.js;
- 3D stagger;
- deterministic jitter/seed.

Missing optional skills return `INFO`. Installed skills with missing markers return `WARN`. Neither changes the overall `OK` result because official documentation and pipeline gates remain valid fallbacks.

## Skill roots

`DESIGN_PIPELINE_SKILL_ROOTS` is the explicit multi-root override. `CODEX_SKILLS_DIR` remains compatible and may also contain multiple paths separated by `path.delimiter`. Without overrides, the existing `$CODEX_HOME/skills` or `~/.codex/skills` default remains unchanged.

The package does not crawl plugin caches. Plugin/runtime discovery belongs to the host surface and can be added later through an explicit adapter.

## QA

Add Node built-in tests that create isolated temporary skill roots and prove:

- a complete Anime.js v4.5 skill reports `OK`;
- a present but stale skill reports `WARN` and keeps the pipeline result `OK`;
- a missing optional skill reports `INFO`;
- multiple explicit roots are searched.

The existing website-cloning tests, packaging check, source URL check, and manifest-schema check remain required.

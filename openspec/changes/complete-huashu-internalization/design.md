Status and authorization: [README](README.md).

## Implementation

Reuse VisualCraft for measured paths, text overflow and image placement. Add the missing
Huashu techniques under `skill/tools/art-motion`, using a static, reproducible adaptation
of the pinned source where this is smaller than reimplementing the algorithms. No runtime
eval, implicit network request or installation is required to create a tool instance.

Library state, stage dimensions, caches and explicit assets belong to an instance. Callers
own their Canvas and timeline. Sample scenes and grammar presets are opt-in; their original
art direction is not the default for new projects. Expose required assets and fonts instead
of hiding absent files or making a source-specific actor mandatory. Apply existing renderer
and animation evidence checks; adapted source execution is not creative acceptance.

Retain full original source paths under `skill/vendor/huashu-art-motion/upstream`, including
method/style/grammar cards and their code, licenses and relevant sample assets. Migrate the
previous stripped source paths and update references. Use the existing git-tree snapshot
helper to import committed blobs from the explicitly reviewed revision. Preserve source bytes.

## Ownership

- Canvas worker: isolated library/preset adaptation, generator and runtime checks.
- Assets/audio worker: missing asset preparation and synthesis helpers, focused checks.
- Lead: source import, progressive guides, scaffold/render integration, manifests, package
  verification and installation. A separate reader audits full source coverage and results.

Do not edit concurrent video-handoff runtime work or install unfinished files from that work.
Use a scoped install onto the last verified canonical skill when the shared tree remains dirty.

## Active discovery follow-up

Reuse the existing tools index, capability routing, Stage 5 task loop, adapter intake and source
internalization route. `tools/open-source-design.md` owns the progressive procedure; `SKILL.md`
provides the planning/production/review trigger, and existing routes link it. No search service,
automatic dependency installer, new registry or evidence schema is introduced. A narrow CSS change
needs no external research; a real missing method prompts active source inspection and a rendered
study. Install only this change's Stage 5 paragraph onto the canonical copy because the repository
file also contains concurrent uninstalled video-handoff edits.

## Verification

Check imported blob hashes and static adaptation reproducibility; render representative
library operations and every provided preset at caller-chosen dimensions. Check cold and
reordered time, instance isolation, transparent exports, missing inputs, invalid specs and
safe output paths. Exercise each asset/audio tool with actual outputs and run the relevant
existing diagnostics. Run OpenSpec, repository QA and packaged CLI/install checks. Test counts
describe technical checks only, not functions or aesthetic quality.

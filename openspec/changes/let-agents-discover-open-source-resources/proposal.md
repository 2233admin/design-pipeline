## Why

The owner wants the web agent to find and use existing open-source "wheels" (component libraries and icon sets) by itself instead of hand-writing everything. Today the components decision only lets the agent search the skill's index; any library outside it must be named by a person, the manifest validator rejects every other URL, and the web build instruction never routes font choice through `tools/fonts.md`, so pages silently fall back to the system stack.

## What Changes

- Add a `discover` source to the existing components decision: `--choice` accepts `project,github,index,discover,scratch`, stored in that canonical order; `scratch` stays exclusive and `github` still needs a named GitHub repository URL. The `next` ask offers the new option and recommends `project,index,discover`.
- Extend the existing `validateComponentManifest`: an entry citing by `url` a GitHub repository `https://github.com/<owner>/<repo>` that is neither named in the decision nor an indexed source is a discovered source (GitHub non-repository pages such as `topics/<name>` are not repositories). It needs `discover` in the recorded set, availability `bundled-implementation`, `reference-link` or `metadata-only`, a pinned `revision` (commit SHA or tag, not `HEAD`, `main` or `master`), https `license.evidence` with at least one URL on that repository whose `blob`, `tree`, `raw`, `commit`, `releases/tag` or `archive` ref is the revision, and a `verified`, `unverified` or `commercial` license state; an SPDX `license.id` is optional unless the source is copied or imported. npm pages, official project pages and other URLs are not accepted. URLs of indexed sources keep today's rule (cite by `sourceId`). The validator checks this auditable shape offline and does not authenticate the upstream.
- Copying or importing a discovered source requires `license.state: verified`, a permissive `license.id` (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0) and `license.file`, a contained, non-empty project file holding the license text; anything else is study/reimplementation only. Bundling, vendoring, self-hosting or downloading a source counts as copying. Existing unverified/commercial and notice-handling rules stay.
- Build guidance in the `next` instruction and `workflow-web.md`: search the index first; with `discover`, find maintained open-source options on GitHub when nothing indexed fits, check the license at a pinned revision, record the entry before use and prefer genuine reuse. Route font choice through `tools/fonts.md` without a silent system-stack fallback, record the chosen family under Typography in `DESIGN.md` (which the audit probe's `thresholds.fonts` reads) and keep discovered code and fonts bundled or self-hosted with their notices (`web-motion.md`). Fonts stay out of the component manifest; `tools/fonts.md` already records their provenance in the project's design notes.
- Update CLI help, `workflow-web.md`, `tools/fonts.md`, `stages.md`, `pipeline-reference.md`, regression tests and CHANGELOG.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: web component source decision, component manifest provenance and web build guidance.

## Impact

Existing `decide --stage components`, the web workflow's components ask and build instruction, `validateComponentManifest` in the catalog core, CLI help, maintained web/font guides, tests and CHANGELOG. No new gate, receipt schema, target resolver, policy digest or CLI flag; the decision's lineage still invalidates checked evidence through `invalidateCheckedEvidence`. The component index, vendor bytes and runtime checks are unchanged. Validation records declared provenance and license handling; it does not fetch or audit licenses, and a valid manifest remains Component Conformance build-completion evidence, not Visual Acceptance. The requirements modified here are added by the in-flight change `consolidate-component-index-and-web-sources`, which must be archived before this change.

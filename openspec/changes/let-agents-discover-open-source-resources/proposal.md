## Why

The owner wants the web agent to find and use existing open-source "wheels" (component libraries, packages, icon sets) and fonts by itself instead of hand-writing everything or settling for system defaults. Today the components decision only lets the agent search the skill's index; any library outside it must be named by a person, the manifest validator rejects every other URL, and the web workflow never routes font choice through `tools/fonts.md` or checks a font's provenance.

## What Changes

- Add a `discover` source to the existing components decision: `--choice` accepts `project,github,index,discover,scratch`, stored in that canonical order; `scratch` stays exclusive and `github` still needs a named GitHub repository URL. The `next` ask offers the new option and recommends `project,index,discover`.
- Extend the existing `validateComponentManifest`: an entry citing by `url` an https source that is neither a decision-named GitHub repository nor an indexed source is a discovered source. It needs `discover` in the recorded set, a pinned `revision`, an SPDX `license.id` and https `license.evidence`, and a `verified`, `unverified` or `commercial` license state. URLs of indexed sources keep today's rule (cite by `sourceId`).
- Copying or importing a discovered source requires a verified permissive license (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0, OFL-1.1); anything else is study/reimplementation only. Existing unverified/commercial and notice-handling rules stay.
- Add an optional entry `kind` (`component`, `library`, `icon`, `font`). A font needs the same provenance unless it cites an indexed or project-owned source, uses its font-family name as the marker, and is exempt from the source category and the scratch contradiction; a font alone does not evidence a nonscratch decision.
- Build guidance in the `next` instruction and `workflow-web.md`: search the index first; with `discover`, find maintained open-source options when nothing indexed fits, check the license at a pinned revision, record the entry before use and prefer genuine reuse. Route fonts through `tools/fonts.md` and keep discovered code and fonts bundled or self-hosted with their notices (`web-motion.md`).
- Update CLI help, `workflow-web.md`, `tools/fonts.md`, `stages.md`, `pipeline-reference.md`, regression tests and CHANGELOG.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-pipeline`: web component source decision, component manifest provenance and web build guidance.

## Impact

Existing `decide --stage components`, the web workflow's components ask and build instruction, `validateComponentManifest` in the catalog core, CLI help, maintained web/font guides, tests and CHANGELOG. No new gate, receipt schema, target resolver, policy digest or CLI flag; the decision's lineage still invalidates checked evidence through `invalidateCheckedEvidence`. The component index, vendor bytes and runtime checks are unchanged. Validation records declared provenance and license handling; it does not fetch or audit licenses, and a valid manifest remains Component Conformance build-completion evidence, not Visual Acceptance. The requirements modified here are added by the in-flight change `consolidate-component-index-and-web-sources`, so this change archives after it.

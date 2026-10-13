## Decision and scope

The owner asked that the web agent "find wheels, fonts and similar resources by itself": reuse maintained open-source component libraries, packages, icon sets and fonts instead of hand-writing everything or falling back to system defaults. The controller settled the contract; this change extends the existing v1 components decision, `validateComponentManifest` and the maintained guides. It adds no gate, receipt schema, target resolver, policy digest or CLI flag.

The two requirements modified here were added by the in-flight change `consolidate-component-index-and-web-sources`. The MODIFIED blocks carry its full text and every scenario, so archive this change after that one; OpenSpec validates a MODIFIED delta whose base is still in flight and leaves the ordering to archive.

## Source set and lineage

`COMPONENT_SOURCES` in `skill/scripts/design-system-catalog-core.cjs` is the single canonical list: `project,github,index,discover,scratch`. `decide --stage components`, the manifest validator's recorded-set check and the `next` ask's record template all read it, so the error text, the stored order and the template cannot drift apart. `scratch` stays exclusive and `github` still needs a named GitHub owner/repo URL in the answer; `discover` needs nothing in the answer because the agent finds and records the sources.

The ask gains a fifth option ("let the agent find maintained open-source libraries, packages and icon sets beyond the index") and recommends `project,index,discover`. Lineage is unchanged: decide still compares the canonical set and the answer and calls `invalidateCheckedEvidence` when either differs, so adding or removing `discover` drops the interaction pass and delivery exactly like any other change, and the review binding through `componentDecisionDigest` covers the new set without code changes.

## How a url entry is classified

The validator still judges each entry by how it cites its source. Entries citing `sourceId` are unchanged. A `url` is classified in this order:

1. A GitHub repository named in the components decision is the `github` category, as before. A deep link inside a named repository (`/tree/...`, `/blob/...`) is rejected with the repository URL to cite instead; it is never a discovered source.
2. A URL that matches an indexed source is rejected: cite it by `sourceId`, or by url only as a decision-named GitHub repository. A GitHub URL matches by owner/repo, deep links included. Any other host matches when the URL is at or below a recorded `provenance.url`, `provenance.repository` or alias path on the same host (a leading `www.` is ignored, and a root URL covers its whole host). Matching every URL on a host would wrongly claim multi-tenant hosts, so it stays path-scoped. Records of every type are compared, so the index's license state cannot be bypassed through one of its homepages.
3. Any other https URL without credentials is a discovered source: category `discover`.
4. Other schemes (not `file:`) are rejected as neither an https source nor a project file; contained paths and `file:` URLs remain project files.

Residuals, accepted as conservative rather than unsafe: an npm page or sibling path that no index record lists (for example a package page of an indexed library, or a React Bits page outside its recorded deep aliases) classifies as discovered and then needs full discovered provenance. "Named in the decision" keeps its existing meaning, the GitHub repositories found in the answer; a non-GitHub URL in the answer does not make an entry a `github` entry.

## Discovered provenance and copy safety

For a component (non-font) entry the category check runs before the provenance checks, so a `discover` entry under a set without `discover` reports its category, the recorded set and why the url counts as discovered. A discovered entry then needs a nonempty `revision` (commit SHA, tag or package version), a nonempty `license.id` (SPDX expression), a non-empty `license.evidence` array of https URLs to the license text at that revision, and a `verified`, `unverified` or `commercial` license state. Validation checks presence and shape only; it does not fetch evidence, parse SPDX expressions or prove that a revision exists or is not a moving branch.

`PERMISSIVE_LICENSES` lists MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0 and OFL-1.1, compared with the whole `license.id` case-insensitively. A discovered source whose state is not `verified` or whose id is not one of these may not be copied or imported, and any use other than study/reimplementation is rejected; a compound expression such as `MIT OR Apache-2.0` is therefore study-only. Verified permissive copies and imports keep the existing notice-handling rule, and the existing unverified/commercial rule still covers indexed sources.

## Fonts

An optional `kind` (`component` default, `library`, `icon`, `font`) describes each entry; other values are rejected. A font that cites neither an indexed nor a project-owned source is pinned like a discovered source. Fonts skip the component source category and the scratch contradiction, because fonts are not components. A page that loads a pinned font serves its files, so any use other than study counts as copying: a pinned font must be verified and permissive to be served, and must record notice handling, while study-only use stays possible. Its `usedIn.marker` is the font-family name in the file that loads or uses it. A system stack needs no entry.

Because fonts are not components, a font alone does not evidence a reuse or discovery decision: a nonscratch manifest needs at least one non-font entry. This is an interpretation added for consistency, not a contract item; `library` and `icon` entries count as components.

## Guidance

The web `next` build instruction and `workflow-web.md#build` say to search the index first. Only when `discover` is recorded, they add: when nothing indexed fits, find maintained open-source libraries, packages or icon sets (method in `tools/open-source-design.md`), check the license at a pinned revision, record the entry before use and prefer genuine reuse over hand-writing. Every web build routes font choice through `tools/fonts.md`; the system stack is used only when the treatment (or, in quick and replicate builds, the page's direction) deliberately calls for it. Discovered code and fonts are bundled or self-hosted inside the project with their notices, matching `web-motion.md#self-contained-pages`; the existing interaction probe already reports external requests. `tools/fonts.md` explains how a web project records the chosen family as a font entry; `stages.md`, `pipeline-reference.md` and CLI help name the new choice.

## File ownership and compatibility

- `skill/scripts/design-system-catalog-core.cjs`: source and license constants, url classification, discovered and font provenance, copy/import rules.
- `skill/scripts/workflow-core.cjs`: decide accepts `discover`; stored state keeps the same `decisions.componentSources` array shape.
- `skill/scripts/workflows/web.cjs`: components ask and build instruction.
- `skill/scripts/cli-core.cjs`: public help text.
- `skill/references/workflow-web.md`, `skill/references/stages.md`, `skill/references/pipeline-reference.md`, `skill/tools/fonts.md`: guidance.
- `tests/workflow-component-discovery.test.cjs` (registered in `scripts/test-manifest.json`) and three migrated assertions in `tests/workflow-components.test.cjs`.

Existing recorded decisions stay valid because every old set is a subset of the new one. Manifests that were valid stay valid, with one exception: an entry that already carried a `kind` outside the four values is now rejected. URLs that were already rejected stay rejected unless they become valid discovered entries: an unnamed, unindexed GitHub repository or other https page needs `discover` and full provenance, and a non-https scheme is never accepted. Their messages now name the `discover` category or the https requirement. No catalog, vendor or package resource changes, and no new load-bearing file under `skill/`.

## Evidence boundary

Build completion with a valid manifest remains Component Conformance stage evidence only. The validator records declared provenance and license handling; it does not audit legal compliance and grants no Visual Acceptance.

## Decision and scope

The owner asked that the web agent find existing open-source "wheels" by itself: reuse maintained open-source component libraries and icon sets instead of hand-writing everything. The controller settled the contract; this change extends the existing v1 components decision, `validateComponentManifest` and the maintained guides. It adds no gate, receipt schema, target resolver, policy digest or CLI flag.

The scope is GitHub repositories only. npm pages, official project pages and other hosts are not accepted as discovered sources, because a GitHub repository at a pinned commit or tag is the one place where the code, its license file and the revision can be cited together. Fonts are out of the manifest: they keep following `tools/fonts.md`, which records a chosen family's release, source, license and weights in the project's asset/design notes.

## Dependencies

The two requirements modified here were added by the in-flight change `consolidate-component-index-and-web-sources`. The MODIFIED blocks carry its full text and every scenario. Archive `consolidate-component-index-and-web-sources` before this change; OpenSpec validates a MODIFIED delta whose base is still in flight and leaves the ordering to archive.

## Source set and lineage

`COMPONENT_SOURCES` in `skill/scripts/design-system-catalog-core.cjs` is the single canonical list: `project,github,index,discover,scratch`. `decide --stage components`, the manifest validator's recorded-set check and the `next` ask's record template all read it, so the error text, the stored order and the template cannot drift apart. `scratch` stays exclusive and `github` still needs a named GitHub owner/repo URL in the answer; `discover` needs nothing in the answer because the agent finds and records the sources.

The ask gains a fifth option ("let the agent find maintained open-source component libraries and icon sets on GitHub beyond the index") and recommends `project,index,discover`. Lineage is unchanged: decide still compares the canonical set and the answer and calls `invalidateCheckedEvidence` when either differs, so adding or removing `discover` drops the interaction pass and delivery exactly like any other change, and the review binding through `componentDecisionDigest` covers the new set without code changes.

## How a url entry is classified

The validator still judges each entry by how it cites its source. Entries citing `sourceId` are unchanged. A `url` is classified in this order:

1. A GitHub repository named in the components decision is the `github` category, as before. A deep link inside a named repository (`/tree/...`, `/blob/...`) is rejected with the repository URL to cite instead.
2. A GitHub URL whose owner/repo matches an indexed source's recorded `provenance.url`, `provenance.repository` or alias (deep links on either side included) is rejected: cite it by `sourceId`, or by url only as a decision-named GitHub repository. The index's license state therefore cannot be bypassed by citing its repository.
3. Any other `https://github.com/<owner>/<repo>` URL, without credentials, port, query or fragment, is a discovered source: category `discover`. GitHub pages whose first segment is not an owner (`topics`, `orgs`, `sponsors`, `marketplace`, `settings`, `features`, `collections`, `explore`, `enterprise`, `login`, `apps`, `users`, `search`) are not repositories, here or in evidence and decision URLs.
4. Every other URL is rejected with "must be a GitHub repository URL `https://github.com/<owner>/<repo>` or a project file": npm pages, project homepages, other hosts, owner pages, GitHub non-repository pages, unnamed deep links, `http:` and other schemes. Contained paths and `file:` URLs remain project files.

"Named in the decision" keeps its existing meaning, the GitHub repositories found in the answer.

## Discovered provenance and copy safety

The category check runs before the provenance checks, so a `discover` entry under a set without `discover` reports its category, the recorded set and why the url counts as discovered. A discovered entry then needs:

- `availability` `bundled-implementation`, `reference-link` or `metadata-only`, never `project-owned`;
- `license.state` `verified`, `unverified` or `commercial`;
- a nonempty `revision` (commit SHA or tag) other than the moving refs `HEAD`, `main` and `master` (case-insensitive);
- a nonempty `license.id` (SPDX expression) when one is given; a study-only entry may omit it, since copying or importing needs a permissive id anyway;
- a non-empty `license.evidence` array of https URLs, at least one on the same GitHub repository whose ref is exactly the revision: the raw, undecoded path segment right after `/<owner>/<repo>/blob/`, `/tree/`, `/raw/`, `/commit/`, `/releases/tag/` or `/archive/` (for `archive`, also `/archive/refs/tags/`, with a `.zip` or `.tar.gz` suffix removed), for example `https://github.com/<owner>/<repo>/blob/<revision>/LICENSE`. Evidence on a default branch, a fork, another host or `raw.githubusercontent.com` does not count, nor does a revision that only prefixes the ref (`v2.1.1` against `v2.1.10`), appears only as a later segment (`blob/main/LICENSE` for revision `LICENSE`) or hides behind an encoded slash (`blob/main%2Fdeadbeef%2F/LICENSE`).

The validator checks this auditable shape offline and does not authenticate the upstream: it does not fetch evidence, parse SPDX expressions or prove that the repository, revision or license exists. Beyond `HEAD`, `main` and `master` it does not detect that a revision is a moving branch name.

Copying or importing (the existing `usedIn.how` detection) a discovered source additionally needs `license.state: verified`, a `license.id` from `PERMISSIVE_LICENSES` (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unlicense, CC0-1.0, compared with the whole id case-insensitively) and `license.file`: a project file, resolved with the existing real-path containment rule, that is non-empty after trimming whitespace. Its content is not inspected; the validator does not try to recognise license text. When `license.file` is present on any discovered entry it is validated the same way. Without a verified permissive license and a `license.file`, any use other than study/reimplementation is rejected; a compound expression such as `MIT OR Apache-2.0` is therefore study-only. Verified permissive copies and imports keep the existing notice-handling rule, and the existing unverified/commercial rule still covers indexed sources. Copy detection counts bundling, vendoring, self-hosting and downloading (`bundle`, `vendor`, `self-host`, `download` and their inflections, 打包, 自托管, 下载) as copying for every source, because the build instruction tells the agent to bundle or self-host discovered code.

## Guidance

The web `next` build instruction and `workflow-web.md#build` say to search the index first. Only when `discover` is recorded, they add: when nothing indexed fits, find maintained open-source component libraries or icon sets on GitHub (method in `tools/open-source-design.md`), check the license at a pinned revision, record the entry before use and prefer genuine reuse over hand-writing. Every web build routes font choice through `tools/fonts.md`; the system stack is used only when the treatment (or, in quick and replicate builds, the page's direction) deliberately calls for it. Discovered code and fonts are bundled or self-hosted inside the project with their notices, matching `web-motion.md#self-contained-pages`; the existing interaction probe already reports external requests. A web build records its chosen family under Typography in `DESIGN.md`, where the audit probe's required `thresholds.fonts` reads the approved families, so the font chosen through `tools/fonts.md` is the font the audit approves; `tools/fonts.md` says so in one sentence. `stages.md`, `pipeline-reference.md` and CLI help name the new choice.

## File ownership and compatibility

- `skill/scripts/design-system-catalog-core.cjs`: source and license constants, url classification, discovered provenance, copy/import rules.
- `skill/scripts/workflow-core.cjs`: decide accepts `discover`; stored state keeps the same `decisions.componentSources` array shape.
- `skill/scripts/workflows/web.cjs`: components ask and build instruction.
- `skill/scripts/cli-core.cjs`: public help text.
- `skill/references/workflow-web.md`, `skill/references/stages.md`, `skill/references/pipeline-reference.md`, `skill/tools/fonts.md`: guidance.
- `tests/workflow-components.test.cjs`: the `discovery:` cases and three migrated assertions.

Existing recorded decisions stay valid because every old set is a subset of the new one. Manifests that were valid stay valid. URLs that were already rejected stay rejected unless they become valid discovered entries: an unnamed, unindexed GitHub repository URL needs `discover` and full provenance. Their messages now name the `discover` category or the GitHub repository URL requirement. No catalog, vendor or package resource changes, and no new load-bearing file under `skill/`.

## Evidence boundary

Build completion with a valid manifest remains Component Conformance stage evidence only. The validator records declared provenance and license handling; it does not audit legal compliance and grants no Visual Acceptance.

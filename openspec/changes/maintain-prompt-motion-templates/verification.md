# Template-library verification

## Scope and frozen implementation

The user prioritizes maintaining reusable templates; runnable brand projects, storyboard generation
and rendering are deferred. This increment collects homepage metadata, authors planning recipes,
provides offline selection and documents reviewable updates. No periodic monitor or additional
dependency/gate/receipt/target resolver was added. This host does not use Multica.

Implementation commit: `de0361bdce0e52fa112aefebb51a0f7982dbb998`.
Tested Git tree: `1a238bde6c4ce6a3ee472258d1ad8c050d88e865`.
Packaged skill tree: `ab67b55f14f78978daa8bfbf252ab23b3b2481b2`.

Before freezing, `git fetch origin`, both histories and the three-dot PR scope were reviewed.
There were no incoming main commits; the existing thirteen right-side commits are the previously
authorized Good CSS/Taste/native/Huashu/film branch. The dirty original checkout at
`F:\projects\design-pipeline` was preserved; all implementation stays in the clean release worktree.

## Source and recipe review

The primary homepage `https://www.prompt-motion.com/` was retrieved as text HTML on 2026-10-09:
891,352 bytes, SHA-256 `be13be183f615fb944f9607359bf1b64e4b42d07b8b55031d76b315a39019a46`.
Only JSON Flight text was decoded, never executed. The snapshot contains 233 unique card IDs;
230 have Prompt type and four Skill type, with one overlap. All 233 report a shared Prompt in
this snapshot. Index metadata excludes media URLs and other page fields.

Two independent recipe batches read primary case text, verified all selected source IDs against
the homepage and supplied authored adaptations. The merged catalog has twelve recipes, seven
categories and thirteen distinct sources. Two identical UI prompts share one recipe and retain
both source authors. Generic cases with no useful structure stay indexed. Coarse source prompts
that gained sequencing explicitly label the library's authorship in `adaptation`.

Each recipe supplies replaceable inputs, structure, invariants, pitfalls, maintained guide paths,
attribution and limitations. All observations are `page-prompt`, with watching/hearing/rendering
false. No complete Prompt, remote media, original code or brand assets were mirrored. No new
recipe was instantiated, watched, listened to or rendered.

Homepage refresh of the same local snapshot produced 233 entries and added=0, changed=0,
removed=0. Output is `{index,diff}` at a new ignored candidate path; approved data was not
overwritten. The diff checks metadata including Prompt availability, not Prompt bodies or media.
Individual page review and referenced-source retirement are documented maintenance responsibilities.
Snapshot digest records content identity, not publisher attestation.

## Checks and review

- `npm ci`: passed with the existing locked dependencies; no dependency or lockfile change.
- Focused `tests/prompt-motion-index.test.cjs` and `tests/prompt-motion-library.test.cjs`:
  9 passed, zero failed/skipped. Covers real trimmed Flight records across chunks, invalid dates
  and fields, duplicate/missing records, inert script handling, size limits, diffs, unused-output
  protection, installed-path lookup, source linkage, strict nested fields, invalid IDs and
  no writes through the public CLI.
- `npm run specs:check`: 57 passed, zero failed.
- Independent read-only review first found permissive extra catalog fields. The fix reuses
  `assertKeys` for top-level/nested records and checks boolean Prompt availability. Negative
  relocated tests inject source media, a rendered URL and an observation field; all reject.
  Re-review of implementation, tests, maintenance/routing docs and manifests passed with no
  remaining material finding. Reviewer did not run tests; execution evidence is from primary QA.
- Frozen-tree npm test: 1,089 repository tests passed, zero failed/cancelled/skipped; actual package resource/archive checks and isolated installation passed; installed-package CLI 12/12 passed with zero skipped; both browser-tool self-tests passed. QA confirmed byte-identical repository status before/after.

Full QA used the persistent isolated FontTools 4.66.1 Python via `HUASHU_PYTHON`, existing
`.env.local` Blender resolution and discovered Chrome. Implementation bytes remained frozen.
Local logs and source notes are ignored under `.design-pipeline/prompt-motion/`; prior film
execution evidence remains under its own change and does not validate the new recipe library.

## Canonical installation and delivery

Before synchronization, all 3,004 canonical files matched the prior verified installation's
SHA-256 inventory with no local modifications or extras. A complete fresh backup was copied and
byte-verified outside skill discovery roots at
`.design-pipeline/prompt-motion/canonical-backup-ocGvgN`.

The existing contained installer synchronized the canonical root at C:/Users/Administrator/.codex/skills/design-pipeline. All 3,008 installed files match the frozen skill working bytes by SHA-256, with zero modifications or extras. The four new library resources are shipped. Installed offline CLI, with HTTP(S) proxies blocked, returned twelve recipes and 233 indexed cases; selecting ui-state-loop returned its two sources and unrendered status. The shared .agents/skills compatibility content was preserved.

Delivery uses the existing open PR #85 against main. Canonical synchronization and local verification are complete; publication and exact-head CI are the remaining delivery step. Their results will be recorded here after execution. No merge is authorized or performed.

## Acceptance and limits

Library consistency and technical checks passed as recorded above; no formal Component
Conformance assessment or Visual Acceptance is claimed for these recipes. The release remains
a reviewed recipe library. Applying a recipe to a real product and collecting motion/audio,
engineering and visual evidence are future task-specific work. Current Flight transport changes
require parser/fixture updates; metadata diffs alone do not detect changes in case content.

# Design: Internalize UI Craft Sources

## Source Inventory

Reviewed on 2026-10-13 from fresh clones of each upstream default branch.

| Vendor directory | Upstream | Revision | Import scope | License evidence |
| --- | --- | --- | --- | --- |
| `emil-design-eng` | `emilkowalski/skills` | `2d228630ba1446365f614a108cb8252f1feda202` | `LICENSE`, `skills/emil-design-eng/**` | MIT, `Copyright (c) 2026 Emil Kowalski` |
| `make-interfaces-feel-better` | `jakubkrehel/make-interfaces-feel-better` | `35545ea1512ad59fa463e6b1f95ca9c052981fe6` | `LICENSE`, `README.md`, `skills/make-interfaces-feel-better/**` | MIT, `Copyright (c) 2026 Jakub Krehel` |
| `fixing-accessibility` | `ibelick/ui-skills` | `f2264c30213a8a55bd0a6a7668d0438e4564e090` | `LICENSE`, `skills/fixing-accessibility/**` | MIT, `Copyright (c) 2026 Julien Thibeaut` |
| `12-principles-of-animation` | `raphaelsalaja/skill` | `dc9eef22f13635df77d9b9e67c82aa85d52a97b7` | `README.md`, `skills/12-principles-of-animation/**` | `license: MIT` in the skill frontmatter; the repository ships no LICENSE file |
| `shadcn` | `shadcn-ui/ui` | `993eb2c3151997ce08a49635c10fd8c8ef3713c7` | `LICENSE.md`, `skills/shadcn/**` | MIT, `Copyright (c) 2023 shadcn` |
| `playwright-cli` | `microsoft/playwright-cli` | `b85c7a736bb473bf55b584e54a09ffa698d6d871` | `LICENSE`, `README.md`, `skills/playwright-cli/**` | Apache-2.0; no NOTICE file at this revision |

Scopes take only the requested skill directory plus license and README metadata. They exclude
repository-root agent files (`AGENTS.md`, `CLAUDE.md`), application source, CI and sibling skills,
so a vendored tree never brings upstream project instructions into the package.

`react-doctor` (`millionco/react-doctor@e5824abe9a8ccaff326fdaecc11b21ce35ea7750`) stays outside
the package. Its license adds a prior-permission clause for using the software, its source or
derivatives as training, fine-tuning or evaluation data, or as input to any automated pipeline that
improves an AI system. `skill/references/react-doctor.md` is a project-written, reference-only
record with the existing `sourceMeta` shape: revision, content hash of the reviewed upstream skill
files, review date and freshness. It describes the public CLI in project words and copies no
upstream text.

## Snapshot Format

`scripts/import-ui-craft-sources.cjs --name <vendor dir> --source <clean checkout> --reviewed-at
YYYY-MM-DD` holds one reviewed record per bundle: repository, revision, root Git tree, scope, file
count, byte count, scoped tree hash, license evidence and skill name. It rejects a dirty checkout,
an unreviewed revision or tree, a license mismatch, an inventory mismatch and an invalid date, and
replaces a bundle atomically only after every check passes.

`inspectCheckout` in `scripts/git-tree-snapshot.cjs` gains an optional path filter applied before
blobs are read, so the `shadcn-ui/ui` monorepo imports only its scoped blobs. Existing importers
call it unchanged.

Each bundle's `manifest.json` uses one family schema, `design-pipeline.ui-craft-source.v1`, because
one importer and one test own all six bundles. It records `name`, `source` (repository, revision,
root `gitTree`, `committedAt`, license, `reviewedAt`, scope and a `contentHashScope` stating that
`gitTree` is the upstream root rather than the scoped snapshot), `licenses`, `snapshot` (root,
counts, scoped `treeSha256`, `executableFiles`, per-object path/mode/oid/size/sha256), `skills` and
a `boundary` whose install, execute and fetch flags are all `false`.

## Precedence

1. User decisions, project `DESIGN.md` and `MOTION.md`, and existing v1 contracts.
2. Pipeline protocols: interface discipline (`better-interface` orchestrates review and findings keep
   `Introduced` / `Regression` / `Pre-existing` status in `qa.md`), the animation opportunity and
   review gate, Good CSS for style authoring, `component-source-catalog.json` with
   `design-system route` for component sources, and `verify interaction` for interaction evidence.
3. Bundled craft detail: `emil-design-eng`, `make-interfaces-feel-better`, `fixing-accessibility`
   and, only in a shadcn project or for a selected shadcn-registry route, `shadcn`.
4. Checklists: `12-principles-of-animation`.

Observed conflicts are resolved in the guide. `easing-exit-ease-in` conflicts with Emil's rule never
to use ease-in for UI; the project exit token governs, otherwise ease-out. The 50 ms stagger cap and
Emil's 30-80 ms range yield to the project token, otherwise the motion gate's budget. A conflicting
checklist rule is recorded as not applicable, not as a finding. Upstream persona text, initial
responses, slash-command usage and output formats are not pipeline behavior; findings go into the
existing review record.

## Execution Boundary

- `shadcn`: run the project's package runner only when the project has `components.json`, or after
  the user approves a selected component route that installs from a shadcn registry. Never run the
  skill's context-injection line automatically, and without that approval never introduce shadcn
  into a project that does not use it.
- `playwright-cli`: an optional exploratory driver only when the project already uses it or the
  user approves running it; a copy installed elsewhere on the machine is not approval. Its
  snapshots and screenshots are not receipts; interaction evidence stays with
  `verify interaction`.
- `react-doctor`: an optional, user-approved CLI run in React projects. Never fetch or follow its
  remote playbook prompts. Its score and findings are advisory `qa.md` evidence, never Component
  Conformance or Visual Acceptance, and its source is never used as evaluation or optimization data.

No source adds a gate, receipt field or CLI flag, or changes how Component Conformance and Visual
Acceptance are reported.

## Emil Reconciliation

`animation-opportunity-and-review.md` continues to distill four other Emil motion skills at
`d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7` as a reference-only source; its no-copy boundary is
scoped to those four files and points to the bundled `emil-design-eng`, a different skill.

`emil-design-eng` leaves the Visual taste companion group in `companion-capabilities.json`, so a
clean package no longer reports it missing or asks for an external install; the group fallback
names the bundled source, and an installed copy remains harmless. The "Companion self-check covers
the design profile" requirement is therefore modified here in full.

## Archive Order

The active `internalize-taste-skill` change also replaces "Companion self-check covers the design
profile" in full, and OpenSpec does not enforce archive order. This change's MODIFIED text already
contains the Taste line, so archive `internalize-taste-skill` first and this change second. If the
order is reversed, reconcile during that archive: the final requirement keeps both the built-in
Taste line and the built-in `emil-design-eng` line, and never lists `emil-design-eng` as a
companion. This change does not edit `internalize-taste-skill`.

## File Ownership

- Snapshots: `skill/vendor/{emil-design-eng,make-interfaces-feel-better,fixing-accessibility,12-principles-of-animation,shadcn,playwright-cli}/`,
  `scripts/import-ui-craft-sources.cjs`, `scripts/git-tree-snapshot.cjs`,
  `tests/ui-craft-sources.test.cjs`, `scripts/test-manifest.json`, `package.json`,
  `skill/references/package-resources.json`, `THIRD_PARTY_NOTICES.md`, `skill/vendor/README.md`.
- Routing: `skill/references/ui-craft-sources.md`, `skill/references/react-doctor.md`,
  `tests/source-governance.test.cjs`, `skill/SKILL.md`, `skill/references/workflow-web.md`,
  `stages.md`, `pipeline-reference.md`, `feature-routes.md`, `capability-routing.md`,
  `companion-skills.md`, `animation-opportunity-and-review.md`, `companion-capabilities.json`,
  `CHANGELOG.md`.

## Compatibility

Additive. No path moves, no artifact shape changes and existing importers keep their behavior.

## Verification

- `tests/ui-craft-sources.test.cjs`: manifests match bytes (objects, sizes, oids, SHA-256 and scoped
  tree hash), exact scope and license evidence; package resources list exactly the vendored files;
  changed, missing and added files fail; the importer rejects unreviewed, dirty and invalid input
  without replacing prior output; the packaged archive carries every blob; guide links resolve.
- `tests/source-governance.test.cjs`: the React Doctor reference pin.
- `npm run sources:check`, `npm run specs:check` and `npm test`.
- Smoke: a temporary web project at `build` gets `references/workflow-web.md#build` from `next`,
  and that section routes to `ui-craft-sources.md`.

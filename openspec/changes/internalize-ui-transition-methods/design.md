# Design: Internalize UI Transition Methods

## Decisive Question and Approach

Can a web author choose and review a state transition locally without importing upstream recipes
or establishing a second animation protocol? Existing UC rules cover purpose, timing, interruption,
origin and replay, but do not provide a state-change selection map. Add that map and transition-specific
observable cases in one focused reference. Keep all timing, runtime and evidence authority in the
existing documents. Shared-element identity and generic list-reorder rules are project-authored
extensions, not claims about an upstream implementation.

The implementation sequence is source inspection, this OpenSpec change, original rule guide,
minimal routing links, resource registration and changelog. The cheapest acceptance observation
is a real `next` response pointing to web build guidance whose local link reaches the new guide;
that establishes discoverability, not animation quality.

## Source Evidence

Reviewed 2026-10-14 using GitHub repository metadata, recursive tree metadata and pinned file reads.
Exact upstream commit: `9398105c07dafe877e43197b71c15a10a3b0e3f6` (committed
2026-10-13T15:26:14Z; root Git tree `ff01c40b62ca86ae798f3725306218a2d0f730cf`).
[Source root](https://github.com/Jakubantalik/transitions.dev/tree/9398105c07dafe877e43197b71c15a10a3b0e3f6).

Consulted files and their limited role are listed in the guide's provenance table:
`LICENSE`, `skills/transitions-dev/SKILL.md`, `skills/transitions-polish/SKILL.md`, and
`skills/transitions-dev/{01-card-resize,02-number-pop-in,04-text-states-swap,06-modal,08-page-side-by-side,26-spinning-counter,32-banner-stacking,34-text-swap-soft}.md`.
The public written sources distinguish surfaces and actions, asymmetric entrance/exit,
reversible state movement, local text/value replacement and stacked notifications. We do not
copy their recipes, token tables, installation block, personas or output format. No browser
playback, runtime execution, paid-content access or whole-library audit was performed.

`26-spinning-counter.md` describes JavaScript building reels but ends with a pure-CSS orchestration
claim. Those written statements conflict. The implementation's actual JavaScript requirements
remain unverified; the file supports only the distinction between a conspicuous numeric event
and a quiet update, not a JavaScript-free implementation claim.

## License and Adoption Boundary

The pinned `LICENSE` assigns transitions and skills a custom library non-redistribution license;
MIT covers only listed tooling directories. The website design, branding and logo are reserved.
Public free transitions/skills need no paid plan, but that does not establish access to Pro
transitions or paid Agent features. Template/theme/starter/UI-kit use has additional plan and
inclusion conditions. Do not infer a Pro or Business seat from public visibility.

This change ships original guidance and source links only (`codeCopied: false`), not upstream
source, snippets, a derivative collection or a runtime. The existing catalog stays reference-only
with no local implementation paths. Any future source adoption requires its own explicit scope,
license and entitlement review; this guidance is not permission to copy paid or free recipes.

## Rule Ownership and Precedence

`ui-transition-rules.md` is the project-owned UI selection layer. UC-01..07 and animation
opportunity/review retain purpose, timing/easing, interruption, origins, reduced motion and
rendered review. UC-08..11 retain focus/keyboard/semantics. The guide adds observable applications,
not new numerical defaults. User/project direction and existing contracts override recommendations;
record a conflicting checklist as not applicable with its governing source, never silently waive
accessibility or state correctness.

Decisions remain in existing `motion.md` or phase task records; findings remain in `qa.md` with
Introduced/Regression/Pre-existing classification. The review matrix is manual, not measured by
`verify interaction`; existing interaction evidence and owner acceptance remain distinct.

## Files and Compatibility

- New guide: `skill/references/ui-transition-rules.md`.
- Minimal routing: `skill/SKILL.md`, `skill/references/animation-thinking.md`,
  `skill/references/animation-opportunity-and-review.md`, `skill/references/workflow-web.md`.
- Packaging/release: one required-resource addition in `skill/references/package-resources.json`
  and one entry in `CHANGELOG.md`, preserving existing unrelated edits.
- Change records: this proposal, design, tasks and delta under existing `design-pipeline` capability.

No paths move, public artifacts change, callers migrate or runtime behavior changes. Catalog,
source bundles, third-party notices and tests intentionally remain unchanged: no upstream bytes
are shipped and existing package/routing checks can exercise this documentation integration.

## Verification

Final PR verification used a separate worktree on `origin/main` (`35f6141`) containing only this
change. `npm run specs:check` passed all 26 spec/change items. Full `npm test` passed: 1474 repository
tests passed, 4 skipped, none failed (136 files), followed by reproducible archives/checksums,
required-resource checks, isolated installation, 12 browser-tool tests and both prewalk self-tests.
The archives contain `references/ui-transition-rules.md`; the original dirty worktree was untouched.
The separate package smoke also produced TGZ/ZIP/checksums successfully. These are technical
packaging/routing observations, not live animation correctness or Visual Acceptance.

Earlier source-worktree checks passed 77 pinned-source tests and 76 strict spec/change items.
That dirty-worktree QA run reached 1442 passing tests and 4 skips but failed packaging on a missing
concurrently registered `references/motion-recipes/hp-ghost-bar.md`; an explicit-file focused run
also exceeded its 300s deadline. Those outcomes are historical, not the final PR verdict. The PR
does not include the unrelated motion-recipe edits, and its clean full-suite run passed.

The real CLI smoke used an isolated ignored directory, an absolute existing project path,
and the following sequence (replace `<temp-project>` with that path):

1. `node skill/scripts/designer-pipeline.cjs next --root "<temp-project>" --project-root "<temp-project>" --deliverable web --tier quick --mode freeform --json`
2. `node skill/scripts/designer-pipeline.cjs decide --root "<temp-project>" --project-root "<temp-project>" --stage components --choice scratch --answer "Write this UI from scratch; use project-authored transition rules" --json`
3. `node skill/scripts/designer-pipeline.cjs next --root "<temp-project>" --project-root "<temp-project>" --json`

Observed: initialization asked for component sources; the final response returned `stage: build`,
`guide: references/workflow-web.md#build` and `ok: true`. The guide's build and review links reached
the readable local transition rules, and its path was registered in required package resources.
Temporary workflow state was removed after inspection. This smoke proves routing and local
availability; the separate clean QA proves packaging/isolated installation. Neither grants live
animation correctness or Visual Acceptance.

# animate-ui-source: Animate UI as a searchable, installable component source

## Why

Closes #375 (part of #346). `imskyleen/animate-ui` (install `npx skills add imskyleen/animate-ui`)
is a component library and an agent skill: Motion-based primitives that keep the API of Radix UI,
Base UI and React Aria (reka-ui in Vue), so a shadcn/ui or hand-built component animates when its
import changes, plus its own entrance, text, number, button and pointer primitives and a shadcn
registry of backgrounds, styled buttons, page transitions and animated icons. The owner's ruling is
that the package is a superset of such a skill, and that references, component libraries and the
project's design system come before generic rules.

Measured before this change, at upstream `22a9236ae107328f8564edb7e3299375da3247af`:

- `grep -rn -i "animate-ui\|animate ui" skill/ sources.lock.json docs/`: no result.
- `design-system search --snapshot references/component-source-catalog.json --query "animate-ui"`:
  two unrelated vocabulary terms (`ease-out`, `linear`); `动效基元` and `shadcn 动效`: 0 records.
- `design-system route --query "animate-ui animated tabs" --platform web`: `tabs` goes to
  `smoothui/components`; Animate UI is not a candidate.

## What Changes

- **Catalog records** in the existing `component-source-catalog.json`: source
  `source/imskyleen/animate-ui` and component record `animate-ui/components` with a 99-item
  inventory read at the locked revision (33 drop-in primitives with the base libraries that have
  them, 48 own primitives, 9 backgrounds, 4 styled buttons, 3 page transitions, 2 icon sets). Each
  item has its import or registry name, install command, dependencies, docs page and English and
  Chinese keywords; the descriptions are this project's.
- **No upstream bytes.** The licence is MIT with the Commons Clause (no redistribution of the
  components themselves), so the package ships names and metadata only.
- **Routing.** A brief that names a catalog source gets that source's records first for every
  capability they advertise. A record may be marked `routing.selectWhenNamed`: unnamed, it is
  listed among the alternatives and never replaces the selected route. Recommended components
  carry their `import` and `bases`. `animate-ui` becomes a recognized capability name.
- **Guide** `references/animate-ui.md`: when to use the source, the four paths (upstream CLI,
  import swap, own primitive or registry file, hand-written motion), install, living beside
  existing shadcn/ui components, reduced motion, pace, `audit`, v1 migration, Vue, verification,
  and a table from each upstream skill capability to its place in this package.
- **Vocabulary links.** Nineteen terms of `motion-vocabulary.json` link to the guide section that
  ships the effect.
- **Provenance.** Lock entry `animate-ui` (`adapted-reference`, the guide as its document), a
  pinned inventory of upstream names with a refresh script, a governed tool entry in
  `frontend-stack-registry.json`, a notice.
- **Docs.** The routing documents list Animate UI as built in.

## Capabilities

- `design-pipeline`: component source discovery and routing.

## Reuse

- `component-source-catalog.json` with the `componentInventory` / `recommendations` shape SmoothUI
  uses, `design-system search` and `design-system route`, `sources.lock.json` adapted-reference
  documents with `sourceFiles` frontmatter, the pinned-fixture pattern of `ui-rule-coverage-map`
  and `motion-vocabulary`, `frontend-stack-registry.json` keyword tools, the motion gate,
  `motion-spec.md`, `ui-transition-rules.md` and `motion-vocabulary.json` as link targets.

## Impact

- New: `skill/references/animate-ui.md`, `scripts/refresh-animate-ui-fixture.cjs`,
  `tests/animate-ui-source.test.cjs`, `tests/fixtures/animate-ui/upstream-inventory.json`.
- Changed: `skill/scripts/component-route-core.cjs` (named-source order, `selectWhenNamed`,
  `import` and `bases` in component details), `skill/scripts/design-system-catalog-core.cjs`
  (capability `animate-ui`), `component-source-catalog.json` (2 records; 19 regenerated vocabulary
  records), `motion-vocabulary.json`, `frontend-stack-registry.json`, `sources.lock.json`,
  `SKILL.md`, `companion-skills.md`, `capability-routing.md`, `feature-routes.md`,
  `pipeline-reference.md`, `ui-craft-sources.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `tests/source-governance.test.cjs`, `THIRD_PARTY_NOTICES.md`,
  `docs/features.md`, `CHANGELOG.md`.
- Route results change in two ways: a brief that names `animate-ui` is routed to it, and Animate UI
  appears among the alternatives of the capabilities it covers. The selected route of every brief
  that does not name it is the one it had (held by a test over every capability).
- Not in this change: the upstream rule, token, recipe and interaction text
  (`rules.md`, `tokens.md`, `recipes/`, `interactions/`, about 2,400 lines) is not copied or
  restated rule by rule; generic rule layers wait for the ablation result (#372). Hand-written
  motion keeps going through the existing motion gate. No new CLI command or flag, gate, receipt
  field or job.

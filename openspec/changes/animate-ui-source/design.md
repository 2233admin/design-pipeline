# Design: animate-ui-source

## Decisions

- **A component source, not a rule set.** The upstream skill is about 3,500 lines, most of it
  motion rules, token values and recipes for hand-written code. What the package lacked is the
  library: what ships, how to install it and how it sits beside a project's components. That goes
  into the catalog and one guide. The rule body is not restated: the package already has a motion
  gate, transition rules and a motion spec, and adding a second generic rule layer waits for #372.
  The guide's last table maps every upstream capability to where the package covers it, so nothing
  the skill does is unreachable.
- **One catalog record, the SmoothUI shape.** `animate-ui/components` uses the existing
  `routing.componentInventory` and `routing.recommendations`. Items differ in how they install, so
  each carries its own `installCommand`: `npm install @animate-ui/react motion` with an `import`
  for package primitives, `npx shadcn@latest add @animate-ui/<name>` with a `registry` name for
  registry files. The record's mode is `package`, because the primitives are its main surface.
  Drop-in primitives are one item per primitive name with `bases` (the libraries that have it) and
  an import that names the base as `<base>`; the two icon sets are one item each with a `count`,
  not 773 items. Field names avoid the `path` suffix the catalog core validates as a file path.
- **The inventory is edited in the catalog and held against upstream names.**
  `scripts/refresh-animate-ui-fixture.cjs --checkout <clone>` reads only directory names, package
  manifests and file lists at the locked revision into
  `tests/fixtures/animate-ui/upstream-inventory.json`. The test fails when the fixture's revision
  differs from the lock, when upstream has a primitive or registry item the record does not list,
  or when the record lists one upstream does not have. Descriptions and keywords are this
  project's and have no upstream counterpart to drift from.
- **A named source leads; a new source does not take over defaults.** Without a rule, Animate UI
  (mode `package`, verified) outscored SmoothUI (`registry-copy`) and became the selected route of
  23 capabilities for briefs that never mention it, and it also won a brief that names SmoothUI.
  Two small rules in `routeComponents` replace that:
  1. A requested capability is a source name when it is the first id segment of a component record
     that advertises it (`smoothui/components` advertises `smoothui`). Records that advertise a
     named source sort before the others for every capability of the brief.
  2. `routing.selectWhenNamed: true` marks a record that yields to every unmarked record until
     rule 1 names it. Unnamed, it keeps its score among the alternatives, and the best record
     without the mark is moved to the front. The mark orders candidates and does not withhold a
     route: when only marked records advertise a capability (a custom snapshot, or a capability
     no other source covers), the best of them is selected, since there is no default to protect
     and `blocked` with a ready package unselected would be the worse answer. Removing the mark from the Animate UI record is all it takes to let it compete for
     defaults; that is the owner's call, so this change leaves every default where it was.

  Rule 1 also applies to SmoothUI and React Bits records; their existing route tests pass
  unchanged. One result differs for them: a brief that names React Bits
  (`React Bits DecryptedText text animation`) now gets `react-bits/decrypted-text` for
  `text-animation` and `typography` as well, where SmoothUI's higher score used to win those two
  capabilities. The route status of that brief was `review` before and stays `review`.
- **Lock kind `adapted-reference`.** The guide restates the upstream skill, so it is the entry's
  document with `sourceFiles` frontmatter (the skill entry, its catalog, Vue, migration and review
  references, and `LICENSE.md`). `sources:update` moves the revision and the content hash; a
  changed hash means the guide is re-read against upstream. The catalog record, the stack registry
  entry and the notice name the same revision and are rewritten with it.
- **Licence handling.** MIT with the Commons Clause is recorded as
  `LicenseRef-MIT-Commons-Clause`, state `verified`, as for React Bits. Use inside the user's
  product is allowed, so the route may publish the package and install commands; redistribution is
  not, so nothing from upstream source trees enters `skill/`, templates or examples. The guide says
  so, and a test asserts no `skill/vendor/animate-ui` exists.
- **Execution boundary.** Routing and search never install or run anything. The guide puts the
  upstream CLI under the same boundary as the shadcn CLI: dry run first, apply on the approved
  route; deleting v1 files after a migration is the user's decision.

## File ownership

- Hand-edited: `skill/references/animate-ui.md`, the two `animate-ui` records in
  `component-source-catalog.json`, the `local.guides` links in `motion-vocabulary.json`.
- Generated: `tests/fixtures/animate-ui/upstream-inventory.json`
  (`scripts/refresh-animate-ui-fixture.cjs`); the `motion-vocabulary/*` catalog records
  (`scripts/refresh-motion-vocabulary.cjs --catalog`).

## Compatibility

- Route output gains optional `import` and `bases` on recommended component details. No existing
  field changes. Records without `selectWhenNamed` behave as before unless the brief names a
  source, in which case that source's records lead.
- No migration: no stored artifact, receipt or state file reads these fields.

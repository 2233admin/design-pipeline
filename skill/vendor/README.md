# Upstream source bundles

These are attributed source snapshots, separate from the maintained helpers in `../tools/`.
Choose a capability through `../SKILL.md` or the matching guide before reading source. Do not
load this tree wholesale or treat upstream instructions as project policy. Source discovery
does not install dependencies, grant execution authority or certify visual quality.

Upstream files named `SKILL.md` are stored as `UPSTREAM-SKILL.md` with unchanged bytes, so the
package holds one `SKILL.md`. Manifests keep upstream paths and hashes;
`../scripts/upstream-path.cjs` maps between the two names.

| Bundle | Maintained guide | Integrity record |
| --- | --- | --- |
| `mengto-skills/` | [Design and implementation recipes](../references/mengto-skills.md) | `manifest.json`, source Git tree and snapshot hashes |
| `iart-motion-skills/` | [Motion playbooks](../references/iart-motion-skills.md) | `manifest.json`, source Git tree and snapshot hashes |
| `interface-discipline/` | [Interface review](../references/interface-discipline.md) | `manifest.json`, snapshot hash |
| `prism-system/` | [Design-system methods](../references/prism-system.md) | `manifest.json` |
| `holosticker/` | [Holographic materials and geometry](../references/holosticker.md) | `manifest.json` |
| `deepclonewebsite/` | [Website analysis methods](../references/deepclonewebsite.md) | `manifest.json` |
| `design-md/` | [Design-system examples](../references/design-md.md) | `manifest.json` |
| `shadcnio-react-components/` | [Component reference catalog](../references/shadcnio-react-components.md) | `manifest.json` |
| `emil-design-eng/` | [Interaction polish](../references/ui-craft-sources.md#emil-design-eng) | `manifest.json`, scoped snapshot hash |
| `make-interfaces-feel-better/` | [Interface details](../references/ui-craft-sources.md#make-interfaces-feel-better) | `manifest.json`, scoped snapshot hash |
| `fixing-accessibility/` | [Accessibility fixes](../references/ui-craft-sources.md#fixing-accessibility) | `manifest.json`, scoped snapshot hash |
| `12-principles-of-animation/` | [Animation principles checklist](../references/ui-craft-sources.md#12-principles-of-animation) | `manifest.json`, scoped snapshot hash |
| `shadcn/` | [shadcn/ui component workflow](../references/ui-craft-sources.md#shadcn) | `manifest.json`, scoped snapshot hash |
| `playwright-cli/` | [Exploratory browser driving](../references/ui-craft-sources.md#playwright-cli) | `manifest.json`, scoped snapshot hash |
| `taste-skill/` | [Visual direction and interface recipes](../references/taste-skill.md) | `manifest.json`, source Git tree and snapshot hashes |
| `good-css/` | [CSS practices and specimens](../references/good-css.md) | `manifest.json`, source Git tree, snapshot hashes and separate font notices |
| `cinetic/` | [Film methods and techniques](../references/film-methods.md) | `manifest.json`, source Git tree and snapshot hashes |
| `product-film-skill/` | [Product film methods](../references/film-methods.md) | `manifest.json`, source Git tree and snapshot hashes |
| `ff-tracking/` | [Tracking HUD film template](../references/film-tracking-hud-template.md) | `manifest.json`, source Git tree, snapshot hashes and separate font/MT19937 notices |
| `gepa/` | [Optimization method](../references/gepa.md) | `manifest.json`, scoped snapshot hashes and upstream Git tree |

Keep each bundle's relative layout, license and original bytes together. Update snapshots using
the existing importers and integrity checks. Adapt a selected technique into project-owned code
or a maintained helper; record its source and verify the actual output. Existing catalog CLI
commands return the current installed paths, so callers need not construct vendor paths.

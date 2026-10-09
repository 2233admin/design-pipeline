# Maintaining built-in film methods

Task selection and complete capability mapping live in
[`skill/references/film-methods.md`](../skill/references/film-methods.md). Raw sources live under
`skill/vendor/cinetic/upstream` and `skill/vendor/product-film-skill/upstream`; do not edit them.
Their manifests lock every original blob, mode, size and SHA-256, licenses and source boundaries.

The reviewed revisions are Cinetic `bee5d7807205d5543472c38312507f9bf366cbbf` and
product-film-skill `fe11efc429d5903e37274d0b294e1b95745b2881`. Reproduce an import from a clean
local checkout at the exact revision:

```text
npm run sources:import:film -- --name cinetic --source <clean-cinetic-checkout> --reviewed-at 2026-10-09
npm run sources:import:film -- --name product-film-skill --source <clean-product-film-checkout> --reviewed-at 2026-10-09
```

Refreshing a source requires a new deliberate license/content review, pinned importer constants
and source tests. A changed hash alone is not a reviewed update. Preserve the source bytes via
`.gitattributes`, register new load-bearing packaged files in `package-resources.json`, and add
tests to `scripts/test-manifest.json` and the existing source suite. Package all reviewed files;
linked media and external dependency installations are outside the snapshot.

Run `node scripts/run-film-methods-eval.cjs --render` to reproduce the branded component promo
and loop; its [fixture notes](../evals/cases/film-methods/README.md) describe outputs and limits.
Run focused source/helper/eval tests,
then `npm run sources:check`, `npm run specs:check` and `npm test` on a frozen implementation tree.
`npm test` also checks isolated packaging and installation. Report the actual executed platform,
component source and output observations. Source-only scripts, WSL, cloud tools and unheard audio
remain unverified; structural checks never substitute for Visual Acceptance.

Prompt Motion cases are reusable through the bundled
[template library](../skill/references/prompt-motion/README.md). Maintain its indexed sources,
curated recipes and review candidates with [the maintenance guide](prompt-motion-template-maintenance.md).
The [case entry points](../skill/references/prompt-motion.md) preserve observation limits and
the existing `reference.md` / `reference-evidence.json` adoption flow.

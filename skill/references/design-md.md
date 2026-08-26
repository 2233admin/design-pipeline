# Built-in DesignMD Example Library

`design-pipeline` ships the reviewed source tree from
[`dimabraven/design-md`](https://github.com/dimabraven/design-md) as a pinned, MIT-attributed
package resource. It is the offline example catalog. Live DesignMD Directory ingest remains a
separate `designmd sync` snapshot.

The GitHub examples are inspiration-only. They must not replace a product `DESIGN.md`, and the
pipeline does not wrap `npx designmd-cli install`.

## Operating Protocol

1. Search bundled examples when no directory catalog is present:

   ```bash
   designer-pipeline designmd search --query "keyboard-first dark productivity" --json
   designer-pipeline designmd inspect --id design-md:example:linear --json
   designer-pipeline designmd verify --json
   ```

2. Sync and search the live directory only when the user asks for DesignMD Directory coverage:

   ```bash
   designer-pipeline designmd sync --output-root .design-pipeline/designmd --json
   designer-pipeline designmd search --catalog .design-pipeline/designmd/designmd-catalog.json --query "accessibility" --json
   ```

3. Cite a bundled example from requirements-driven synthesis as attributed evidence. Synthesize a
   product-specific `DESIGN.md`. Do not copy Stripe, Linear, or Vercel files into the target as the
   product system.

## Activation Boundary

Every bundled example is `reference-only`. Search and inspect never mark them executable-ready.

## Maintaining The Snapshot

```bash
node scripts/import-design-md.cjs --source /path/to/design-md --reviewed-at YYYY-MM-DD
node skill/scripts/designer-pipeline.cjs designmd verify --json
node --test tests/design-md-source.test.cjs
```

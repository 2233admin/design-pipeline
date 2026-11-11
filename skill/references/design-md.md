# Built-in DesignMD Example Library

`design-pipeline` ships the reviewed source tree from
[`dimabraven/design-md`](https://github.com/dimabraven/design-md) as a pinned, MIT-attributed
package resource. It is the offline example catalog. Live DesignMD Directory ingest remains a
separate `designmd sync` snapshot.

The same `designmd search` also covers the brand design-system catalog: 198 systems "inspired by"
real products and styles (Airbnb, Linear, Stripe, iOS apps, brutalism, bento ...), each with a
DESIGN.md, a `tokens.css` in one shared token schema, and, for most, a component fixture
(`components.html`), usage notes and a token report. Sources: `nexu-io/open-design` (Apache-2.0,
152 systems) and `feimacode/open-design-agent-kit` (MIT, 46 systems plus correction overlays for
57 open-design systems), pinned in `vendor/brand-design-systems/manifest.json`. The package
carries only that manifest and the licences; download the systems once (9.3 MB, 1,144 files,
each checked by size, Git blob id and SHA-256):

```bash
designer-pipeline sources fetch --bundle brand-design-systems
```

Until then `designmd search` returns the examples plus a `catalogs` entry naming that command, and
`--kind design-system` or an `inspect` of a system fails `TOOL_MISSING`. `doctor` lists the
download under `downloads`. If the downloaded copy stops verifying, plain search still returns the
examples and reports the catalog `blocked` with the fix (remove the named folder, fetch again).

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

3. Learn from the brand design systems (after the fetch). Each result carries `name`, `category`,
   `description`, `palette` (mode, primary, background, text and a one-line `signature`),
   `contentPath` (the system's DESIGN.md) and `files` (tokens.css, components.html, USAGE.md, the
   token report, and any `corrections/` overlay):

   ```bash
   designer-pipeline designmd search --kind design-system --query "dark developer tool" --json
   designer-pipeline designmd inspect --id design-md:design-system:linear-app --json
   ```

   `inspect` adds `frontMatter`: the system's tokens normalised to Google DESIGN.md front matter
   (`colors` named primary, on-primary, background, surface, on-surface, outline ...; `typography`
   display, headline, title, body-lg, body, body-sm, label, code; `rounded`; `spacing`), derived
   from `tokens.css` with the correction overlay applied and `color-mix()`/`oklch()` computed to hex.
   Values it cannot express are listed in `omittedTokens`; colours outside sRGB, whose hex is the
   clamped colour, in `clampedTokens`. Compare systems through it; read
   DESIGN.md and `components.html` for the reasoning and the component treatment.

4. Cite a bundled example or system from requirements-driven synthesis as attributed evidence.
   Synthesize a product-specific `DESIGN.md`. Do not copy Stripe, Linear, Vercel or any catalog
   system's files or front matter into the target as the product system.

## Activation Boundary

Every bundled example and brand design system is `reference-only`. Search and inspect never mark
them executable-ready. A brand-referencing system is an aesthetic study of a public product, not
that brand's official asset; for a real brand in the brief, use `brand-facts.md`.

## Maintaining The Snapshot

```bash
node scripts/import-design-md.cjs --source /path/to/design-md --reviewed-at YYYY-MM-DD
node skill/scripts/designer-pipeline.cjs designmd verify --json
node --test tests/design-md-source.test.cjs
```

The brand catalog is rebuilt from clean checkouts of both reviewed revisions; the importer refuses
other revisions and any content that differs from the reviewed hashes:

```bash
npm run sources:import:brand-design-systems -- --open-design /path/to/open-design --agent-kit /path/to/open-design-agent-kit --reviewed-at YYYY-MM-DD
node --test tests/brand-design-systems.test.cjs
```

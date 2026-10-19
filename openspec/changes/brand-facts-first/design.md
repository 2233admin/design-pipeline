# Design

## File ownership

- `skill/scripts/design-synthesis-core.cjs` parses the declaration once: `declaredBrands(text)` returns
  the brand list and the facts path from Product Context, or null (no line, `none`, `无`).
  `brandKey` is the one name comparison (NFKC, whitespace collapsed, case-insensitive equality).
- `skill/scripts/design-system-package-core.cjs` owns the checks: `validateBrands` extends the
  tokens.json validation, `brandFindings` produces the findings, `checkDesignSystemPackage` appends
  them after the DESIGN.md drift check, and `projectBrandFindings` serves callers that do not run the
  whole package check.
- `skill/scripts/cli-core.cjs`: `foundation check --kind all` also runs the package check when real
  brands are declared, so a missing package is reported; `--kind system` and `design-system check`
  already run it.
- `skill/scripts/workflows/web.cjs` `buildStatus` returns `projectBrandFindings` when the components
  stage is finished, so the build action shows them ahead of its instruction.
- `skill/references/brand-facts.md` is the guide; it is listed in `package-resources.json`.

## Data shape

```json
{ "color": { "tokens": [
    { "name": "stripe-purple", "value": "#635bff", "usage": "The Stripe accent, on paper only.",
      "brand": "Stripe", "source": "design-system/assets/logos/stripe.svg" } ] },
  "brands": { "Stripe": { "logo": { "path": "design-system/assets/logos/stripe.svg",
                                    "source": "https://stripe.com/newsroom/brand-assets" } },
              "Meta":   { "colours": "none", "logo": { "path": "...", "source": "owner" } } } }
```

`source` is an https URL, `owner`, or a project-relative file. For a project text asset (svg, css,
html, json, txt, md) the token's default-theme hex must appear in the file; an empty file fails.
`colours` can only be `"none"`, and it conflicts with a token carrying that brand. `brand` and `source`
change nothing in the generated CSS or DESIGN.md besides carrying the colour through the existing
generator.

## Findings

Each is `{file, code, severity, message, fix}`: `brand-package-missing`, `brand-facts-missing`,
`brand-fact-unsourced`, `brand-facts-uncovered`, `brand-colour-missing`, `brand-colour-unsourced`,
`brand-colour-not-in-source`, `brand-logo-missing`, `brand-logo-multiple`, `brand-logo-invalid`.
The facts file groups facts under a `## <Brand>` heading per brand (exact name); every list item needs
an https URL or `source: owner`.

## Compatibility

Projects without the declaration behave as before. No compatibility alias is kept for the Source
Decisions `Logo` and `Brand colour` lines of the earlier draft of this change; they were never
released.

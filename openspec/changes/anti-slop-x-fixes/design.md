# Design

## Sources

- anthropics/skills `skills/frontend-design/SKILL.md` at ca45fc496a3436251f191354091d557da31c15b5
  (Apache-2.0), SHA-256 d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3. Only
  the five clusters are used, paraphrased; the file is not bundled.
- Nutlope/hallmark `skills/hallmark/references/gates.md` §2 (MIT): a waiver reason under 24
  characters or reused word for word is refused. Our rule keeps hard rules unwaivable as before;
  the length check runs after the hard-rule check so that error stays first.
- nexu-io/open-design `packages/contracts/src/design-systems/components-manifest.ts` (Apache-2.0):
  declared vs referenced custom properties and literal counts. Our check is our own code.

## Token use

Declared names are the custom properties `compileTokensCss` writes from tokens.json, plus any
custom property declared in `bundle.css` or a preview (a local alias such as `--row-rule` is
allowed). CSS is read from `bundle.css` whole and from previews' `<style>` blocks and `style`
attributes; comments are dropped. Raw colours are hex, `rgb[a]`, `hsl[a]`, `oklch`, `oklab`, `lab`,
`lch` outside custom-property declarations. Raw px values are not reported: borders and hairlines
make them noise. Unused tokens are reported in `tokenUse.unused`, not as findings.

## Compatibility

A package whose previews hard-code colours or fonts now reads `invalid`. Evidence with one generic
rationale across rules is now refused; the repository's own fixtures already had distinct ones.

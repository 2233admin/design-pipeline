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

Declared names are the custom properties `compileTokensCss` writes from tokens.json, plus custom
properties declared in `bundle.css` (loaded with every preview, so shared) and, for a preview only,
those declared in that preview. CSS is read from `bundle.css` whole and from previews' `<style>`
blocks and `style` attributes (double-, single- or unquoted, HTML entities decoded); HTML comments
and `<script>` content are skipped first, so a `<style>` inside `<!-- -->` is not live CSS.

The CSS is tokenised before scanning: comments drop, string literals become placeholders (restored
only when a font stack is reported), `url(...)` contents drop, and `@font-face` and `@property`
blocks drop whole. Text before `{` is a selector or at-rule prelude and is never scanned; what is
left splits into `property: value` declarations. A custom property is declared only by a declaration
that starts with it, so `.btn--primary:hover` and `/* --ghost: 1 */` declare nothing. Raw colours are
hex and `rgb[a]`, `hsl[a]`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color()` and `color-mix()` in
non-custom-property values; preview SVG paint attributes (`fill`, `stroke`, `stop-color`,
`flood-color`, `lighting-color`) are read too, ignoring `none`, `currentColor`, `url(#...)` and
`var()`. A derived colour belongs in a custom-property declaration. A `font-family` other than
`var(--font-...)` or `inherit`/`initial`/`unset` (with optional `!important`) is a raw stack.

Known limits: named colours (`white`, `red`) are not detected, the `font` shorthand is not checked,
and raw px values are not reported (borders and hairlines make them noise). Unused tokens are
reported in `tokenUse.unused`, not as findings.

## Waiver rationale

Length is a weight, not `String.length`: whitespace and Unicode punctuation do not count, and a Han,
Hiragana, Katakana or Hangul character counts as 2, so the 24 threshold is about 12 Chinese
characters and `"aaaa...!!!!"` padding with punctuation does not pass. The copy check compares only
`accepted-context` and `not-applicable` rationales, keyed without case, whitespace or punctuation;
`pass` notes such as "Checked on the rendered page." may repeat. Both checks prompt an explanation
and cannot detect deliberate gaming (a 24-letter nonsense string, or a copy with one word changed).
The evidence schema expresses what JSON Schema can: a waiver needs a rationale of at least 12
characters, with the evaluator's rule in its description.

## Compatibility

A package whose previews hard-code colours or fonts now reads `invalid`. Evidence with one generic
rationale across rules is now refused; the repository's own fixtures already had distinct ones.

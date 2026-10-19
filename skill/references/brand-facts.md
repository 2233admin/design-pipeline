# Brand facts first

Read this when the brief names a real brand, company or product (Stripe, DJI Pocket 4, the owner's
own company), including a comparison or ranking page that lists several of them. Left alone the
model guesses a colour from memory, redraws a logo or states a spec it never checked; each of those
makes the page look like any other. The rule: assets and facts come from official sources, are
written down with where they came from, and the page references those files.

## The trigger

The check is scoped by one declaration. In DESIGN.md `## Product Context` write

```
Real brands: Stripe, DJI Pocket 4
Brand facts: openspec/changes/<change-id>/brand-facts.md
```

or `Real brands: none` when the project's brand is its own invention. No declaration, or `none`,
means nothing is checked; a made-up brand is never blocked. Declare the brands while the brief is
taken, before design starts: the check cannot tell that a brief names a brand you left out.
The ui and web playback card therefore carries one line for it (`Real brands: Stripe, Meta (my
guess)` or `none`) whenever the conversation or brief names a real brand or product, and you copy
the confirmed line into Product Context when DESIGN.md is written. The ui playback validator does
not require this line (the card still needs its five lines), so existing playbacks stay valid; it is
instruction, not a gate. Names
are compared exactly (case-insensitive equality, never a substring): `Meta` is not `Meta Quest 3`,
so declare and record each one under its own name.

## 1. Verify the facts

Before designing, confirm each brand and product exists and what state it is in (released or
announced, version, the specs you will state). Use the official site, release notes or a press
page, not memory. Write the facts file (in the change directory when there is one, otherwise the project root): a
`## <Brand>` heading per declared brand, then one line per fact:

```
## DJI Pocket 4

- DJI Pocket 4 is released, version <x> (source: https://www.dji.com/<product>)
- DJI publishes brand assets for press use (source: https://www.dji.com/press)
```

Every fact line carries an `https://` source, or `(source: owner)` when the owner told you. A
fact you cannot source is deleted or asked about, not kept.

## 2. Get the assets, in this order

1. Ask the owner in one message, as a list: logo (SVG or high-resolution PNG), product images for a
   physical product, interface screenshots for a digital one, colour values, fonts, a brand
   guidelines file or link. Take what they send.
2. For what is missing, find the official source: the brand or press page (`<brand>.com/brand`,
   `/press`), the product page hero and gallery, the app store listing, the official launch video.
   For digital products and AI tools a public icon aggregator often returns a clean SVG when the
   site is a script-rendered shell.
3. Download into the project, then open each file: confirm it is a real SVG or image, not an HTML
   error page or a placeholder of a few bytes, and that it has a transparent background and a
   version for light and dark grounds.
4. Take colour values from those assets (grep hex codes out of the SVG, CSS or page source), not
   from a screenshot's pixels and not from memory. Filter out black, white and grey. A product
   screenshot often carries a demo brand's colour: that is not the product's colour, so tell the
   two apart. A brand can have a marketing palette and a product UI palette; both are real, pick the
   one for the deliverable.
5. Logo: one official logo per product on the page, referenced as a file, never redrawn in CSS or
   SVG. If none can be found, stop and ask the owner; do not substitute a generic mark. Other
   assets (product images, screenshots): search several channels, collect candidates, keep the few
   that are good enough (resolution above about 2000 px, clear licence, consistent light), and
   prefer an honest labelled placeholder to a weak image. Do not mock up a product screen.

Colour and font are supporting evidence; the logo, the product image or the interface is what
makes a page recognisably the brand.

## 3. Put the brand in the design-system package

The brand is not described in prose. Its values live in `design-system/tokens.json`
([design-system-package.md](design-system-package.md)), the single source `DESIGN.md` is generated
from, so a brand colour cannot drift between the two.

- Colours: each brand colour is an ordinary colour token that also carries `brand` and `source`:

  ```json
  { "name": "stripe-purple", "value": "#635bff", "usage": "The Stripe accent, on paper only.",
    "brand": "Stripe", "source": "design-system/assets/logos/stripe.svg" }
  ```

  `source` is an `https://` URL, `owner` (the owner supplied it) or a downloaded file in the project.
  When it is a text file (svg, css, html, json, txt, md) the token's hex must appear in it; an empty
  file fails. Use hex for brand colours. A brand whose colours the page does not use says so instead:
  `"brands": { "Stripe": { "colours": "none" } }`.
- Logo: the official file goes to `design-system/assets/logos/` (svg, png, webp or jpg) and is
  declared once per brand, with where it came from:

  ```json
  "brands": { "Stripe": { "logo": { "path": "design-system/assets/logos/stripe.svg",
                                    "source": "https://stripe.com/newsroom/brand-assets" } } }
  ```

  The README Iconography section states how the product uses it. Then regenerate the `DESIGN.md`
  `colors` group (`design-system design-md-tokens`): the brand values arrive there from the tokens.

## What the check stops

`designer-pipeline design-system check`, `foundation check --kind system` and `--kind all` (it runs
the package check whenever real brands are declared), and the web build step, which shows the same
findings first. Each finding is `{code, severity, message, fix}`:

| Code | Stops when |
| --- | --- |
| `brand-package-missing` | brands are declared and there is no readable `design-system/tokens.json` |
| `brand-facts-missing` | `Brand facts:` names no existing file inside the project |
| `brand-fact-unsourced` | a fact line has neither an `https://` URL nor `source: owner` |
| `brand-facts-uncovered` | a declared brand has no sourced fact under its own `## <Brand>` heading |
| `brand-colour-missing` | no colour token has that `brand`, and `brands.<Brand>.colours` is not `none` |
| `brand-colour-unsourced` | a brand token has no `source`, or one that is not an https URL, owner or an existing project file |
| `brand-colour-not-in-source` | the cited text asset does not hold the token's hex (or is empty), or the token is not hex |
| `brand-logo-missing` | `brands.<Brand>.logo` is absent |
| `brand-logo-multiple` | more than one logo is declared for a brand |
| `brand-logo-invalid` | the logo path is not an existing svg, png, webp or jpg under `design-system/assets/logos/` inside the project, or its source is missing |

A cited URL is recorded, not fetched: the check confirms the evidence is written down and the files
exist, not that a link is official. It never claims the page looks right; Visual Acceptance stays
with the owner.

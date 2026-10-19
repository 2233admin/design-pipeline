# Brand facts first

Read this when the brief names a real brand, company or product (Stripe, DJI Pocket 4, the owner's
own company), including a comparison or ranking page that lists several of them. Left alone the
model guesses a colour from memory, redraws a logo or states a spec it never checked; each of those
makes the page look like any other. The rule: assets and facts come from official sources, are
written down with where they came from, and the page references those files.

## The trigger

The gate is scoped by one declaration. In DESIGN.md `## Product Context` write

```
Real brands: Stripe, DJI Pocket 4
Brand facts: openspec/changes/<change-id>/brand-facts.md
```

or `Real brands: none` when the project's brand is its own invention. No declaration, or `none`,
means the gate does not apply; a made-up brand is never blocked. Declare the brands while the brief
is taken, before design starts: the check cannot tell that a brief names a brand you left out.

## 1. Verify the facts

Before designing, confirm each brand and product exists and what state it is in (released or
announced, version, the specs you will state). Use the official site, release notes or a press
page, not memory. Write one line per fact to the facts file (in the change directory when there is
one, otherwise the project root):

```
- <Product> is released, version <x> (source: https://<brand>.com/<product>)
- <Brand> publishes brand assets for press use (source: https://<brand>.com/press)
```

Every fact line ends with an `https://` source, or `(source: owner)` when the owner told you. A
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

## 3. Fix it as the brand spec in DESIGN.md Source Decisions

Record, for each declared brand, in `## Source Decisions`:

```
- Logo - Stripe: assets/stripe/logo.svg (source: https://stripe.com/newsroom/brand-assets)
- Brand colour - Stripe: #635BFF (source: assets/stripe/logo.svg)
```

Use `Brand colour - <brand>: none` when the page uses none of the brand's colours. Then take the
colours into the page's tokens from that line: a colour added later goes through DESIGN.md first.

## What the check stops

`designer-pipeline foundation check` (the DESIGN.md foundation gate, which `next` runs for
replicate and stages.md requires before implementation) and the web build step stop, each finding
with its fix, when a declared brand has: no existing facts file; a fact with no source; no fact
naming the brand; no Logo line, a Logo line with no existing logo file or no source, or more than
one Logo line; no Brand colour line; a colour with no source or, when it cites a text asset, a
value that asset does not contain. A cited URL is recorded, not fetched: the check confirms the
evidence is written down and the files exist, not that a link is official. It never claims the
page looks right; Visual Acceptance stays with the owner.

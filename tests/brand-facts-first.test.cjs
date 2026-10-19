"use strict";

// Brand facts first (OpenSpec change brand-facts-first): DESIGN.md Product Context declares the real
// brands; their colours are colour tokens carrying brand and source in design-system/tokens.json, their
// logo is declared in tokens.json brands, and the design-system package check (also run by foundation
// check --kind system|all and shown first by the web build step) reports what is missing. A project
// with its own made-up brand, or no declaration, is never checked.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkDesignSystemPackage, designMdTokens } = require("../skill/scripts/design-system-package-core.cjs");
const { checkDesignFoundation } = require("../skill/scripts/design-synthesis-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { initState, nextAction, decide } = require("../skill/scripts/workflow-core.cjs");
const { toComponents } = require("./helpers/web-flow.cjs");

const URL_LOGO = "https://stripe.com/newsroom/brand-assets";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#635BFF" d="M0 0h1v1z"/></svg>';
const LOGO = "design-system/assets/logos/stripe.svg";
const SOURCE_SVG = "design-system/assets/logos/stripe.svg";

function baseTokens() {
  return {
    name: "Pay",
    color: {
      themes: [{ id: "light", name: "Paper" }],
      tokens: [
        { name: "paper", value: "#ffffff", usage: "Page ground." },
        { name: "ink", value: "#111111", usage: "Text on paper." },
      ],
    },
    type: {
      families: { sans: "system-ui, sans-serif" },
      groups: [{ name: "Text", family: "sans", styles: [{ name: "body", fontSize: "15px", usage: "Sentences." }] }],
    },
    contrast: [{ text: "ink", on: ["paper"], min: 4.5 }],
  };
}

const stripe = (extra = {}) => ({ name: "stripe-purple", value: "#635bff", usage: "The Stripe accent, on paper only.", brand: "Stripe", source: SOURCE_SVG, ...extra });
const withBrand = (token, brands) => {
  const t = baseTokens();
  if (token) t.color.tokens.push(token);
  if (brands) t.brands = brands;
  return t;
};
const goodBrands = () => ({ Stripe: { logo: { path: LOGO, source: URL_LOGO } } });

function design(tokens, context = "Real brands: Stripe\nBrand facts: brand-facts.md") {
  return `---
version: alpha
name: Pay Page
${designMdTokens(tokens)}---

# Pay Page

## Product Context

A landing page for a payments integration.
${context}

## Overview

Calm and exact.

## Colors

One accent.

## Typography

A legible sans.

## Layout

One column.

## Components

Buttons and a card.

## Do's and Don'ts

- Do keep the logo clear.

## Source Decisions

- Adopted: compact rhythm.
- Rejected: decorative gradients.
`;
}

const README = "Pay.\n\n## Content fundamentals\n\n- Plain.\n\n## Visual foundations\n\nInk on paper.\n\n## Iconography\n\nNo icons; the logo is the file declared in tokens.json brands.\n";
const FACTS = "# Brand facts\n\n## Stripe\n\n- Stripe is a payments company (source: https://stripe.com/about)\n";

// A complete project: package, DESIGN.md with generated tokens, facts file, logo. `files` overrides
// (null removes a file).
function project(t, { tokens = withBrand(stripe(), goodBrands()), context, files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brand-facts-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const all = {
    "DESIGN.md": design(tokens, context),
    "brand-facts.md": FACTS,
    "design-system/README.md": README,
    "design-system/tokens.json": JSON.stringify(tokens, null, 1),
    "design-system/components/bundle.css": ".card { color: var(--ink); }\n",
    "design-system/components/Card/README.md": "# Card\n\nOne record.\n",
    "design-system/components/Card/preview.html": '<!-- @dsCard group="Data" height=80 -->\n<!doctype html>\n<html><head></head><body><div class="body">Card</div></body></html>\n',
    "design-system/components/Cover/preview.html": '<!-- @dsCard height=288 -->\n<!doctype html>\n<html><head></head><body><h1>Pay</h1></body></html>\n',
    [LOGO]: SVG,
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    if (content === null) continue;
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const check = (root) => checkDesignSystemPackage({ projectRoot: root });
const codes = (root) => check(root).findings.filter((f) => f.code).map((f) => f.code);

test("no declaration, or a made-up brand, is never checked", (t) => {
  for (const context of ["", "Real brands: none", "Real brands: 无"]) {
    const root = project(t, { tokens: withBrand(null, null), context, files: { "brand-facts.md": null, [LOGO]: null } });
    assert.deepEqual(codes(root), []);
    assert.equal(check(root).status, "ready", JSON.stringify(check(root).findings));
    assert.equal(checkDesignFoundation({ projectRoot: root }).status, "ready");
  }
});

test("a sourced brand colour token, one logo and a sourced fact pass every check", (t) => {
  const root = project(t);
  const result = check(root);
  assert.equal(result.status, "ready", JSON.stringify(result.findings));
  assert.match(designMdTokens(withBrand(stripe(), goodBrands())), /stripe-purple: "#635bff"/);
  assert.equal(execute(["foundation", "check", "--root", root, "--project-root", root, "--kind", "system"]).exitCode, 0);
  // `all` also wants MOTION.md; the package part of it is ready.
  const all = execute(["foundation", "check", "--root", root, "--project-root", root, "--kind", "all"]);
  assert.equal(all.output.foundations.system.status, "ready");
  assert.equal(execute(["design-system", "check", "--root", root, "--project-root", root]).exitCode, 0);
});

test("brand names match exactly: Meta is not satisfied by Meta Quest 3", (t) => {
  const tokens = withBrand(stripe({ name: "quest-blue", brand: "Meta Quest 3" }), { "Meta Quest 3": { logo: { path: LOGO, source: URL_LOGO } } });
  const facts = "## Meta Quest 3\n\n- Meta Quest 3 is released (source: https://www.meta.com/quest/quest-3/)\n";
  const root = project(t, { tokens, context: "Real brands: Meta\nBrand facts: brand-facts.md", files: { "brand-facts.md": facts } });
  const found = codes(root);
  assert.ok(found.includes("brand-colour-missing"));
  assert.ok(found.includes("brand-logo-missing"));
  assert.ok(found.includes("brand-facts-uncovered"));
  // Both declared, case-insensitively equal names do match.
  const both = project(t, { tokens, context: "Real brands: meta quest 3\nBrand facts: brand-facts.md", files: { "brand-facts.md": facts } });
  assert.deepEqual(codes(both), []);
  // A playback's guess note copied into the declaration is not part of the name.
  const noted = project(t, { tokens, context: "Real brands: Meta Quest 3 (my guess)\nBrand facts: brand-facts.md", files: { "brand-facts.md": facts } });
  assert.deepEqual(codes(noted), []);
});

test("a declared brand without a package is a finding with the fix", (t) => {
  const root = project(t, { files: { "design-system/tokens.json": null } });
  const result = check(root);
  assert.equal(result.status, "synthesis-required");
  const finding = result.findings.find((f) => f.code === "brand-package-missing");
  assert.match(finding.fix, /design-system-package\.md/);
  const all = execute(["foundation", "check", "--root", root, "--project-root", root, "--kind", "all"]);
  assert.equal(all.exitCode, 2);
  assert.ok(all.output.foundations.system.findings.some((f) => f.code === "brand-package-missing"));
});

test("every finding carries code, severity, message and a concrete fix", (t) => {
  const root = project(t, { tokens: withBrand(null, null), files: { "brand-facts.md": null } });
  const brand = check(root).findings.filter((f) => f.code);
  assert.deepEqual(brand.map((f) => f.code), ["brand-facts-missing", "brand-colour-missing", "brand-logo-missing"]);
  for (const f of brand) {
    assert.equal(f.severity, "error");
    assert.ok(f.message && f.fix.length > 30, f.code);
  }
});

test("a brand colour token without a usable source is refused", (t) => {
  for (const source of [undefined, "", "ftp://x", "assets/missing.svg", "../outside.svg"]) {
    const tokens = withBrand(stripe({ source }), goodBrands());
    const root = project(t, { tokens });
    assert.deepEqual(codes(root), ["brand-colour-unsourced"], String(source));
  }
  for (const source of [URL_LOGO, "owner"]) {
    assert.deepEqual(codes(project(t, { tokens: withBrand(stripe({ source }), goodBrands()) })), [], source);
  }
});

test("a cited text asset must hold the hex: an empty file or another colour fails", (t) => {
  const empty = project(t, { files: { [SOURCE_SVG]: "" } });
  assert.deepEqual(codes(empty), ["brand-colour-not-in-source"]);
  assert.match(check(empty).findings.find((f) => f.code === "brand-colour-not-in-source").message, /file is empty/);
  const wrong = project(t, { files: { [SOURCE_SVG]: SVG.replace("#635BFF", "#ff0000") } });
  assert.deepEqual(codes(wrong), ["brand-colour-not-in-source"]);
  const upper = project(t, { tokens: withBrand(stripe({ value: "#635BFF" }), goodBrands()) });
  assert.deepEqual(codes(upper), []);
});

test("colours none states the page uses none of the brand's colours", (t) => {
  const root = project(t, { tokens: withBrand(null, { Stripe: { colours: "none", logo: { path: LOGO, source: URL_LOGO } } }) });
  assert.deepEqual(codes(root), []);
  assert.equal(check(root).status, "ready", JSON.stringify(check(root).findings));
  const clash = project(t, { tokens: withBrand(stripe(), { Stripe: { colours: "none", logo: { path: LOGO, source: URL_LOGO } } }) });
  assert.match(check(clash).findings.map((f) => f.message).join("\n"), /colours is "none" but a colour token carries brand/);
});

test("a logo needs one existing file under assets/logos inside the project, with a source", (t) => {
  const logo = (value) => withBrand(stripe(), { Stripe: { logo: value } });
  assert.deepEqual(codes(project(t, { tokens: withBrand(stripe(), {}) })), ["brand-logo-missing"]);
  assert.deepEqual(codes(project(t, { tokens: logo({ path: "design-system/assets/logos/gone.svg", source: URL_LOGO }) })), ["brand-logo-invalid"]);
  assert.deepEqual(codes(project(t, { tokens: logo({ path: LOGO, source: "" }) })), ["brand-logo-invalid"]);
  assert.deepEqual(codes(project(t, { tokens: logo({ path: "../outside.svg", source: URL_LOGO }) })), ["brand-logo-invalid"]);
  assert.deepEqual(codes(project(t, { tokens: logo({ path: "assets/other/stripe.svg", source: URL_LOGO }), files: { "assets/other/stripe.svg": SVG } })), ["brand-logo-invalid"]);
  assert.deepEqual(codes(project(t, { tokens: logo({ path: "design-system/assets/logos/notes.txt", source: URL_LOGO }), files: { "design-system/assets/logos/notes.txt": "x" } })), ["brand-logo-invalid"]);
  assert.deepEqual(codes(project(t, { tokens: logo([{ path: LOGO, source: URL_LOGO }, { path: LOGO, source: URL_LOGO }]) })), ["brand-logo-multiple"]);
  const dup = withBrand(stripe(), { Stripe: { logo: { path: LOGO, source: URL_LOGO } }, stripe: { logo: { path: LOGO, source: URL_LOGO } } });
  assert.deepEqual(codes(project(t, { tokens: dup })), ["brand-logo-multiple"]);
});

test("the facts file needs a source on every fact and a heading per brand", (t) => {
  assert.deepEqual(codes(project(t, { files: { "brand-facts.md": FACTS + "- Stripe has an API\n" } })), ["brand-fact-unsourced"]);
  assert.deepEqual(codes(project(t, { files: { "brand-facts.md": "## Stripe\n\n- Stripe has an API (source: owner)\n" } })), []);
  assert.deepEqual(codes(project(t, { files: { "brand-facts.md": "## Someone else\n\n- A fact (source: https://example.com)\n" } })), ["brand-facts-uncovered"]);
  assert.deepEqual(codes(project(t, { context: "Real brands: Stripe" })), ["brand-facts-missing"]);
});

test("the web build step shows the brand findings first and finishes once they are fixed", (t) => {
  const root = project(t, { tokens: withBrand(null, null), files: { "brand-facts.md": null } });
  initState(root, { deliverable: "web", tier: "quick" });
  toComponents(root);
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries: [], fromScratch: true }));
  const blocked = nextAction(root);
  assert.equal(blocked.stage, "build");
  assert.deepEqual(blocked.findings.map((item) => item.code), ["brand-facts-missing", "brand-colour-missing", "brand-logo-missing"]);
  assert.match(blocked.instruction, /Fix: /);
  const tokens = withBrand(stripe(), goodBrands());
  fs.writeFileSync(path.join(root, "design-system", "tokens.json"), JSON.stringify(tokens, null, 1));
  fs.writeFileSync(path.join(root, "DESIGN.md"), design(tokens));
  fs.writeFileSync(path.join(root, "brand-facts.md"), FACTS);
  assert.equal(nextAction(root).stage, "probe");
});

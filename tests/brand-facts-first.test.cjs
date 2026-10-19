"use strict";

// Brand facts first (OpenSpec change brand-facts-first): a DESIGN.md that declares real brands owes a
// sourced facts file, one real logo and a sourced colour per brand before anything is built; the check
// is the existing design foundation check, and the web build step shows its findings. A project with
// its own made-up brand, or no declaration, is never blocked.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkDesignFoundation, brandFactFindings } = require("../skill/scripts/design-synthesis-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { initState, nextAction, decide } = require("../skill/scripts/workflow-core.cjs");
const { toComponents } = require("./helpers/web-flow.cjs");

const URL_LOGO = "https://stripe.com/newsroom/brand-assets";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#635BFF" d="M0 0h1v1z"/></svg>';

function design({ context = "Real brands: Stripe\nBrand facts: brand-facts.md", decisions = "" } = {}) {
  return `---
version: alpha
name: Pay Page
description: A payments landing page
---

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
${decisions}
`;
}

const GOOD = [
  `- Logo - Stripe: assets/stripe/logo.svg (source: ${URL_LOGO})`,
  "- Brand colour - Stripe: #635BFF (source: assets/stripe/logo.svg)",
].join("\n");

function project(t, { text = design({ decisions: GOOD }), facts = `- Stripe is a payments company (source: https://stripe.com/about)\n`, files = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brand-facts-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "DESIGN.md"), text);
  if (facts !== null) fs.writeFileSync(path.join(root, "brand-facts.md"), `# Brand facts\n\n${facts}`);
  if (files) {
    fs.mkdirSync(path.join(root, "assets", "stripe"), { recursive: true });
    fs.writeFileSync(path.join(root, "assets", "stripe", "logo.svg"), SVG);
  }
  return root;
}

const codes = (root) => brandFactFindings(fs.readFileSync(path.join(root, "DESIGN.md"), "utf8"), root).map((item) => item.code);

test("a project with no declaration, or with its own made-up brand, is not blocked", (t) => {
  for (const context of ["", "Real brands: none", "Real brands: 无"]) {
    const root = project(t, { text: design({ context }), facts: null, files: false });
    assert.deepEqual(codes(root), []);
    assert.equal(checkDesignFoundation({ projectRoot: root }).status, "ready");
  }
});

test("verified facts, a real logo file and a sourced colour pass the foundation check", (t) => {
  const root = project(t);
  assert.deepEqual(codes(root), []);
  assert.equal(checkDesignFoundation({ projectRoot: root }).status, "ready");
  const cli = execute(["foundation", "check", "--root", root, "--project-root", root, "--kind", "design"]);
  assert.equal(cli.exitCode, 0);
});

test("every finding carries a concrete fix and the foundation check stops on them", (t) => {
  const root = project(t, { text: design({ decisions: "" }), facts: null, files: false });
  assert.deepEqual(codes(root), ["brand-facts-missing", "brand-logo-missing", "brand-colour-missing"]);
  for (const finding of brandFactFindings(fs.readFileSync(path.join(root, "DESIGN.md"), "utf8"), root)) {
    assert.ok(finding.fix.length > 30, finding.code);
  }
  assert.throws(() => checkDesignFoundation({ projectRoot: root }), /brand facts are unverified.*Fix: /s);
  assert.equal(execute(["foundation", "check", "--root", root, "--project-root", root, "--kind", "design"]).exitCode === 0, false);
});

test("a fact without a source, or a brand with no fact, is refused", (t) => {
  const unsourced = project(t, { facts: "- Stripe is a payments company\n- Stripe has an API (source: owner)\n" });
  assert.deepEqual(codes(unsourced), ["brand-fact-unsourced"]);
  const uncovered = project(t, { facts: "- Some other company exists (source: https://example.com)\n" });
  assert.deepEqual(codes(uncovered), ["brand-facts-uncovered"]);
});

test("a logo needs a real file, a source and to be the only one for its brand", (t) => {
  const noFile = project(t, { text: design({ decisions: GOOD.replace("assets/stripe/logo.svg (source", "assets/stripe/missing.svg (source") }) });
  assert.ok(codes(noFile).includes("brand-logo-file-missing"));
  const noSource = project(t, { text: design({ decisions: GOOD.replace(` (source: ${URL_LOGO})`, "") }) });
  assert.deepEqual(codes(noSource), ["brand-logo-unsourced"]);
  const two = project(t, { text: design({ decisions: `${GOOD}\n- Logo - Stripe: assets/stripe/logo.svg (source: ${URL_LOGO})` }) });
  assert.deepEqual(codes(two), ["brand-logo-multiple"]);
});

test("a brand colour from memory is refused, one the cited asset does not hold is refused, none is allowed", (t) => {
  const logo = `- Logo - Stripe: assets/stripe/logo.svg (source: ${URL_LOGO})`;
  const memory = project(t, { text: design({ decisions: `${logo}\n- Brand colour - Stripe: #635BFF` }) });
  assert.deepEqual(codes(memory), ["brand-colour-unsourced"]);
  const wrong = project(t, { text: design({ decisions: `${logo}\n- Brand colour - Stripe: #FF0000 (source: assets/stripe/logo.svg)` }) });
  assert.deepEqual(codes(wrong), ["brand-colour-not-in-source"]);
  const none = project(t, { text: design({ decisions: `${logo}\n- Brand colour - Stripe: none` }) });
  assert.deepEqual(codes(none), []);
  const owner = project(t, { text: design({ decisions: `${logo}\n- Brand colour - Stripe: #635BFF (source: owner)` }) });
  assert.deepEqual(codes(owner), []);
});

test("the web build step shows the brand findings first and finishes once they are fixed", (t) => {
  const root = project(t, { text: design({ decisions: "" }), facts: null, files: false });
  initState(root, { deliverable: "web", tier: "quick" });
  toComponents(root);
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries: [], fromScratch: true }));
  const blocked = nextAction(root);
  assert.equal(blocked.stage, "build");
  assert.deepEqual(blocked.findings.map((item) => item.code), ["brand-facts-missing", "brand-logo-missing", "brand-colour-missing"]);
  assert.match(blocked.instruction, /^Product Context declares real brands/);
  fs.writeFileSync(path.join(root, "DESIGN.md"), design({ decisions: GOOD }));
  fs.writeFileSync(path.join(root, "brand-facts.md"), "- Stripe is a payments company (source: https://stripe.com/about)\n");
  fs.mkdirSync(path.join(root, "assets", "stripe"), { recursive: true });
  fs.writeFileSync(path.join(root, "assets", "stripe", "logo.svg"), SVG);
  assert.equal(nextAction(root).stage, "probe");
});

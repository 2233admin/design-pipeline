"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const {
  checkDesignSystemPackage,
  compileDesignSystemPackage,
  compileTokensCss,
  designMdTokens,
} = require("../skill/scripts/design-system-package-core.cjs");

const cli = path.resolve(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const roots = new Set();

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function tokens() {
  return {
    name: "Ledger",
    version: 1,
    color: {
      themes: [{ id: "light", name: "Paper" }, { id: "dark", name: "Night" }],
      tokens: [
        { name: "paper", value: { light: "#f5f0e6", dark: "#1d1a16" }, usage: "Page ground." },
        { name: "ink", value: { light: "#1f1c17", dark: "#f3ece3" }, usage: "Text on paper." },
        { name: "link", value: "{ink}", usage: "Links on paper." },
      ],
    },
    type: {
      fonts: [],
      families: { sans: "system-ui, sans-serif" },
      groups: [{ name: "Text", family: "sans", styles: [{ name: "body", fontSize: "15px", lineHeight: 1.6, fontWeight: 400, usage: "Sentences." }] }],
    },
    spacing: { tokens: [{ name: "space-2", value: "8px", usage: "Inline gaps." }] },
    radius: { tokens: [{ name: "radius-none", value: "0px", usage: "Everything." }] },
    contrast: [{ text: "ink", on: ["paper"], min: 4.5 }],
  };
}

const README = "Ledger keeps records.\n\n## Content fundamentals\n\n- Plain words.\n\n## Visual foundations\n\nSet text in `ink` on `paper`.\n\n## Iconography\n\nNo icons.\n";
const PREVIEW = '<!-- @dsCard group="Status" height=80 -->\n<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body><div id="root" class="body">Entry</div></body>\n</html>\n';

function writePackage(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-system-"));
  roots.add(root);
  const dir = path.join(root, "design-system");
  const files = {
    "README.md": README,
    "tokens.json": JSON.stringify(tokens(), null, 1),
    "components/bundle.css": ".entry { color: var(--ink); }\n",
    "components/Entry/README.md": "# Entry\n\nOne record with its evidence.\n",
    "components/Entry/preview.html": PREVIEW,
    "components/Cover/preview.html": '<!-- @dsCard height=288 -->\n<!doctype html>\n<html><head></head><body><h1>Ledger</h1></body></html>\n',
    ...overrides,
  };
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

function messages(result) {
  return result.findings.map((finding) => `${finding.file}: ${finding.message}`).join("\n");
}

test("a complete package is ready and reports contrast per theme", () => {
  const result = checkDesignSystemPackage({ projectRoot: writePackage() });
  assert.equal(result.status, "ready", messages(result));
  assert.deepEqual(result.components, ["Entry"]);
  assert.deepEqual(result.contrast.map((pair) => pair.theme), ["light", "dark"]);
  assert.ok(result.contrast.every((pair) => pair.ratio >= 4.5));
});

test("a project without a package needs synthesis", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-system-"));
  roots.add(root);
  assert.equal(checkDesignSystemPackage({ projectRoot: root }).status, "synthesis-required");
});

test("missing usage notes, map-shaped families and broken aliases are findings", () => {
  const bad = tokens();
  delete bad.color.tokens[0].usage;
  bad.color.tokens[2].value = "{missing}";
  bad.spacing = { "space-2": { $value: "8px" } };
  const result = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(bad) }) });
  assert.equal(result.status, "invalid");
  const text = messages(result);
  assert.match(text, /color\.paper: missing usage note/);
  assert.match(text, /color\.link: no valid colour for theme light/);
  assert.match(text, /spacing must be \{"tokens"/);
});

test("contrast is checked in every theme and must be declared", () => {
  const low = tokens();
  low.color.tokens[1].value.dark = "#2a2620";
  const result = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(low) }) });
  assert.match(messages(result), /contrast ink on paper \(dark\) is 1\.\d+:1, below 4\.5:1/);
  const none = tokens();
  delete none.contrast;
  assert.match(messages(checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(none) }) })), /contrast must list/);
});

test("names must be valid unescaped CSS names", () => {
  const bad = tokens();
  bad.spacing.tokens[0].name = "space.2";
  bad.type.groups[0].styles[0].name = "2xl";
  const text = messages(checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(bad) }) }));
  assert.match(text, /spacing\.space\.2: invalid token name/);
  assert.match(text, /type style 2xl: invalid name/);
});

test("numeric spacing and radius are written with px in CSS and DESIGN.md", () => {
  const numeric = tokens();
  numeric.spacing.tokens[0].value = 8;
  assert.match(compileTokensCss(numeric), /--space-2: 8px;/);
  assert.match(designMdTokens(numeric), /space-2: 8px/);
});

test("--kind all ignores a design-system folder without tokens.json", () => {
  const root = writePackage({ "tokens.json": null });
  const sections = ["Overview", "Colors", "Typography", "Layout", "Components", "Do's and Don'ts", "Product Context", "Source Decisions"];
  fs.writeFileSync(path.join(root, "DESIGN.md"), `---\nname: Ledger\n---\n\n${sections.map((h) => `## ${h}\n\nAdopted ink. Rejected none.\n`).join("\n")}`);
  const out = spawnSync(process.execPath, [cli, "foundation", "check", "--kind", "design", "--root", root, "--project-root", root], { encoding: "utf8" });
  assert.equal(JSON.parse(out.stdout).foundations.design.status, "ready", out.stdout);
  const all = JSON.parse(spawnSync(process.execPath, [cli, "foundation", "check", "--kind", "all", "--root", root, "--project-root", root], { encoding: "utf8" }).stdout);
  assert.equal(all.foundations.system, undefined);
});

test("percent lengths are refused because DESIGN.md cannot carry them", () => {
  const pct = tokens();
  pct.radius.tokens[0].value = "50%";
  assert.match(messages(checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(pct) }) })), /radius\.radius-none: value must be px, rem, em/);
});

test("components need guidelines, a marked preview and no embedding; the cover stays bare", () => {
  const result = checkDesignSystemPackage({
    projectRoot: writePackage({
      "components/Entry/README.md": null,
      "components/Stamp/README.md": "# Stamp\n\nA status word.\n",
      "components/Stamp/preview.html": "<!doctype html><iframe src=x></iframe>",
      "components/Cover/README.md": "# Cover\n\nNo.\n",
    }),
  });
  const text = messages(result);
  assert.match(text, /components\/Entry: missing README\.md/);
  assert.match(text, /Stamp\/preview\.html: line 1 must be the <!-- @dsCard/);
  assert.match(text, /Stamp\/preview\.html: uses a forbidden embedding tag/);
  assert.match(text, /components\/Cover: the cover folder stays bare/);
});

test("the README needs content, visual and iconography sections, in English or Chinese", () => {
  const missing = checkDesignSystemPackage({ projectRoot: writePackage({ "README.md": "Ledger.\n\n## Visual foundations\n\nInk.\n" }) });
  assert.match(messages(missing), /missing the content fundamentals section/);
  assert.match(messages(missing), /missing the iconography section/);
  const chinese = checkDesignSystemPackage({ projectRoot: writePackage({ "README.md": "记录。\n\n## 内容原则\n\n- 平实。\n\n## 视觉基础\n\n墨色。\n\n## 图标\n\n无。\n" }) });
  assert.equal(chinese.status, "ready", messages(chinese));
});

test("DESIGN.md front-matter tokens are generated from tokens.json and drift is reported", () => {
  const root = writePackage();
  const front = designMdTokens(tokens());
  assert.match(front, /^colors:\n {2}primary: "#f5f0e6"\n {2}paper: "#f5f0e6"/);
  assert.match(front, /link: "#1f1c17"/); // aliases resolve to values
  const design = (body) => `---\nversion: alpha\nname: Ledger\n${body}---\n\n# Ledger\n`;
  fs.writeFileSync(path.join(root, "DESIGN.md"), design(front));
  assert.equal(checkDesignSystemPackage({ projectRoot: root }).status, "ready");
  fs.writeFileSync(path.join(root, "DESIGN.md"), design(front.replace('ink: "#1f1c17"', 'ink: "#000000"').replace("  space-2: 8px\n", "")));
  const text = messages(checkDesignSystemPackage({ projectRoot: root }));
  assert.match(text, /colors\.ink differs from tokens\.json/);
  assert.match(text, /spacing\.space-2 is in tokens\.json but not in DESIGN\.md/);
});

test("compile writes tokens.css and standalone previews with the first theme", () => {
  const root = writePackage();
  const css = compileTokensCss(tokens());
  assert.match(css, /^\/\* Ledger — generated from tokens\.json \*\//);
  assert.match(css, /:root, \[data-theme="light"\] \{\n {2}--paper: #f5f0e6;/);
  assert.match(css, /\[data-theme="dark"\] \{\n {2}--paper: #1d1a16;/);
  assert.match(css, /--link: var\(--ink\);/);
  assert.match(css, /\.body \{ font-family: var\(--font-sans\); font-size: 15px; line-height: 1\.6; font-weight: 400; \}/);
  const result = compileDesignSystemPackage({ projectRoot: root, output: ".design-pipeline/design-system" });
  assert.deepEqual(result.previews, [".design-pipeline/design-system/previews/Cover.html", ".design-pipeline/design-system/previews/Entry.html"]);
  const html = fs.readFileSync(path.join(root, result.previews[1]), "utf8");
  assert.match(html, /<html data-theme="light">/);
  assert.match(html, /<style>\n\/\* Ledger[\s\S]*\.entry \{ color: var\(--ink\); \}/);
});

test("the CLI exposes design-system check, compile and design-md-tokens, and foundation check --kind system", () => {
  const root = writePackage();
  const run = (...args) => spawnSync(process.execPath, [cli, ...args, "--root", root, "--project-root", root], { encoding: "utf8" });
  const check = run("design-system", "check");
  assert.equal(check.status, 0, check.stdout);
  assert.equal(JSON.parse(check.stdout).status, "ready");
  const tokensOut = JSON.parse(run("design-system", "design-md-tokens").stdout);
  assert.match(tokensOut.frontMatter, /^colors:/);
  assert.equal(run("design-system", "compile").status, 0);
  const system = run("foundation", "check", "--kind", "system");
  assert.equal(JSON.parse(system.stdout).foundations.system.status, "ready");
  fs.rmSync(path.join(root, "design-system", "README.md"));
  assert.equal(run("design-system", "check").status, 2);
});

test("contrast entries are validated, translucent colours refused and hsl measured", () => {
  const t = tokens();
  t.color.tokens.push({ name: "ghost", value: "#0000", usage: "Never text." }, { name: "sage", value: "hsl(120, 40%, 25%)", usage: "Supported text on paper." });
  t.contrast = [{ text: "ghost", on: ["paper"] }, { text: "ink", on: [] }, { text: "ink", on: ["paper"], min: "x" }, { text: "sage", on: ["paper"], min: 4.5 }];
  const result = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": JSON.stringify(t) }) });
  const text = messages(result);
  assert.match(text, /contrast ghost on paper \(light\): translucent colours cannot be measured/);
  assert.equal((text.match(/needs a colour token as text, at least one ground/g) || []).length, 2);
  assert.ok(result.contrast.some((pair) => pair.text === "sage" && pair.ratio > 4.5));
});

test("a non-object tokens.json is invalid, not ready or a crash", () => {
  for (const body of ["null", "3", "[]"]) {
    assert.match(messages(checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": body }) })), /tokens\.json must be a JSON object/);
  }
});

test("bundle.css is required", () => {
  assert.match(messages(checkDesignSystemPackage({ projectRoot: writePackage({ "components/bundle.css": null }) })), /components\/bundle\.css: missing/);
});

test("typography drift ignores key order", () => {
  const root = writePackage();
  const front = designMdTokens(tokens()).replace("    fontWeight: 400\n    lineHeight: 1.6\n", "    lineHeight: 1.6\n    fontWeight: 400\n");
  fs.writeFileSync(path.join(root, "DESIGN.md"), `---\nname: Ledger\n${front}---\n`);
  assert.equal(checkDesignSystemPackage({ projectRoot: root }).status, "ready");
});

test("design-md-tokens stays inside the project", () => {
  const root = writePackage();
  const out = spawnSync(process.execPath, [cli, "design-system", "design-md-tokens", "--system-dir", "../outside", "--root", root, "--project-root", root], { encoding: "utf8" });
  assert.notEqual(out.status, 0);
  assert.match(out.stdout + out.stderr, /outside --project-root/);
});

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

function withColors(extra, contrast) {
  const value = tokens();
  value.color.tokens.push(...extra);
  value.contrast.push(...contrast);
  return JSON.stringify(value, null, 1);
}

test("an on- colour and a focus ring must be measured, each finding with its fix", () => {
  const extra = [
    { name: "accent", value: { light: "#8a3b12", dark: "#f0a070" }, usage: "Primary fills." },
    { name: "on-accent", value: { light: "#ffffff", dark: "#1d1a16" }, usage: "Text on accent." },
    { name: "focus-ring", value: { light: "#1f1c17", dark: "#f3ece3" }, usage: "Focus outline on paper." },
  ];
  const unmeasured = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": withColors(extra, []) }) });
  const codes = unmeasured.findings.map((f) => f.code);
  assert.ok(codes.includes("on-token-unmeasured"), messages(unmeasured));
  assert.ok(codes.includes("focus-ring-unmeasured"), messages(unmeasured));
  assert.ok(unmeasured.findings.filter((f) => f.code).every((f) => f.fix && f.severity === "error"));

  const wrongGround = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": withColors(extra, [{ text: "on-accent", on: ["paper"], min: 4.5 }]) }) });
  assert.ok(wrongGround.findings.some((f) => f.code === "on-token-unmeasured"), "on-accent must be measured on accent");

  const lowFloor = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": withColors(extra, [
    { text: "on-accent", on: ["accent"], min: 4.5 },
    { text: "focus-ring", on: ["paper"], min: 2 },
  ]) }) });
  assert.deepEqual(lowFloor.findings.map((f) => f.code), ["focus-ring-floor"], messages(lowFloor));

  const measured = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": withColors(extra, [
    { text: "on-accent", on: ["accent"], min: 4.5 },
    { text: "focus-ring", on: ["paper"], min: 3 },
  ]) }) });
  assert.equal(measured.status, "ready", messages(measured));
});

test("the cover is still, solid shapes in one fixed layout; a derivation comment may name anything", () => {
  const cover = (body) => `<!-- @dsCard height=288 -->\n<!doctype html>\n<html><head><style>${body}</style></head><body><!-- blocks: img gradient animation @media --><svg><rect class="b"/></svg><h1>Ledger</h1></body></html>\n`;
  const clean = checkDesignSystemPackage({ projectRoot: writePackage({ "components/Cover/preview.html": cover(".b{fill:var(--ink)}") }) });
  assert.equal(clean.status, "ready", messages(clean));
  const busy = checkDesignSystemPackage({
    projectRoot: writePackage({
      "components/Cover/preview.html": cover(".b{background:linear-gradient(red,blue);animation:spin 2s}@media (max-width:600px){h1{font-size:10vw}}").replace("<svg>", '<img src="mark.png"><svg>'),
    }),
  });
  const codes = busy.findings.map((f) => f.code).sort();
  assert.deepEqual(codes, ["cover-gradient", "cover-motion", "cover-picture", "cover-responsive"], messages(busy));
  assert.ok(busy.findings.every((f) => f.fix));
});

test("on- colours have a 3:1 floor; only focus-ring and focus-outline names are focus rings", () => {
  const extra = [
    { name: "accent", value: { light: "#8a3b12", dark: "#f0a070" }, usage: "Primary fills." },
    { name: "on-accent", value: { light: "#ffffff", dark: "#1d1a16" }, usage: "Text on accent." },
    { name: "focus-bg", value: { light: "#eef0f8", dark: "#111522" }, usage: "Fill of a focused row." },
    { name: "focus-outline-inverse", value: { light: "#f3ece3", dark: "#1f1c17" }, usage: "Focus outline on ink." },
  ];
  const low = checkDesignSystemPackage({ projectRoot: writePackage({ "tokens.json": withColors(extra, [
    { text: "on-accent", on: ["accent"], min: 2 },
  ]) }) });
  assert.deepEqual(low.findings.map((f) => f.code).sort(), ["focus-ring-unmeasured", "on-token-floor"], messages(low));
  assert.match(low.findings.find((f) => f.code === "focus-ring-unmeasured").message, /focus-outline-inverse/);
});

function coverWith(style, body = "") {
  return `<!-- @dsCard height=288 -->\n<!doctype html>\n<html><head><style>${style}</style></head><body>${body}<h1>Ledger</h1></body></html>\n`;
}

function coverCodes(files) {
  return checkDesignSystemPackage({ projectRoot: writePackage(files) }).findings.map((f) => f.code).filter(Boolean).sort();
}

test("cover checks ignore CSS comments, prose, URLs, transitions and colour-scheme queries", () => {
  const quiet = [
    coverWith("/* linear-gradient(red, blue); animation: spin 1s; width: 100vw */ .b{fill:var(--ink)}"),
    coverWith("", "<p>Our gradient (soft) theme</p>"),
    coverWith(".b{background:url(mark-2vw.svg)}", '<a href="/x2vh">x</a>'),
    coverWith(".b{transition:color .2s}"),
    coverWith("@media (prefers-color-scheme: dark){body{background:#000}}"),
    coverWith("", "<image-grid></image-grid><canvas-note></canvas-note>"),
  ];
  for (const cover of quiet) assert.deepEqual(coverCodes({ "components/Cover/preview.html": cover }), [], cover);
});

test("cover checks catch longhands, SVG animation, every gradient function, viewport units and size queries", () => {
  const cases = [
    [coverWith(".b{animation-duration:1s}"), "cover-motion"],
    [coverWith("", "<svg><animateTransform/></svg>"), "cover-motion"],
    [coverWith("", '<svg><set attributeName="x"/></svg>'), "cover-motion"],
    [coverWith(".b{background:repeating-linear-gradient(red,blue)}"), "cover-gradient"],
    [coverWith(".b{background:conic-gradient(red,blue)}"), "cover-gradient"],
    [coverWith("", '<div style="background:-webkit-linear-gradient(red,blue)"></div>'), "cover-gradient"],
    [coverWith(".b{height:50svh}"), "cover-responsive"],
    [coverWith(".b{width:50vmin}"), "cover-responsive"],
    [coverWith("@media (max-width: 600px){.b{display:none}}"), "cover-responsive"],
    [coverWith("", "<svg><image href=\"mark.png\"/></svg>"), "cover-picture"],
  ];
  for (const [cover, code] of cases) assert.deepEqual(coverCodes({ "components/Cover/preview.html": cover }), [code], cover);
});

test("bundle.css rules that reach the cover through its classes or ids are checked too", () => {
  const files = {
    "components/bundle.css": ".entry{color:var(--ink)}\n.hero{background:linear-gradient(red,blue);animation:s 1s}\n@media (max-width:600px){.hero{width:100vw}}\n.other{animation:s 1s}\n",
    "components/Cover/preview.html": '<!-- @dsCard height=288 -->\n<html><head></head><body class="hero"><h1>Ledger</h1></body></html>\n',
  };
  assert.deepEqual(coverCodes(files), ["cover-gradient", "cover-motion", "cover-responsive"]);
  files["components/Cover/preview.html"] = files["components/Cover/preview.html"].replace('class="hero"', 'class="plain"');
  assert.deepEqual(coverCodes(files), []);
});

test("previews and bundle.css style with tokens: undeclared var(), raw colours and raw font stacks are findings", () => {
  const ready = checkDesignSystemPackage({ projectRoot: writePackage() });
  assert.equal(ready.status, "ready", JSON.stringify(ready.findings));
  assert.ok(ready.tokenUse.declared >= 5, JSON.stringify(ready.tokenUse));
  assert.ok(ready.tokenUse.unused.includes("paper"), JSON.stringify(ready.tokenUse));
  assert.ok(!ready.tokenUse.unused.includes("ink"));
  const bad = checkDesignSystemPackage({
    projectRoot: writePackage({
      "components/bundle.css": ".entry { color: var(--ink); --row-rule: #d8d2c4; border-bottom: 1px solid var(--row-rule); }\n.note { color: var(--accent); }\n",
      "components/Entry/preview.html": PREVIEW.replace("<head>", '<head><style>#root { background: #ffffff; font-family: "Inter", sans-serif; }</style>').replace('class="body"', 'class="body" style="color: rgba(0,0,0,.6)"'),
    }),
  });
  const messages = bad.findings.map((f) => `${f.file}: ${f.message}`);
  assert.ok(messages.some((m) => /bundle\.css: var\(--accent\) is not a token/.test(m)), messages.join("\n"));
  assert.ok(!messages.some((m) => /--row-rule/.test(m)), "a custom property declared in bundle.css is local, not an error");
  assert.ok(!messages.some((m) => /bundle\.css: raw colour/.test(m)), "a colour inside a custom-property declaration is a local token");
  assert.ok(messages.some((m) => /Entry\/preview\.html: raw colour values #ffffff, rgba\(/.test(m)), messages.join("\n"));
  assert.ok(messages.some((m) => /Entry\/preview\.html: font-family "Inter", sans-serif is not a token/.test(m)), messages.join("\n"));
  assert.equal(bad.status, "invalid");
});

function tokenFindings(overrides) {
  const result = checkDesignSystemPackage({ projectRoot: writePackage(overrides) });
  return result.findings.filter((f) => /is not a token|raw colour|font-family/.test(f.message)).map((f) => `${f.file}: ${f.message}`);
}

function withStyle(css, body = "") {
  return PREVIEW.replace("<head>", `<head><style>${css}</style>`).replace("<body>", `<body>${body}`);
}

test("token use scans declaration values only: selectors, comments, strings, url() and font/property blocks are not raw values", () => {
  const clean = [
    ["id selectors that read as hex", "#add, #face, #bed, #cafe-menu, #a11-note { color: var(--ink); }"],
    ["a colour in a comment", "/* was #ff0000 */ .a { color: var(--ink); }"],
    ["a colour in a string", '.a::before { content: "#fff Issue #123"; }'],
    ["url fragments", ".a { fill: url(#grad); background: url(sprite.svg#abc); }"],
    ["@font-face", '@font-face { font-family: "Inter"; src: url(inter.woff2); }'],
    ["@property", '@property --glow { syntax: "<color>"; inherits: false; initial-value: #fff; }'],
    ["font-family keyword with !important", ".a { font-family: inherit !important; } .b { font-family: unset; }"],
    ["named colours (known gap)", ".a { color: red; background: white; }"],
  ];
  for (const [label, css] of clean) {
    assert.deepEqual(tokenFindings({ "components/bundle.css": `.entry { color: var(--ink); }\n${css}\n` }), [], label);
    assert.deepEqual(tokenFindings({ "components/Entry/preview.html": withStyle(css) }), [], `${label} in a preview`);
  }
  const commented = PREVIEW.replace("<body>", '<body><!-- <style>.x { color: #f00; }</style> <div style="color: #f00"></div> --><script>const c = "#ff0000";</script>');
  assert.deepEqual(tokenFindings({ "components/Entry/preview.html": commented }), [], "HTML comments and scripts are not live CSS");
  const dataUri = PREVIEW.replace("<body>", `<body><div style="background: url(data:image/svg+xml;utf8,<svg fill='#f00'/>)">x</div>`);
  assert.deepEqual(tokenFindings({ "components/Entry/preview.html": dataUri }), [], "a data: URI inside url() is not a paint attribute");
});

test("token use catches hwb(), color(), color-mix(), SVG paint attributes and entity-encoded style attributes", () => {
  const css = tokenFindings({ "components/bundle.css": ".a { color: hwb(0 0% 0%); background: color(srgb 1 0 0); border-color: color-mix(in oklab, var(--ink), var(--paper)); }\n" });
  assert.ok(css.some((m) => /bundle\.css: raw colour values hwb\(, color\(, color-mix\(/.test(m)), css.join("\n"));
  const svg = tokenFindings({
    "components/Entry/preview.html": PREVIEW.replace("<body>", '<body><svg><path fill="#ff0000" stroke=\'rgb(0 0 0)\'/><stop stop-color="&#x23;00ff00"/><rect fill="none" stroke="currentColor"/><use fill="url(#g)" flood-color="red"/></svg>'),
  });
  assert.equal(svg.length, 1, svg.join("\n"));
  assert.match(svg[0], /raw colour values #ff0000, rgb\(, #00ff00:/);
  const encoded = tokenFindings({ "components/Entry/preview.html": PREVIEW.replace('class="body"', 'class="body" style="font-family: &quot;Inter&quot;, sans-serif; color: &#35;abc"') });
  assert.ok(encoded.some((m) => /raw colour values #abc:/.test(m)), encoded.join("\n"));
  assert.ok(encoded.some((m) => /font-family "Inter", sans-serif is not a token/.test(m)), encoded.join("\n"));
});

test("custom properties count only where declared: bundle.css is shared, a preview's own stay in that preview", () => {
  const bem = tokenFindings({ "components/bundle.css": ".btn--primary:hover { opacity: .9; }\n/* --ghost: 1px */\n.x { color: var(--primary); background: var(--ghost); }\n" });
  assert.ok(bem.some((m) => /bundle\.css: var\(--primary\) is not a token/.test(m)), bem.join("\n"));
  assert.ok(bem.some((m) => /bundle\.css: var\(--ghost\) is not a token/.test(m)), "a commented-out declaration declares nothing");
  const shared = tokenFindings({
    "components/bundle.css": ".entry { --row-rule: var(--ink); border-bottom: 1px solid var(--row-rule); }\n",
    "components/Entry/preview.html": withStyle(".a { --gap: var(--space-2); margin: var(--gap); border-color: var(--row-rule); }"),
    "components/Note/preview.html": withStyle(".b { margin: var(--gap); }"),
    "components/Note/README.md": "# Note\n\nA margin note.\n",
  });
  assert.deepEqual(shared, ["components/Note/preview.html: var(--gap) is not a token: add it to tokens.json, declare it in bundle.css or this preview, or use an existing token"]);
});

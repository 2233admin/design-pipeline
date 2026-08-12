"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { checkDirectionPreview } = require("../skill/scripts/direction-preview-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { pngBytes } = require("./helpers/reference-fixtures.cjs");

const repoRoot = path.resolve(__dirname, "..");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return { path: relative.replaceAll("\\", "/"), sha256: hash(content) };
}

function candidate(id, name, axes, screenshot) {
  return {
    id,
    name,
    thesis: `${name} visual thesis`,
    signature: `${name} product signature`,
    axes,
    screenshot,
  };
}

function requiredFixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "direction-preview-"));
  const root = path.join(parent, "compare-settings");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  const brief = write(root, "brief.md", "# Settings redesign\n");
  const html = Buffer.from(
    '<!doctype html><main data-direction-preview><section data-direction-id="quiet"></section>'
    + '<section data-direction-id="signal"></section><section data-direction-id="editorial"></section></main>',
  );
  const index = write(root, "direction-previews/index.html", html);
  const screenshot = (id) => write(root, `direction-previews/${id}.png`, Buffer.concat([
    pngBytes({ width: 1440, height: 900 }),
    Buffer.from(id),
  ]));
  const directions = [
    candidate("quiet", "Quiet Grid", {
      luminance: "light", typeFamily: "serif", color: "monochrome", layout: "editorial",
      density: "airy", era: "classic", material: "paper",
    }, screenshot("quiet")),
    candidate("signal", "Signal Console", {
      luminance: "dark", typeFamily: "sans", color: "duotone", layout: "grid",
      density: "dense", era: "futurist", material: "glass",
    }, screenshot("signal")),
    candidate("editorial", "Field Notes", {
      luminance: "light", typeFamily: "monospace", color: "multicolor", layout: "asymmetric",
      density: "balanced", era: "industrial", material: "flat",
    }, screenshot("editorial")),
  ];
  const receipt = {
    schema: "design-pipeline.direction-preview.v1",
    changeId: "compare-settings",
    applicability: { status: "required", reason: "visual-redesign" },
    comparison: {
      brief,
      index,
      viewport: { width: 1440, height: 900 },
      contentFixtureSha256: hash("settings-real-copy-v1"),
      stateCoverage: ["default", "validation-error"],
    },
    directions,
    decision: { status: "pending", selectedDirectionId: null, rationale: null },
  };
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  return { root, receipt };
}

test("checks preview evidence before accepting a selected direction", (t) => {
  const { root, receipt } = requiredFixture(t);
  assert.equal(checkDirectionPreview(root, { stage: "preview" }).status, "ready");

  const pending = checkDirectionPreview(root, { stage: "selection" });
  assert.equal(pending.status, "blocked");
  assert.equal(pending.reason, "direction-selection-pending");

  receipt.decision = {
    status: "selected",
    selectedDirectionId: "quiet",
    rationale: "Best fit for repeated settings work and scanability.",
  };
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(checkDirectionPreview(root, { stage: "selection" }).status, "ready");

  const cli = execute(["direction", "check", "--root", path.dirname(root), "--change-root", root, "--stage", "selection", "--json"]);
  assert.equal(cli.exitCode, 0);
  assert.equal(cli.output.status, "ready");
});

test("blocks screenshot drift and missing comparison stages", (t) => {
  const { root } = requiredFixture(t);
  fs.appendFileSync(path.join(root, "direction-previews/quiet.png"), "changed");
  const drift = checkDirectionPreview(root);
  assert.equal(drift.status, "blocked");
  assert.ok(drift.reasons.includes("direction-preview-hash-mismatch"));

  const receipt = JSON.parse(fs.readFileSync(path.join(root, "direction-preview.json"), "utf8"));
  const html = Buffer.from('<main data-direction-preview><section data-direction-id="quiet"></section></main>');
  fs.writeFileSync(path.join(root, "direction-previews/index.html"), html);
  receipt.comparison.index.sha256 = hash(html);
  receipt.directions[0].screenshot.sha256 = hash(fs.readFileSync(path.join(root, "direction-previews/quiet.png")));
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  const missing = checkDirectionPreview(root);
  assert.equal(missing.status, "blocked");
  assert.ok(missing.reasons.includes("direction-preview-stage-missing"));
});

test("blocks malformed screenshots and viewport mismatches", (t) => {
  const { root, receipt } = requiredFixture(t);
  const screenshot = path.join(root, "direction-previews/quiet.png");
  const signatureOnly = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  fs.writeFileSync(screenshot, signatureOnly);
  receipt.directions[0].screenshot.sha256 = hash(signatureOnly);
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.ok(checkDirectionPreview(root).reasons.includes("direction-preview-screenshot-invalid"));

  const wrongViewport = pngBytes({ width: 800, height: 600 });
  fs.writeFileSync(screenshot, wrongViewport);
  receipt.directions[0].screenshot.sha256 = hash(wrongViewport);
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.ok(checkDirectionPreview(root).reasons.includes("direction-preview-screenshot-viewport-mismatch"));
});

test("rejects recolors presented as distinct directions", (t) => {
  const { root, receipt } = requiredFixture(t);
  receipt.directions[1].axes = {
    ...receipt.directions[0].axes,
    color: "duotone",
    material: "glass",
  };
  fs.writeFileSync(path.join(root, "direction-preview.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.throws(() => checkDirectionPreview(root), /differ on at least four axes/);
});

test("accepts an explicit supported waiver", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "direction-preview-waiver-"));
  const root = path.join(parent, "fix-focus-ring");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify({
    schema: "design-pipeline.direction-preview.v1",
    changeId: "fix-focus-ring",
    applicability: { status: "waived", reason: "narrow-change" },
    comparison: null,
    directions: [],
    decision: {
      status: "waived",
      selectedDirectionId: null,
      rationale: "The existing surface decides the visual direction; only the focus ring changes.",
    },
  }));
  const result = checkDirectionPreview(root, { stage: "selection" });
  assert.equal(result.status, "ready");
  assert.equal(result.applicable, false);
});

test("publishes the CJK and preview contracts as package resources", () => {
  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  for (const resource of [
    "references/cjk-typography.md",
    "references/direction-preview.md",
    "scripts/direction-preview-core.cjs",
  ]) assert.ok(resources.required.includes(resource), resource);

  const pipeline = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");
  const cjk = fs.readFileSync(path.join(repoRoot, "skill/references/cjk-typography.md"), "utf8");
  assert.match(pipeline, /direction check --stage preview/);
  assert.match(pipeline, /references\/cjk-typography\.md/);
  assert.match(cjk, /system-ui/);
  assert.match(cjk, /1\.5.*1\.75/);
  assert.match(cjk, /full-width punctuation/i);
  assert.match(cjk, /WOFF2 subset/);
});

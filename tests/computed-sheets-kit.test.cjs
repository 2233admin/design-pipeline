"use strict";

// The computed-sheets example kit renders every piece, each page is one self-contained SVG with a title,
// every raster it references exists in art/, and no page points at a machine path or an artifact blob.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const KIT = path.join(__dirname, "..", "examples", "computed-sheets-kit");

test("every computed sheet renders to a self-contained page", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "computed-sheets-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, [path.join(KIT, "build", "all.cjs")], { encoding: "utf8", env: { ...process.env, COMPUTED_SHEETS_OUT: out } });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout.trim().split("\n").pop());
  assert.ok(result.pieces >= 46, `only ${result.pieces} pieces`);
  const pages = fs.readdirSync(out).filter((f) => f.endsWith(".html") && f !== "index.html");
  assert.equal(pages.length, result.pieces);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(out, page), "utf8");
    assert.match(html, /<svg width="\d+" height="\d+"[^>]*role="img"/, page);
    assert.doesNotMatch(html, /\/home\/|_blob\/|file:\/\//, page);
    for (const [, ref] of html.matchAll(/href="\.\.\/art\/([^"]+)"/g)) assert.ok(fs.existsSync(path.join(KIT, "art", ref)), `${page} needs art/${ref}`);
  }
  const index = fs.readFileSync(path.join(out, "index.html"), "utf8");
  for (const page of pages) assert.ok(index.includes(`href="${page}"`), `${page} missing from the contact sheet`);
});

test("disputed and schematic content says so on the page", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "computed-sheets-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  spawnSync(process.execPath, [path.join(KIT, "build", "all.cjs")], { encoding: "utf8", env: { ...process.env, COMPUTED_SHEETS_OUT: out } });
  assert.match(fs.readFileSync(path.join(out, "KWave.html"), "utf8"), /DISPUTED[\s\S]*NOT A FORECAST/);
  assert.match(fs.readFileSync(path.join(out, "MathKepler.html"), "utf8"), /M = E − e sin E/);
});

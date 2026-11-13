"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const kit = require("../skill/tools/template-bank/sheet-kit.cjs");

const SHEETS = path.join(__dirname, "..", "skill", "tools", "template-bank", "sheets");
const KIT = path.join(__dirname, "..", "skill", "tools", "template-bank", "sheet-kit.cjs");
const load = (name) => JSON.parse(fs.readFileSync(path.join(SHEETS, `${name}.json`), "utf8"));

test("every golden sheet renders with no findings", () => {
  for (const name of ["tcp", "webb", "tay-bridge", "gnomon"]) {
    const res = kit.render(load(name));
    assert.deepEqual(res.findings, [], name);
    assert.match(res.svg, /^<svg [^>]*data-hue-brand="#[0-9a-f]{6}"/, name);
    assert.match(res.svg, /SOURCES \//, name);
  }
});

test("gnomon shadows are computed from latitude and declination", () => {
  const spec = load("gnomon");
  kit.render(spec);
  const winter = spec.hero.marks.find((m) => m.decl_deg < 0);
  const expected = 9.81 * Math.tan((34.40 + 23.53) * Math.PI / 180);
  assert.ok(Math.abs(winter.length_m - expected) < 1e-9);
  assert.ok(Math.abs(winter.length_m - 15.66) < 0.01);
});

test("example values are starred and disclosed in the footer", () => {
  const res = kit.render(load("tcp"));
  assert.match(res.svg, /1000\*/);
  assert.match(res.svg, /VALUES MARKED \* ARE EXAMPLES/);
});

test("a sheet without sources or over its density budget reports findings", () => {
  const spec = load("tay-bridge");
  delete spec.sources;
  spec.side[0].rows.push(["A", "1"], ["B", "2"], ["C", "3"]);
  const rules = kit.render(spec).findings.map((f) => f.rule);
  assert.ok(rules.includes("sources-required"));
  assert.ok(rules.includes("density-budget"));
});

test("airy density is stricter than standard", () => {
  const spec = { ...load("gnomon"), density: "airy" };
  assert.ok(kit.render(spec).findings.some((f) => f.rule === "density-budget"));
});

test("the script exits 2 on findings and 0 on a clean sheet", () => {
  const clean = spawnSync(process.execPath, [KIT, path.join(SHEETS, "webb.json")], { encoding: "utf8" });
  assert.equal(clean.status, 0, clean.stderr);
  const tmp = path.join(require("node:os").tmpdir(), `sheet-kit-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ ...load("webb"), sources: "" }));
  const bad = spawnSync(process.execPath, [KIT, tmp], { encoding: "utf8" });
  fs.rmSync(tmp, { force: true });
  assert.equal(bad.status, 2);
});

test("the intake asks at most four questions", () => {
  assert.ok(kit.INTAKE.length <= 4);
  assert.deepEqual(kit.INTAKE.map((q) => q.id), ["format", "institution", "dialect", "density"]);
});

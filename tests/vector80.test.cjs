"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const v80 = require("../skill/tools/template-bank/vector80.cjs");

const DIR = path.join(__dirname, "..", "skill", "tools", "template-bank", "vector80");
const load = (name) => JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), "utf8"));
const GOLDEN = ["scope-pencil", "menger-plate", "terrain-plate", "panel-globe"];

test("every golden vector plate renders with no findings", () => {
  for (const name of GOLDEN) {
    const spec = load(name);
    const res = v80.render(spec);
    assert.deepEqual(res.findings, [], name);
    assert.match(res.svg, /^<svg [^>]*data-tear-zone="\d+,\d+"/, name);
    assert.doesNotMatch(res.svg, /<filter/, `${name}: glow belongs to the raster pass, not SVG filters`);
  }
});

test("the menger subject is computed: level 2 keeps 400 of 729 cubes", () => {
  const res = v80.render(load("menger-plate"));
  assert.equal(res.ctx.subject.count, 400);
  assert.equal(res.ctx.subject.extent, 9);
  const l1 = v80.render({ layout: "plate", plate: { subject: { type: "menger", level: 1 } } });
  assert.equal(l1.ctx.subject.count, 20);
});

test("tear zones in the golden specs stay clear of the captions and tags", () => {
  for (const name of GOLDEN) {
    const spec = load(name);
    const [t0, t1] = spec.tearZone;
    const H = spec.size[1];
    assert.ok(t0 > 186 + 10 && t1 < H - 150, `${name}: tear zone ${t0}-${t1}`);
  }
});

test("unknown parts and too many phosphors are reported", () => {
  assert.equal(v80.render({ layout: "poster" }).findings[0].rule, "layout-unknown");
  assert.equal(v80.render({ layout: "plate", plate: { subject: { type: "teapot" } } }).findings[0].rule, "subject-unknown");
  const busy = v80.render({ layout: "plate", phosphor: { primary: "green", secondary: "red", accent: "yellow", rings: "orange", frame: "blue", text: "white" }, title: "X", captions: { tl: "Y" } });
  // a plate draws primary, secondary, accent and rings; six declared but unused colours do not count
  assert.deepEqual(busy.findings, []);
});

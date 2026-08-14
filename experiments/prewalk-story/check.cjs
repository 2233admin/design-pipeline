"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

for (const file of [
  "source-canvas-0.png",
  "source-canvas-1.png",
  "source-canvas-2.png",
  "source-canvas-3.png",
  "source-plan.png",
  "source-trace-0.png",
  "source-trace-1.png",
]) assert.ok(fs.statSync(path.join(root, file)).size > 250, `${file} exists`);

assert.match(html, /You only need the frontier model for one single edit/);
assert.match(html, /class="post page-section"/);
assert.match(html, /class="post-stats"/);
assert.match(html, /class="misalign"/);
assert.match(html, /window\.__prewalkReplicaReady/);
assert.match(html, /https:\/\/stencil\.so\/_build\/assets\/client-/);
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "inline script exists");
new vm.Script(script, { filename: "prewalk-replica-inline.js" });

console.log("OK prewalk 1:1 replica self-check");

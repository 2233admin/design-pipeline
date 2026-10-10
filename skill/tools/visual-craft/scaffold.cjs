"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, fail, resolveInside } = require("../../scripts/contract-utils.cjs");
const TEMPLATES = ["visual-craft", "art-motion"];

function scaffoldVisualCraft(root, options) {
  const template = options.template ?? "visual-craft";
  assertEnum(template, TEMPLATES, "template", "composition");
  if (options.replace) fail("composition", "scaffolding requires a new directory; --replace is not supported");
  const directory = resolveInside(root, options.output, "--output", { scope: "composition" });
  if (fs.existsSync(directory)) fail("composition", "output already exists; choose a new directory");
  const files = template === "art-motion"
    ? [["../art-motion/study.html", "index.html"], ["../art-motion/runtime.js", "runtime.js"], ["../art-motion/clip.example.json", "clip.example.json"], ["../art-motion/LICENSE", "LICENSE.art-motion"]]
    : [["study.html", "index.html"], ["canvas.js", "canvas.js"], ["../art-motion/LICENSE", "LICENSE.art-motion"]];
  const contents = files.map(([source, destination]) => [destination, fs.readFileSync(path.join(__dirname, source))]);
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  fs.mkdirSync(directory);
  for (const [name, bytes] of contents) fs.writeFileSync(path.join(directory, name), bytes, { flag: "wx" });
  return {
    status: "scaffolded", template, directory, entry: path.join(directory, "index.html"),
    files: contents.map(([name]) => name), creativeAcceptance: "not-assessed",
  };
}

module.exports = { scaffoldVisualCraft, TEMPLATES };

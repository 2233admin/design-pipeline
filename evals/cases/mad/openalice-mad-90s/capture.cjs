#!/usr/bin/env node
"use strict";

// OpenAlice interface material for the MAD's beat panels and chibi grid, reused from the UI promo
// case's capture (same pinned commit). Runs that capture first when it is missing:
//   OPENALICE_DIR=<OpenAlice checkout> node evals/cases/mad/openalice-mad-90s/capture.cjs

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const FILES = ["terminal.mp4", "inbox.png", "portfolio.png", "alice-full.png"];
const source = path.join(__dirname, "..", "..", "ui-promo", "openalice-promo-15s");
const from = path.join(source, "assets", "captures");
const out = path.join(__dirname, "assets", "captures");

if (FILES.some((file) => !fs.existsSync(path.join(from, file)))) {
  const run = spawnSync(process.execPath, [path.join(source, "capture.cjs")], { stdio: "inherit" });
  if (run.status !== 0) process.exit(run.status || 1);
}
fs.mkdirSync(out, { recursive: true });
const files = {};
for (const file of FILES) {
  fs.copyFileSync(path.join(from, file), path.join(out, file));
  files[file] = crypto.createHash("sha256").update(fs.readFileSync(path.join(out, file))).digest("hex");
}
fs.writeFileSync(path.join(out, "capture.json"), `${JSON.stringify({ from: "ui-promo/openalice-promo-15s", files }, null, 2)}\n`);
console.log(`copied ${FILES.length} captures from the UI promo case`);

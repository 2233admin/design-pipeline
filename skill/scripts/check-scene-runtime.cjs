#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { checkScene } = require("./scene-runtime-core.cjs");
const { jsonResult } = require("./contract-utils.cjs");

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
try {
  const result = checkScene(path.resolve(arg("--change-root") || process.cwd()), { markdown: arg("--markdown"), sidecar: arg("--sidecar") });
  process.stdout.write(`${JSON.stringify(jsonResult(true, result))}\n`);
  if (result.status === "upgrade-required") process.exitCode = 2;
} catch (error) {
  process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
  process.exitCode = 1;
}

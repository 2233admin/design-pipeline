#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { migrateFile } = require("./pipeline-state-core.cjs");
const { jsonResult } = require("./contract-utils.cjs");

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

try {
  const file = path.resolve(arg("--state") || "state.json");
  const write = process.argv.includes("--write");
  const result = migrateFile(file, { write, expectedSha256: arg("--expected-sha256") });
  process.stdout.write(`${JSON.stringify(jsonResult(true, { status: write ? "migrated" : "preview", file, sourceSha256: result.sourceSha256, state: result.state }))}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
  process.exitCode = 1;
}

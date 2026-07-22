#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { checkComponentMatrix } = require("./motion-evidence-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
try { const file = path.resolve(arg("--matrix") || "component-state-matrix.json"); process.stdout.write(`${JSON.stringify(jsonResult(true, checkComponentMatrix(readJson(file, "component states"), { evidenceRoot: arg("--evidence-root") || path.dirname(file), requireFiles: process.argv.includes("--require-files") }))) }\n`); }
catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { validateStyleSignals } = require("./adapter-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }
try { const file = path.resolve(arg("--artifact") || path.join(__dirname, "../references/visual-style-signals.json")); process.stdout.write(`${JSON.stringify(jsonResult(true, validateStyleSignals(readJson(file, "style signals"))))}\n`); }
catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

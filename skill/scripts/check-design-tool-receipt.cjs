#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { validateDesignToolReceipt } = require("./adapter-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
const index = process.argv.indexOf("--receipt");
try { const file = path.resolve(index >= 0 ? process.argv[index + 1] : "design-tool-receipt.json"); process.stdout.write(`${JSON.stringify(jsonResult(true, validateDesignToolReceipt(readJson(file, "design tool receipt"))))}\n`); }
catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { validateReceipt } = require("./evidence-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
try {
  const receiptFile = path.resolve(arg("--receipt") || "evidence-receipt.json");
  const receipt = validateReceipt(readJson(receiptFile, "evidence"), { evidenceRoot: arg("--evidence-root") || path.dirname(receiptFile), requireFiles: process.argv.includes("--require-files") });
  process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "valid", receipt }))}\n`);
} catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

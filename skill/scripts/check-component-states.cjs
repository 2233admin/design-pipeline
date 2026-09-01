#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { checkComponentMatrix } = require("./motion-evidence-core.cjs");
const { checkInteractionStateCoverage, STATE_COVERAGE_SCHEMA } = require("./gate-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
try {
  const file = path.resolve(arg("--matrix") || "component-state-matrix.json");
  const matrix = readJson(file, "component states");
  const result = matrix.schema === STATE_COVERAGE_SCHEMA
    ? checkInteractionStateCoverage(matrix)
    : checkComponentMatrix(matrix, { evidenceRoot: arg("--evidence-root") || path.dirname(file), requireFiles: process.argv.includes("--require-files") });
  process.stdout.write(`${JSON.stringify(jsonResult(true, result))}\n`);
} catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

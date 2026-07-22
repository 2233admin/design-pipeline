#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { evaluateIntake } = require("./adapter-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
const index = process.argv.indexOf("--artifact");
try { const file = path.resolve(index >= 0 ? process.argv[index + 1] : "adapter-intake.json"); const result = evaluateIntake(readJson(file, "adapter intake")); process.stdout.write(`${JSON.stringify(jsonResult(true, result))}\n`); if (result.status === "blocked") process.exitCode = 2; }
catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

#!/usr/bin/env node
"use strict";
const path = require("node:path"); const { validateTokens } = require("./interoperability-core.cjs"); const { jsonResult, readJson } = require("./contract-utils.cjs");
const i = process.argv.indexOf("--artifact"); try { const file = path.resolve(i >= 0 ? process.argv[i + 1] : "design-tokens.json"); process.stdout.write(`${JSON.stringify(jsonResult(true, validateTokens(readJson(file, "design tokens"))))}\n`); } catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

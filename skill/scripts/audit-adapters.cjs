#!/usr/bin/env node
"use strict";
const path = require("node:path");
const { validateRegistry } = require("./adapter-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");
function arg(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }
try {
  const registry = readJson(path.resolve(arg("--registry") || path.join(__dirname, "../references/adapter-registry.json")), "adapter registry");
  const catalog = readJson(path.resolve(arg("--graphics-catalog") || path.join(__dirname, "../references/graphics-runtime-catalog.json")), "graphics catalog");
  process.stdout.write(`${JSON.stringify(jsonResult(true, validateRegistry(registry, catalog)))}\n`);
} catch (error) { process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`); process.exitCode = 1; }

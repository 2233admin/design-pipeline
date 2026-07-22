#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { inspectConsistency, validateState } = require("./pipeline-state-core.cjs");
const { jsonResult, readJson } = require("./contract-utils.cjs");

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

try {
  const file = path.resolve(arg("--state") || "state.json");
  const state = readJson(file, "pipeline state");
  validateState(state);
  let consistency = null;
  const eventsArg = arg("--events");
  if (eventsArg) consistency = inspectConsistency(state, fs.readFileSync(path.resolve(eventsArg), "utf8"));
  process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "valid", schema: state.schema, file, consistency }))}\n`);
} catch (error) {
  process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
  process.exitCode = 1;
}

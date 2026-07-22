#!/usr/bin/env node
"use strict";

const { execute } = require("./cli-core.cjs");

const outcome = execute(process.argv.slice(2));
if (outcome.json || !outcome.output.ok) {
  process.stdout.write(`${JSON.stringify(outcome.output)}\n`);
} else if (outcome.output.help) {
  process.stdout.write(`${outcome.output.help}\n`);
} else {
  process.stdout.write(`${JSON.stringify(outcome.output, null, 2)}\n`);
}
process.exitCode = outcome.exitCode;

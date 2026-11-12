#!/usr/bin/env node
"use strict";

const { execute } = require("./cli-core.cjs");

function print(outcome) {
  if (outcome.json || !outcome.output.ok) {
    process.stdout.write(`${JSON.stringify(outcome.output)}\n`);
  } else if (outcome.text) {
    process.stdout.write(`${outcome.text}\n`);
  } else if (outcome.output.help) {
    process.stdout.write(`${outcome.output.help}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(outcome.output, null, 2)}\n`);
  }
}

(async () => {
  let outcome = execute(process.argv.slice(2));
  // `tunables panel` returns a server to keep alive: print its URL, then wait until it closes.
  if (outcome.serve) outcome = await outcome.serve();
  print(outcome);
  process.exitCode = outcome.exitCode;
  if (outcome.closed) await outcome.closed;
})();

#!/usr/bin/env node
"use strict";

// Kernel for `reconciliation measure`: the browser measurement is async, so it runs in its own
// process like the `evidence refs` kernel and hands the result back to the synchronous CLI as JSON on
// stdout. The kernel writes nothing; the CLI binds the page and DESIGN.md hashes and writes
// built-styles.json.

const { captureBuiltStyles } = require("./built-style-drift-core.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

const SCOPE = "measured spec drift";

function parseArgs(argv) {
  const allowed = new Set(["--project-root", "--chrome", "--puppeteer-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail(SCOPE, `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(SCOPE, `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--project-root"]) fail(SCOPE, "--project-root <dir> is required");
  return result;
}

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const measurement = await captureBuiltStyles(options["--project-root"], {
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
    });
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "measured", measurement }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

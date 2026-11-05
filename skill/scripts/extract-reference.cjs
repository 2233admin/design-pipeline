#!/usr/bin/env node
"use strict";

// Kernel for `reference extract`: the browser measurement is async, so it runs in its own process the
// way `evidence refs` does and hands the measurement back to the synchronous CLI as JSON on stdout. The
// kernel writes nothing; the CLI analyses the measurement and writes the evidence files.

const { extractReference } = require("./reference-extract-core.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

const SCOPE = "reference extract";

function parseArgs(argv) {
  const allowed = new Set(["--url", "--width", "--height", "--chrome", "--puppeteer-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail(SCOPE, `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(SCOPE, `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--url"]) fail(SCOPE, "--url <page> is required");
  return result;
}

const integer = (value, name) => {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 16384) fail(SCOPE, `${name} must be an integer from 1 to 16384`, { code: "OPTION_INVALID" });
  return number;
};

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const measurement = await extractReference(options["--url"], {
      width: integer(options["--width"], "--width"),
      height: integer(options["--height"], "--height"),
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
    });
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "measured", measurement }))}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
    process.exitCode = 1;
  }
})();

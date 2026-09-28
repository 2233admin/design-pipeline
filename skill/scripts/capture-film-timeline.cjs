#!/usr/bin/env node
"use strict";

// Kernel for `film capture-timeline` and `film check`: runs the async browser capture in its
// own process so the synchronous CLI can spawn it like the other capture kernels.

const { captureTimeline } = require("./film-capture-core.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

function parseArgs(argv) {
  const allowed = new Set(["--composition", "--composition-id", "--chrome", "--puppeteer-module", "--timeout-ms"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail("film capture", `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("film capture", `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--composition"]) fail("film capture", "--composition is required (path to the HyperFrames index.html)");
  return result;
}

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const timeline = await captureTimeline(options["--composition"], {
      compositionId: options["--composition-id"],
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
      timeoutMs: options["--timeout-ms"] ? Number(options["--timeout-ms"]) : undefined,
    });
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", timeline }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

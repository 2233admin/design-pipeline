#!/usr/bin/env node
"use strict";

// Kernel for `film capture-timeline` and `film check`: runs the async browser capture in its
// own process so the synchronous CLI can spawn it like the other capture kernels. With
// --layout-times it samples visible text at those seconds instead of the timeline.

const { captureLayout, captureTimeline } = require("./film-capture-core.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

function parseArgs(argv) {
  const allowed = new Set(["--composition", "--url", "--composition-id", "--chrome", "--puppeteer-module", "--timeout-ms", "--layout-times"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail("film capture", `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("film capture", `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--composition"] && !result["--url"]) fail("film capture", "--composition <index.html> or --url <preview url> is required");
  return result;
}

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const shared = {
      url: options["--url"],
      compositionId: options["--composition-id"],
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
      timeoutMs: options["--timeout-ms"] ? Number(options["--timeout-ms"]) : undefined,
    };
    if (options["--layout-times"]) {
      const layout = await captureLayout(options["--composition"], options["--layout-times"].split(",").map(Number), shared);
      process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", layout }))}\n`);
      return;
    }
    const timeline = await captureTimeline(options["--composition"], shared);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", timeline }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

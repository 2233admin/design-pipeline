#!/usr/bin/env node
"use strict";

// Kernel for `verify interaction`: the browser capture is async, so it runs in its own process the
// way the film capture does and hands the recording back to the synchronous CLI as JSON on stdout.

const { captureInteraction } = require("./interaction-capture-core.cjs");
const { validateProbeFile } = require("./interaction-core.cjs");
const { fail, jsonResult, readJson } = require("./contract-utils.cjs");

const SCOPE = "interaction capture";

function parseArgs(argv) {
  const allowed = new Set(["--probe", "--chrome", "--puppeteer-module", "--timeout-ms"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail(SCOPE, `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(SCOPE, `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--probe"]) fail(SCOPE, "--probe <interaction.json> is required");
  return result;
}

(async () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const probeFile = options["--probe"];
    // Validating here as well as in the CLI keeps the kernel usable on its own and guarantees the
    // capture layer only ever sees a normalized document.
    const doc = validateProbeFile(readJson(probeFile, "interaction probe"));
    const capture = await captureInteraction(probeFile, {
      doc,
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
      timeoutMs: options["--timeout-ms"] ? Number(options["--timeout-ms"]) : undefined,
    });
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", capture }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

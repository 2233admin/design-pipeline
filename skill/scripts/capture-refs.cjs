#!/usr/bin/env node
"use strict";

// Kernel for `evidence refs`: the browser capture is async, so it runs in its own process the way the
// interaction capture does and hands the result back to the synchronous CLI as JSON on stdout. The
// kernel writes nothing; the CLI writes refs.json and refs.png once it has the whole capture.

const { captureRefs } = require("./page-refs-core.cjs");
const { pageDigest } = require("./workflows/web.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

const SCOPE = "page refs";

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
    const { doc, png, loaded } = await captureRefs(options["--project-root"], {
      digest: pageDigest,
      chrome: options["--chrome"],
      puppeteerModule: options["--puppeteer-module"],
    });
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", capture: doc, png: png.toString("base64"), loaded }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

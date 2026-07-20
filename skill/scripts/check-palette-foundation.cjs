#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { inspectPaletteFoundation } = require("./palette-foundation-core.cjs");
const {
  validateWebsiteCloningManifest,
} = require("./website-cloning-manifest-core.cjs");

let json = process.argv.includes("--json");

try {
  const { values } = parseArgs({
    options: {
      "change-root": { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  json = values.json;

  if (values.help) {
    console.log(
      "Usage: node check-palette-foundation.cjs --change-root <path> [--json]",
    );
  } else {
    if (!values["change-root"]) throw new Error("--change-root is required");
    const changeRoot = path.resolve(values["change-root"]);
    if (!fs.existsSync(changeRoot) || !fs.statSync(changeRoot).isDirectory()) {
      throw new Error(`change root does not exist: ${changeRoot}`);
    }
    const manifestPath = path.join(changeRoot, "website-cloning.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`website-cloning.json is missing: ${manifestPath}`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    validateWebsiteCloningManifest(manifest);
    const blockers = inspectPaletteFoundation({
      changeRoot,
      targets: manifest.targets,
    });
    const result = {
      schema: "design-pipeline.palette-foundation-check.v1",
      status: blockers.length ? "blocked" : "ready",
      changeRoot,
      targets: (manifest.targets || []).map((target) => target.id),
      blockers,
    };
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Palette foundation: ${result.status}`);
      for (const blocker of blockers) console.log(`- ${blocker}`);
    }
    if (blockers.length) process.exitCode = 2;
  }
} catch (error) {
  if (json) {
    console.log(
      JSON.stringify(
        {
          schema: "design-pipeline.palette-foundation-check.v1",
          status: "invalid",
          error: error.message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`check-palette-foundation: ${error.message}`);
  }
  process.exitCode = 1;
}

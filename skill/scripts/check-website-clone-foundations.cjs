#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  inspectWebsiteCloneFoundations,
} = require("./website-clone-foundation-core.cjs");
const {
  validateWebsiteCloningManifest,
} = require("./website-cloning-manifest-core.cjs");

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--change-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("--change-root requires a value");
      options.changeRoot = value;
      index += 1;
    } else {
      fail(`unknown option: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(
    "Usage: node check-website-clone-foundations.cjs --change-root <path> [--json]",
  );
}

function run(options) {
  if (!options.changeRoot) fail("--change-root is required");
  const changeRoot = fs.realpathSync(path.resolve(options.changeRoot));
  if (!fs.statSync(changeRoot).isDirectory()) fail("--change-root must be a directory");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateWebsiteCloningManifest(manifest);
  const result = inspectWebsiteCloneFoundations({ changeRoot, manifest });
  const report = {
    schema: "design-pipeline.website-clone-foundation-check.v1",
    status: result.blockers.length ? "blocked" : "ready",
    projectRoot: result.projectRoot,
    changeRoot,
    blockers: result.blockers,
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Website-clone foundations: ${report.status}`);
    for (const blocker of report.blockers) console.log(`- ${blocker}`);
  }
  process.exitCode = report.status === "ready" ? 0 : 2;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printHelp();
  else run(options);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}

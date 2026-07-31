#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { checkReconstruction } = require("./reconstruction-core.cjs");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const options = { changeRoot: process.cwd(), stage: "geometry" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--change-root") options.changeRoot = argv[++index];
    else if (arg === "--artifact") options.artifact = argv[++index];
    else if (arg === "--stage") options.stage = argv[++index];
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
    if (
      ["--change-root", "--artifact", "--stage"].includes(arg)
      && options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] === undefined
    ) {
      throw new Error(`${arg} requires a value`);
    }
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: check-reconstruction.cjs --change-root <path> [--artifact reconstruction.json] [--stage graybox|geometry|final] [--json]");
    process.exitCode = 0;
  } else {
    const result = checkReconstruction(path.resolve(options.changeRoot), options);
    console.log(options.json ? JSON.stringify(result, null, 2) : `${result.status}: ${result.stage}`);
    process.exitCode = result.status === "ready"
      ? 0
      : result.status === "fidelity-limited"
        ? 3
        : 2;
  }
} catch (error) {
  fail(error.message);
}

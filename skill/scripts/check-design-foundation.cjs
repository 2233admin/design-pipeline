#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  fail,
  pathIsInside,
  relativePath,
  resolveProjectRoot,
  validateDesignFoundationText,
} = require("./design-synthesis-core.cjs");

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = {
    projectRoot: process.cwd(),
    designFile: "DESIGN.md",
    json: false,
  };
  const fields = new Map([
    ["--project-root", "projectRoot"],
    ["--design-file", "designFile"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const direct = fields.get(arg);
    const withValue = [...fields.keys()].find((flag) => arg.startsWith(`${flag}=`));
    if (!direct && !withValue) fail(`unknown option: ${arg}`);
    const flag = direct ? arg : withValue;
    options[fields.get(flag)] = direct
      ? takeValue(argv, index, flag)
      : arg.slice(flag.length + 1);
    if (direct) index += 1;
  }
  options.projectRoot = resolveProjectRoot(options.projectRoot);
  return options;
}

function usage() {
  return "Usage: node check-design-foundation.cjs [--project-root <path>] [--design-file DESIGN.md] [--json]";
}

function resolveDesignPath(projectRoot, raw) {
  if (typeof raw !== "string" || !raw.trim() || path.isAbsolute(raw)) {
    fail("--design-file must be a project-relative path");
  }
  const candidate = path.resolve(projectRoot, raw);
  if (!pathIsInside(projectRoot, candidate)) {
    fail("--design-file must stay inside --project-root");
  }
  return candidate;
}

function synthesisRequired(projectRoot, designFile) {
  return {
    schema: "design-pipeline.foundation-check.v1",
    status: "synthesis-required",
    projectRoot,
    designFile: relativePath(projectRoot, designFile),
    nextCommand:
      "node <design-pipeline>/scripts/init-design-synthesis.cjs --change-id <change-id> --problem <problem> --project-root .",
  };
}

function checkFoundation(options) {
  const designFile = resolveDesignPath(options.projectRoot, options.designFile);
  if (!fs.existsSync(designFile)) {
    return synthesisRequired(options.projectRoot, designFile);
  }
  if (!fs.statSync(designFile).isFile()) fail("--design-file must identify a file");
  const realRoot = fs.realpathSync(options.projectRoot);
  const realFile = fs.realpathSync(designFile);
  if (!pathIsInside(realRoot, realFile)) {
    fail("--design-file resolves outside --project-root");
  }
  const validated = validateDesignFoundationText(fs.readFileSync(realFile, "utf8"));
  return {
    schema: "design-pipeline.foundation-check.v1",
    status: "ready",
    projectRoot: options.projectRoot,
    designFile: relativePath(options.projectRoot, designFile),
    name: validated.name,
    sha256: validated.sha256,
  };
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.status === "ready") {
    console.log(`DESIGN.md foundation ready: ${result.designFile}`);
    return;
  }
  console.log(`DESIGN.md foundation missing: ${result.designFile}`);
  console.log(`Next: ${result.nextCommand}`);
}

function main() {
  let options = { json: process.argv.includes("--json") };
  try {
    options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = checkFoundation(options);
    printResult(result, options.json);
    if (result.status === "synthesis-required") process.exitCode = 2;
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            schema: "design-pipeline.foundation-check.v1",
            status: "invalid",
            error: error.message,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`check-design-foundation: ${error.message}`);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  checkFoundation,
  parseArgs,
  resolveDesignPath,
};

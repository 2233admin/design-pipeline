#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const { checkDesignFoundation } = require("./design-synthesis-core.cjs");

let json = process.argv.includes("--json");

try {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: process.cwd() },
      "design-file": { type: "string", default: "DESIGN.md" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  json = values.json;

  if (values.help) {
    console.log(
      "Usage: node check-design-foundation.cjs [--project-root <path>] [--design-file DESIGN.md] [--json]",
    );
  } else {
    const result = checkDesignFoundation({
      projectRoot: values["project-root"],
      designFile: values["design-file"],
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.status === "ready") {
      console.log(`DESIGN.md foundation ready: ${result.designFile}`);
    } else {
      console.log(`DESIGN.md foundation missing: ${result.designFile}`);
      console.log(`Next: ${result.nextCommand}`);
    }
    if (result.status === "synthesis-required") process.exitCode = 2;
  }
} catch (error) {
  if (json) {
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

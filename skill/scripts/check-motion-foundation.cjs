#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const {
  checkMotionFoundation,
} = require("./motion-foundation-core.cjs");

let json = process.argv.includes("--json");

try {
  const { values } = parseArgs({
    options: {
      "project-root": { type: "string", default: process.cwd() },
      "motion-file": { type: "string", default: "MOTION.md" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  json = values.json;

  if (values.help) {
    console.log(
      "Usage: node check-motion-foundation.cjs [--project-root <path>] [--motion-file MOTION.md] [--json]",
    );
  } else {
    const result = checkMotionFoundation({
      projectRoot: values["project-root"],
      motionFile: values["motion-file"],
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.status === "ready") {
      console.log(`MOTION.md foundation ready: ${result.motionFile}`);
    } else {
      console.log(`MOTION.md foundation missing: ${result.motionFile}`);
      console.log(`Next: ${result.nextAction}`);
    }
    if (result.status === "synthesis-required") process.exitCode = 2;
  }
} catch (error) {
  if (json) {
    console.log(
      JSON.stringify(
        {
          schema: "design-pipeline.motion-foundation-check.v1",
          status: "invalid",
          error: error.message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`check-motion-foundation: ${error.message}`);
  }
  process.exitCode = 1;
}

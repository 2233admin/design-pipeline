#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { checkReferenceEvidence } = require("./reference-evidence-core.cjs");

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--change-root");
const artifactIndex = args.indexOf("--artifact");
const root = rootIndex >= 0 ? args[rootIndex + 1] : process.cwd();
const artifact = artifactIndex >= 0 ? args[artifactIndex + 1] : undefined;

try {
  const result = checkReferenceEvidence(path.resolve(root), { artifact });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === "ready" ? 0 : 2;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

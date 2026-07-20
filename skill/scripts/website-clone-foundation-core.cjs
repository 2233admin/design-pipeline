"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateDesignFoundationText } = require("./design-synthesis-core.cjs");
const { checkMotionFoundation } = require("./motion-foundation-core.cjs");
const { inspectPaletteFoundation } = require("./palette-foundation-core.cjs");

function fail(message) {
  throw new Error(message);
}

function deriveProjectRoot(changeRoot, manifest) {
  const realChangeRoot = fs.realpathSync(path.resolve(changeRoot));
  const parts = manifest.artifactRoot.split(/[\\/]/);
  const projectRoot = path.resolve(realChangeRoot, ...parts.map(() => ".."));
  const expectedChangeRoot = path.resolve(projectRoot, ...parts);
  if (
    !fs.existsSync(projectRoot) ||
    !fs.statSync(projectRoot).isDirectory() ||
    !fs.existsSync(expectedChangeRoot) ||
    fs.realpathSync(expectedChangeRoot) !== realChangeRoot ||
    path.basename(realChangeRoot) !== manifest.changeId
  ) {
    fail("website-cloning artifactRoot does not resolve back to change-root");
  }
  return fs.realpathSync(projectRoot);
}

function inspectDesignFoundation(projectRoot) {
  const designFile = path.join(projectRoot, "DESIGN.md");
  if (!fs.existsSync(designFile)) {
    return ["project DESIGN.md is missing"];
  }
  if (!fs.statSync(designFile).isFile()) {
    return ["project DESIGN.md is not a file"];
  }
  try {
    validateDesignFoundationText(fs.readFileSync(designFile, "utf8"));
    return [];
  } catch (error) {
    return [`project DESIGN.md is invalid: ${error.message}`];
  }
}

function inspectMotionFoundation(projectRoot) {
  try {
    const report = checkMotionFoundation({ projectRoot });
    if (report.status !== "ready") {
      return ["project MOTION.md is missing or requires synthesis"];
    }
    return [];
  } catch (error) {
    return [`project MOTION.md is invalid: ${error.message}`];
  }
}

function inspectWebsiteCloneFoundations({ changeRoot, manifest }) {
  const projectRoot = deriveProjectRoot(changeRoot, manifest);
  return {
    projectRoot,
    blockers: [
      ...inspectDesignFoundation(projectRoot),
      ...inspectMotionFoundation(projectRoot),
      ...inspectPaletteFoundation({
        changeRoot,
        targets: manifest.targets,
      }),
    ],
  };
}

module.exports = {
  deriveProjectRoot,
  inspectWebsiteCloneFoundations,
};

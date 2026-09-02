#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function readReleaseContract(repoRoot) {
  const declaredVersion = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const changelog = fs.readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  const releaseHeadingPattern = /^## \[([^\]\r\n]+)\](?:[ \t].*)?\r?$/gm;
  const changelogEntries = [];
  let match;
  while ((match = releaseHeadingPattern.exec(changelog)) !== null) {
    changelogEntries.push(match[1]);
  }
  return {
    declaredVersion,
    changelogEntries,
    changelogEntryCount: changelogEntries.length,
  };
}

function validateReleaseContract(repoRoot, { version, tag } = {}) {
  const errors = [];
  let declaredVersion = "";
  let changelogEntries = [];

  try {
    const contract = readReleaseContract(repoRoot);
    declaredVersion = contract.declaredVersion;
    changelogEntries = contract.changelogEntries;
  } catch (error) {
    errors.push(`unable to read release contract: ${error.message}`);
  }

  const requestedVersion = version === undefined || version === null ? "" : String(version);
  if (!requestedVersion) {
    errors.push("release version is required");
  } else if (!semverPattern.test(requestedVersion)) {
    errors.push(`release version must be valid SemVer: ${requestedVersion}`);
  }

  if (!declaredVersion) {
    errors.push("VERSION must contain a release version");
  } else if (!semverPattern.test(declaredVersion)) {
    errors.push(`VERSION must be valid SemVer: ${declaredVersion}`);
  }

  if (requestedVersion && declaredVersion && requestedVersion !== declaredVersion) {
    errors.push(`release version does not match VERSION: ${requestedVersion} !== ${declaredVersion}`);
  }

  const changelogEntryCount = declaredVersion
    ? changelogEntries.filter((entry) => entry === requestedVersion).length
    : 0;
  if (requestedVersion && changelogEntryCount !== 1) {
    errors.push(
      `CHANGELOG.md must contain exactly one ## [${requestedVersion}] entry; found ${changelogEntryCount}`,
    );
  }

  const suppliedTag = tag === undefined || tag === null ? null : String(tag);
  if (suppliedTag !== null) {
    const expectedTag = declaredVersion ? `v${declaredVersion}` : "";
    if (!expectedTag || suppliedTag !== expectedTag) {
      errors.push(`tag must equal v${declaredVersion}: ${suppliedTag}`);
    }
  }

  return {
    ok: errors.length === 0,
    version: requestedVersion,
    declaredVersion,
    tag: suppliedTag,
    changelogEntryCount,
    errors,
  };
}

function formatReleaseContractResult(result) {
  if (result.ok) {
    return `OK release contract: v${result.version}`;
  }
  return `FAIL release contract: ${result.errors.join("; ")}`;
}

function parseArgs(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--version" || token === "--tag") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      options[token.slice(2)] = value;
      index += 1;
    } else if (token === "--json") {
      options.json = true;
    } else if (token === "--help" || token === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown option: ${token}`);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/release-contract.cjs --version <version> [--tag <tag>] [--json]");
    return;
  }
  const result = validateReleaseContract(path.resolve(__dirname, ".."), options);
  console.log(options.json ? JSON.stringify(result) : formatReleaseContractResult(result));
  if (!result.ok) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`FAIL release contract: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  readReleaseContract,
  validateReleaseContract,
  formatReleaseContractResult,
};

#!/usr/bin/env node
"use strict";

// Maintenance code for the animate-ui records of skill/references/component-source-catalog.json;
// nothing under skill/ runs it.
//
//   node scripts/refresh-animate-ui-fixture.cjs --checkout <clone of imskyleen/animate-ui>
//     Rewrites tests/fixtures/animate-ui/upstream-inventory.json: the primitives, registry items,
//     package manifests and skill files upstream has at the revision sources.lock.json records for
//     `animate-ui`. tests/animate-ui-source.test.cjs holds the catalog inventory against it, so a
//     primitive upstream added, renamed or removed fails there until the catalog follows.
//   node scripts/refresh-animate-ui-fixture.cjs --checkout <clone> --check
//     Exits 1 when the fixture differs from what that revision holds.
//
// Only names, counts and package metadata are read. No upstream component source is copied: the
// upstream licence (MIT with the Commons Clause) forbids redistributing the components.

const fs = require("node:fs");
const path = require("node:path");
const { git, readLock } = require("./sources-lock.cjs");

const repoRoot = path.resolve(__dirname, "..");
const LOCK_ID = "animate-ui";
const FIXTURE = "tests/fixtures/animate-ui/upstream-inventory.json";
const FIXTURE_SCHEMA = "design-pipeline.animate-ui-fixture.v1";
const PRIMITIVES = "packages/react/src/primitives";
const REGISTRY = "apps/v2/registry";
const SKILL = "skills/animate-ui";
// Base libraries whose primitives upstream re-exports with motion inside.
const DROP_IN_LIBRARIES = ["radix-ui", "base-ui", "react-aria"];
// Folders that group Animate UI's own primitives one level down.
const GROUPS = ["effects", "texts", "buttons"];

function fail(message) {
  throw new Error(message);
}

function directories(checkout, revision, folder) {
  const out = git(checkout, ["ls-tree", "-d", "--name-only", `${revision}:${folder}`], { allowFailure: true });
  if (out === null) fail(`${folder} does not exist at ${revision}`);
  // A leading underscore marks a module shared between primitives, not a primitive.
  return out.split(/\r?\n/).filter((name) => name && !name.startsWith("_")).sort();
}

function files(checkout, revision, folder) {
  const out = git(checkout, ["ls-tree", "-r", "--name-only", `${revision}:${folder}`], { allowFailure: true });
  if (out === null) fail(`${folder} does not exist at ${revision}`);
  return out.split(/\r?\n/).filter(Boolean).sort();
}

function manifest(checkout, revision, file) {
  const text = git(checkout, ["show", `${revision}:${file}`], { allowFailure: true });
  if (text === null) fail(`${file} does not exist at ${revision}`);
  const data = JSON.parse(text);
  const optional = Object.entries(data.peerDependenciesMeta || {}).filter(([, meta]) => meta?.optional).map(([name]) => name).sort();
  return {
    name: data.name,
    version: data.version,
    ...(data.peerDependencies ? { peerDependencies: data.peerDependencies } : {}),
    ...(optional.length ? { optionalPeers: optional } : {}),
    ...(data.bin ? { bin: Object.keys(data.bin).sort() } : {}),
  };
}

function build(checkout) {
  const locked = readLock(repoRoot).sources.find((entry) => entry.id === LOCK_ID);
  if (!locked) fail(`sources.lock.json has no ${LOCK_ID} entry`);
  const { revision } = locked;
  if (git(checkout, ["cat-file", "-t", revision], { allowFailure: true }) !== "commit") fail(`${checkout} does not contain the locked revision ${revision}`);
  const top = directories(checkout, revision, PRIMITIVES);
  const own = [];
  for (const name of top) {
    if (DROP_IN_LIBRARIES.includes(name)) continue;
    if (GROUPS.includes(name)) own.push(...directories(checkout, revision, `${PRIMITIVES}/${name}`).map((child) => `${name}/${child}`));
    else own.push(name);
  }
  for (const library of DROP_IN_LIBRARIES) if (!top.includes(library)) fail(`${PRIMITIVES}/${library} is gone at ${revision}`);
  return {
    schema: FIXTURE_SCHEMA,
    source: { id: LOCK_ID, repository: locked.repo, revision },
    packages: {
      react: manifest(checkout, revision, "packages/react/package.json"),
      vue: manifest(checkout, revision, "packages/vue/package.json"),
      cli: { ...manifest(checkout, revision, "packages/cli/package.json"), commands: files(checkout, revision, "packages/cli/src/commands").map((file) => file.replace(/\.ts$/, "")) },
    },
    primitives: {
      dropIn: Object.fromEntries(DROP_IN_LIBRARIES.map((library) => [library, directories(checkout, revision, `${PRIMITIVES}/${library}`)])),
      own: own.sort(),
    },
    registry: {
      backgrounds: directories(checkout, revision, `${REGISTRY}/backgrounds`),
      buttons: directories(checkout, revision, `${REGISTRY}/buttons`),
      components: directories(checkout, revision, `${REGISTRY}/components`),
      // Icon sets are recorded as counts: the catalog lists each set once, not every icon.
      icons: { lucide: directories(checkout, revision, `${REGISTRY}/icons`).length, hugeicons: directories(checkout, revision, `${REGISTRY}/hugeicons`).length },
    },
    skill: { path: SKILL, files: files(checkout, revision, SKILL) },
  };
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--checkout");
  const checkout = at >= 0 ? args[at + 1] : null;
  if (!checkout || !fs.existsSync(checkout)) fail("usage: refresh-animate-ui-fixture.cjs --checkout <clone of imskyleen/animate-ui> [--check]");
  const text = `${JSON.stringify(build(path.resolve(checkout)), null, 2)}\n`;
  const target = path.join(repoRoot, FIXTURE);
  if (args.includes("--check")) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (current !== text) {
      process.stderr.write(`${FIXTURE} differs from the locked upstream revision; run without --check\n`);
      process.exit(1);
    }
    process.stdout.write(`${FIXTURE} matches the locked upstream revision\n`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  process.stdout.write(`wrote ${FIXTURE}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { FIXTURE, FIXTURE_SCHEMA, LOCK_ID, build };

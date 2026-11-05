#!/usr/bin/env node
"use strict";

// Regenerates skill/references/mengto-skills-catalog.json, the maintained discovery projection of the
// MengTo bundle manifest: source, revision, license, count and the skill names per category come from
// the manifest; the capability routes are maintained here and kept. A route that names a skill the
// manifest no longer has fails, so an upstream rename cannot silently drop a route. Run by
// scripts/sources-update.cjs after the MengTo import (lock entry `derive`).

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const manifestFile = path.join(root, "skill/vendor/mengto-skills/manifest.json");
const catalogFile = path.join(root, "skill/references/mengto-skills-catalog.json");

function project(manifest, previous) {
  const categories = {};
  for (const skill of manifest.skills) (categories[skill.category] ||= []).push(skill.name);
  const names = new Set(manifest.skills.map((skill) => skill.name));
  const lost = Object.entries(previous.routes || {}).flatMap(([capability, skills]) => skills.filter((skill) => !names.has(skill)).map((skill) => `${capability} -> ${skill}`));
  if (lost.length) throw new Error(`MengTo routes name skills the manifest no longer has: ${lost.join(", ")}`);
  return {
    schema: "design-pipeline.skill-catalog.v1",
    source: manifest.source.repository,
    revision: manifest.source.revision,
    license: manifest.source.license,
    count: manifest.skills.length,
    categories,
    routes: previous.routes,
  };
}

// The file keeps each string array on one line.
function format(value) {
  return `${JSON.stringify(value, null, 2).replace(/\[\n\s+("[^\n]*"(?:,\n\s+"[^\n]*")*)\n\s+\]/g, (match, items) => `[${items.split(/,\n\s+/).join(", ")}]`)}\n`;
}

if (require.main === module) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    const previous = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
    fs.writeFileSync(catalogFile, format(project(manifest, previous)));
    process.stdout.write(`${JSON.stringify({ status: "projected", revision: manifest.source.revision, count: manifest.skills.length })}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { format, project };

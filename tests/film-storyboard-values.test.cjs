"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { BEAT_ROLES, CUE_KINDS, GRAMMARS, HANDOFFS, TRANSFORMATIONS } = require("../skill/scripts/film-core.cjs");

const guide = fs.readFileSync(path.join(__dirname, "..", "skill", "references", "workflow-film.md"), "utf8");
const allowed = guide.slice(guide.indexOf("- Allowed values"), guide.indexOf("- Carry:"));

test("the film workflow guide lists every storyboard enum value the gate accepts", () => {
  assert.ok(allowed.length > 0, "workflow-film.md has an Allowed values bullet before the Carry bullet");
  const sets = { grammar: GRAMMARS, role: BEAT_ROLES, transformation: TRANSFORMATIONS, handoff: HANDOFFS, cue: CUE_KINDS };
  for (const [name, values] of Object.entries(sets)) {
    for (const value of values) assert.ok(allowed.includes(`\`${value}\``), `${name} value ${value} is missing from the guide`);
  }
});

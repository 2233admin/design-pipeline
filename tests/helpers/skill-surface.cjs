"use strict";

// The authoring surface an agent reaches from the front door: skill/SKILL.md plus every
// skill-relative reference it routes to (one level). Since 0.12.0-beta the front door is small and
// routes to references, so guidance must be reachable from it rather than inlined in it.

const fs = require("node:fs");
const path = require("node:path");

const skillRoot = path.join(__dirname, "../../skill");

function readSkillSurface() {
  const front = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const routed = [...new Set([...front.matchAll(/`(references\/[^`\s]+?\.md)`/g)].map((match) => match[1]))];
  const parts = [front];
  for (const rel of routed) {
    const file = path.join(skillRoot, rel);
    if (fs.existsSync(file)) parts.push(fs.readFileSync(file, "utf8"));
  }
  return parts.join("\n\n");
}

module.exports = { readSkillSurface, skillRoot };

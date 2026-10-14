"use strict";

// Bundled upstream trees keep their bytes, but a file named SKILL.md is stored as
// UPSTREAM-SKILL.md so the packaged skill holds exactly one SKILL.md (claude.ai and the Skills API
// reject more; Claude Code would load each as another skill). Manifests keep upstream paths, Git
// blob ids and tree hashes; these two functions convert at the filesystem boundary. Node built-ins
// only: repository import scripts require this file too.

const UPSTREAM_NAME = "SKILL.md";
const STORED_NAME = "UPSTREAM-SKILL.md";

function split(relative) {
  const parts = String(relative).split(/[\\/]/);
  const separator = String(relative).includes("\\") && !String(relative).includes("/") ? "\\" : "/";
  return { parts, separator };
}

// Upstream path -> the path the file is stored under. Fails on an upstream file that already uses
// the stored name, because the mapping would no longer be reversible.
function storedPath(upstream) {
  const { parts, separator } = split(upstream);
  const last = parts.at(-1);
  if (last === STORED_NAME) throw Object.assign(new Error(`upstream file ${upstream} already uses the reserved name ${STORED_NAME}`), { code: "UPSTREAM_NAME_RESERVED" });
  if (last === UPSTREAM_NAME) parts[parts.length - 1] = STORED_NAME;
  return parts.join(separator);
}

// Stored path -> upstream path. A stored SKILL.md escaped the rename and is refused.
function upstreamPath(stored) {
  const { parts, separator } = split(stored);
  const last = parts.at(-1);
  if (last === UPSTREAM_NAME) throw Object.assign(new Error(`bundled file ${stored} must be stored as ${STORED_NAME}`), { code: "UPSTREAM_NAME_UNMAPPED" });
  if (last === STORED_NAME) parts[parts.length - 1] = UPSTREAM_NAME;
  return parts.join(separator);
}

// A directory walk of a stored snapshot -> upstream paths, plus any stored SKILL.md that escaped the
// rename (reported by the caller as a verification issue instead of thrown).
function upstreamFiles(storedFiles) {
  const files = [];
  const stray = [];
  for (const file of storedFiles) {
    try { files.push(upstreamPath(file)); }
    catch (error) {
      if (error.code !== "UPSTREAM_NAME_UNMAPPED") throw error;
      stray.push(file);
    }
  }
  return { files, stray, issues: stray.map((file) => `${file} must be stored as ${STORED_NAME}`) };
}

module.exports = { STORED_NAME, storedPath, upstreamFiles, upstreamPath };

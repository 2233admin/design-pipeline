"use strict";

// QA rule: the former reference project's romanized name stays out of tracked paths and contents,
// binaries included, except where the vendored upstream bundle must keep its original bytes:
// inside its own skill/vendor folder, in THIRD_PARTY_NOTICES.md (attribution) and in the importer
// that names the upstream repository. Every other tracked path and file still fails. The folder
// name is assembled from parts so that neither pattern can match this source text.

const { spawnSync } = require("node:child_process");

const upstream = ["hua", "shu"].join("");
const pathPattern = new RegExp(`${upstream.slice(0, 3)}[\\s_.-]*${upstream.slice(3)}`, "i");
const contentPattern = `${upstream.slice(0, 3)}[[:space:]_.-]*${upstream.slice(3)}`;
const allowedFolder = `skill/vendor/${upstream}-design/`;
const allowedFiles = new Set(["THIRD_PARTY_NOTICES.md", "scripts/import-design-direction-library.cjs"]);

const isAllowed = (file) => file.startsWith(allowedFolder) || allowedFiles.has(file);

// Returns { ok, hits, error }; `hits` are tracked paths or contents outside the allowed places.
function formerNameHits(cwd) {
  const git = (args) => spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  const listed = git(["ls-files", "-z"]);
  const grepped = git(["grep", "-l", "-z", "-i", "-E", contentPattern]);
  if (listed.status !== 0 || ![0, 1].includes(grepped.status)) {
    return { ok: false, hits: [], error: (listed.stderr || grepped.stderr || "git failed").trim() };
  }
  const paths = (listed.stdout || "").split("\0").filter((file) => pathPattern.test(file));
  const contents = grepped.status === 0 ? (grepped.stdout || "").split("\0").filter(Boolean) : [];
  const hits = [...new Set([...paths, ...contents])].filter((file) => !isAllowed(file)).sort();
  return { ok: hits.length === 0, hits };
}

module.exports = { allowedFiles, allowedFolder, formerNameHits, isAllowed };

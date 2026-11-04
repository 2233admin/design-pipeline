#!/usr/bin/env node
"use strict";

// npm run sources:check [-- --upstream]
//
// Offline (default): the lock agrees with every derived pin, and the source tests verify each
// vendored snapshot byte for byte (size, Git blob id, SHA-256, tree hash) against its manifest and
// the lock. --upstream additionally asks every upstream for its latest revision or release and
// lists what is behind as warnings; it never fails on that, and it never fails offline use.

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { VERSIONED, checkAgreement, readLock, releaseTag, repoKey, repoRoot } = require("./sources-lock.cjs");

const SOURCE_TESTS = [
  "sources-lock.test.cjs",
  "deepclonewebsite-reference.test.cjs",
  "design-md-source.test.cjs",
  "good-css.test.cjs",
  "holosticker.test.cjs",
  "iart-motion-skills.test.cjs",
  "interface-discipline.test.cjs",
  "mengto-skills.test.cjs",
  "prism-system.test.cjs",
  "shadcnio-react-components.test.cjs",
  "visual-craft.test.cjs",
  "taste-skill.test.cjs",
  "film-sources.test.cjs",
  "gepa-source.test.cjs",
  "ui-craft-sources.test.cjs",
  "design-direction-library.test.cjs",
  "answer-me-with-html-sources.test.cjs",
];

// One row per repository or package: where the lock is and where upstream is now.
function upstreamStatus(lock, resolve) {
  const rows = [];
  const seen = new Set();
  for (const entry of lock.sources) {
    const key = repoKey(entry.repo) || `${entry.kind}:${entry.package}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ids = lock.sources.filter((item) => (repoKey(item.repo) || `${item.kind}:${item.package}`) === key).map((item) => item.id);
    try {
      if (VERSIONED.has(entry.kind)) {
        const latest = resolve.version(entry);
        const revision = entry.repo ? resolve.head(entry.repo, `refs/tags/${releaseTag(entry.tag, latest)}`) : null;
        rows.push({ ids, at: entry.version, latest, behind: latest !== entry.version || (revision !== null && revision !== entry.revision), held: entry.held || null });
      } else {
        const latest = resolve.head(entry.repo, "HEAD");
        rows.push({ ids, at: entry.revision, latest, behind: latest !== entry.revision, held: lock.sources.find((item) => ids.includes(item.id) && item.held)?.held || null });
      }
    } catch (error) {
      rows.push({ ids, at: entry.version || entry.revision, latest: null, behind: null, error: error.message });
    }
  }
  return rows;
}

function main(argv) {
  const upstream = argv.includes("--upstream");
  const unknown = argv.filter((item) => item !== "--upstream");
  if (unknown.length) {
    process.stderr.write(`FAIL unknown option: ${unknown.join(" ")}\n`);
    return 1;
  }
  const root = repoRoot();
  const issues = checkAgreement(root, readLock(root));
  for (const issue of issues) process.stderr.write(`FAIL lock: ${issue}\n`);
  const tests = spawnSync(process.execPath, ["--test", ...SOURCE_TESTS.map((file) => path.join(root, "tests", file))], { cwd: root, stdio: "inherit", windowsHide: true });
  const status = issues.length || tests.status !== 0 ? 1 : 0;
  if (upstream) {
    const { latestRelease, lsRemote } = require("./sources-update.cjs");
    const rows = upstreamStatus(readLock(root), { head: lsRemote, version: latestRelease });
    for (const row of rows) {
      if (row.error) process.stderr.write(`WARN ${row.ids.join(", ")}: could not reach upstream (${row.error})\n`);
      else if (row.behind && row.held) process.stderr.write(`WARN ${row.ids.join(", ")}: held at ${row.at.slice(0, 12)}, upstream ${row.latest.slice(0, 12)} (${row.held.issue})\n`);
      else if (row.behind) process.stderr.write(`WARN ${row.ids.join(", ")}: behind, ${row.at.slice(0, 12)} -> ${row.latest.slice(0, 12)}; run npm run sources:update -- --only ${row.ids[0]}\n`);
    }
    const behind = rows.filter((row) => row.behind).length;
    process.stdout.write(`${JSON.stringify({ upstream: rows.length, behind, held: rows.filter((row) => row.behind && row.held).length, unreachable: rows.filter((row) => row.error).length })}\n`);
  }
  return status;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { SOURCE_TESTS, upstreamStatus };

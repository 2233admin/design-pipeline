#!/usr/bin/env node
"use strict";

// Kernel for `sources fetch`: downloads are async, so they run in their own process and report JSON
// on stdout to the synchronous CLI. Each fetched bundle is verified before it is reported ready.

const { BUNDLES, fetchBundle } = require("./vendor-cache.cjs");
const { verifyMengToSnapshot } = require("./mengto-skills-core.cjs");
const { verifyIartSnapshot } = require("./iart-motion-skills-core.cjs");
const { partialBundles } = require("./vendor-cache.cjs");
const { verifyDirectionLibrary } = require("./design-direction-library-core.cjs");

const VERIFY = { "mengto-skills": verifyMengToSnapshot, "iart-motion-skills": verifyIartSnapshot };
for (const { bundle } of partialBundles()) VERIFY[bundle] = verifyDirectionLibrary;

(async () => {
  const bundles = process.argv.slice(2);
  try {
    const results = [];
    for (const bundle of bundles) {
      const fetched = await fetchBundle(bundle);
      const verification = VERIFY[bundle]();
      results.push({ ...fetched, verification: { status: verification.status, issues: verification.issues } });
    }
    const ready = results.every((result) => result.verification.status === "ready");
    process.stdout.write(`${JSON.stringify({ status: ready ? "ready" : "blocked", bundles: results, available: BUNDLES })}\n`);
    process.exitCode = ready ? 0 : 2;
  } catch (error) {
    process.stderr.write(`sources fetch: ${error.message}\n`);
    process.exitCode = 1;
  }
})();

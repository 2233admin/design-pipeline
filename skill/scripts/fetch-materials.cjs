#!/usr/bin/env node
"use strict";

// Kernel for `materials sources --probe|search|fetch`: network calls are async, so they run in their
// own process and report JSON on stdout to the synchronous CLI. Exit 0 done, 2 blocked/refused/drift.

const { fetchMaterial, probeSources, searchSources } = require("./material-core.cjs");

(async () => {
  try {
    const [action, raw] = process.argv.slice(2);
    const args = JSON.parse(raw || "{}");
    let result;
    if (action === "probe") result = await probeSources({ sources: args.sources });
    else if (action === "search") result = await searchSources(args);
    else if (action === "fetch") result = await fetchMaterial(args);
    else throw new Error(`unknown action ${action}`);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = ["blocked", "refused", "drift"].includes(result.status) ? 2 : 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

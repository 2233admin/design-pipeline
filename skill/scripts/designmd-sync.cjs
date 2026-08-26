"use strict";

const path = require("node:path");
const { exitCodeForStatus, syncDesignMd, writeCatalog } = require("./designmd-core.cjs");

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function main() {
  const root = path.resolve(process.cwd());
  const outputRoot = path.resolve(root, option("--output-root", ".design-pipeline/designmd"));
  const relative = path.relative(root, outputRoot);
  if (!relative || path.isAbsolute(relative) || relative.startsWith(`..${path.sep}`)) {
    throw new Error("--output-root must be a child of the project root");
  }
  const catalog = await syncDesignMd({
    source: option("--url"),
    maxPages: Number(option("--limit", 500)),
    concurrency: 8,
    now: new Date().toISOString(),
  });
  const result = writeCatalog(catalog, outputRoot);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodeForStatus(result.status);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

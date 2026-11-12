"use strict";

// 子进程里跑一次两步提交，并在第 N 次 fs.renameSync 之前 process.exit(9)，
// 模拟真实崩溃：finally/catch 都不会执行，残留文件留在磁盘上。
const fs = require("node:fs");
const path = require("node:path");

const spec = JSON.parse(process.argv[2]);
const core = (name) => require(path.resolve(__dirname, "../../skill/scripts", name));
const realRename = fs.renameSync;
let calls = 0;
fs.renameSync = (...args) => {
  calls += 1;
  if (calls === spec.crashBeforeRename) process.exit(9);
  return realRename(...args);
};

async function main() {
  if (spec.scenario === "pipeline-advance") {
    const { advanceChange } = core("pipeline-state-core.cjs");
    advanceChange(spec.stateFile, spec.eventsFile, spec.input);
  } else if (spec.scenario === "designmd-write") {
    const { syncDesignMd, writeCatalog } = core("designmd-core.cjs");
    const source = "https://designmd.test";
    const pages = new Map([
      [source, '<a href="/skills/install">S</a>'],
      [`${source}/skills/install`, '<a href="/skills/a11y-audit">A</a>'],
      [`${source}/skills/a11y-audit`, `<title>${spec.title}</title><meta name="description" content="Audit">MIT`],
    ]);
    const catalog = await syncDesignMd({ source, fetcher: async (url) => pages.get(url) || "", maxPages: 20 });
    writeCatalog(catalog, spec.outputRoot);
  } else {
    throw new Error(`unknown scenario ${spec.scenario}`);
  }
}
main().then(() => process.exit(0), (error) => { console.error(error.message); process.exit(1); });

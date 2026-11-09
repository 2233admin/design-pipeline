"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { advanceChange, createInitialState, inspectConsistency, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { syncDesignMd, writeCatalog, readPersistedCatalog } = require("../skill/scripts/designmd-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");

const CHILD = path.resolve(__dirname, "helpers/crash-child.cjs");

function crash(spec) {
  const result = spawnSync(process.execPath, [CHILD, JSON.stringify(spec)], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 9, `child should crash at rename ${spec.crashBeforeRename}: ${result.stderr}`);
}

function newChange() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "state-recovery-"));
  const stateFile = path.join(root, "state.json");
  const eventsFile = path.join(root, "events.jsonl");
  const state = createInitialState({ changeId: "crash-change", timestamp: "2026-07-23T00:00:00.000Z", objective: "crash recovery" });
  writeNewChange(stateFile, eventsFile, state, { timestamp: "2026-07-23T00:00:00.000Z" });
  return { root, stateFile, eventsFile };
}

const advanceInput = (change) => ({ expectedSha256: sha256(fs.readFileSync(change.stateFile)), timestamp: "2026-07-23T00:01:00.000Z", phase: "brief", summary: "advance after crash" });

// rename 序号：1 state→backup，2 events→backup，3 events tmp→events，4 state tmp→state。
for (const crashBeforeRename of [2, 3, 4]) {
  test(`pipeline state recovers from a crash before rename ${crashBeforeRename} of the two-file commit`, () => {
    const change = newChange();
    try {
      const input = advanceInput(change);
      const originalState = fs.readFileSync(change.stateFile);
      const originalEvents = fs.readFileSync(change.eventsFile);
      crash({ scenario: "pipeline-advance", stateFile: change.stateFile, eventsFile: change.eventsFile, input, crashBeforeRename });
      // 崩溃留下了残留，并且（对 3、4）至少一个主文件缺失。
      const residue = fs.readdirSync(change.root).filter((name) => /\.(tmp|backup)-/.test(name));
      assert.ok(residue.length > 0, "crash must leave transaction residue");
      assert.ok(fs.existsSync(`${change.stateFile}.lock`), "crashed writer leaves its lock");
      // 下一次写入自动回收死锁、回滚残留，然后成功。
      const result = advanceChange(change.stateFile, change.eventsFile, input);
      assert.equal(result.state.revision, 1);
      assert.equal(inspectConsistency(JSON.parse(fs.readFileSync(change.stateFile, "utf8")), fs.readFileSync(change.eventsFile, "utf8")).status, "consistent");
      assert.deepEqual(fs.readdirSync(change.root).filter((name) => /\.(tmp|backup)-|\.lock$/.test(name)), []);
      assert.notDeepEqual(fs.readFileSync(change.stateFile), originalState);
      assert.notDeepEqual(fs.readFileSync(change.eventsFile), originalEvents);
    } finally {
      fs.rmSync(change.root, { recursive: true, force: true });
    }
  });
}

test("a live writer's lock is never reclaimed", () => {
  const change = newChange();
  try {
    fs.writeFileSync(`${change.stateFile}.lock`, `${JSON.stringify({ pid: process.pid })}\n`);
    assert.throws(() => advanceChange(change.stateFile, change.eventsFile, advanceInput(change)), /writer lock exists/);
  } finally {
    fs.rmSync(change.root, { recursive: true, force: true });
  }
});

async function sampleCatalog(title) {
  const source = "https://designmd.test";
  const pages = new Map([
    [source, '<a href="/skills/install">S</a>'],
    [`${source}/skills/install`, '<a href="/skills/a11y-audit">A</a>'],
    [`${source}/skills/a11y-audit`, `<title>${title}</title><meta name="description" content="Audit">MIT`],
  ]);
  return syncDesignMd({ source, fetcher: async (url) => pages.get(url) || "", maxPages: 20 });
}

for (const crashBeforeRename of [2]) {
  test("designmd snapshot survives a crash between backing up the old directory and installing the new one", async () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "designmd-crash-"));
    const outputRoot = path.join(parent, "catalog");
    try {
      const first = writeCatalog(await sampleCatalog("First title"), outputRoot);
      crash({ scenario: "designmd-write", outputRoot, title: "Second title", crashBeforeRename });
      assert.equal(fs.existsSync(outputRoot), false, "crash window: target directory is gone");
      assert.ok(fs.readdirSync(parent).some((name) => name.startsWith("catalog.backup-")));
      // 下次发布先还原备份，再发布新快照；旧快照不丢，残留清零。
      const second = writeCatalog(await sampleCatalog("Third title"), outputRoot);
      assert.equal(second.previousSnapshotHash, first.snapshotHash);
      assert.ok(readPersistedCatalog(second.catalogPath).entries.length >= 1);
      assert.deepEqual(fs.readdirSync(parent), ["catalog"]);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });
}
